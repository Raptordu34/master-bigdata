/* sql-algebra.js — Arbre algébrique relationnel pour requêtes SQL */
(function () {
    'use strict';

    // ── Escape HTML ──────────────────────────────────────────────────────
    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ── Troncature d'étiquettes longues ──────────────────────────────────
    function trunc(s, max) {
        s = String(s).trim();
        return s.length > max ? s.slice(0, max) + '…' : s;
    }

    // ── Split au niveau 0 des parenthèses ───────────────────────────────
    function splitTopLevel(str, sep) {
        var parts = [];
        var depth = 0;
        var cur   = '';
        for (var i = 0; i < str.length; i++) {
            var c = str[i];
            if      (c === '(') depth++;
            else if (c === ')') depth--;
            if (c === sep && depth === 0) {
                parts.push(cur);
                cur = '';
            } else {
                cur += c;
            }
        }
        if (cur) parts.push(cur);
        return parts;
    }

    // ── Protection des parenthèses (tokenisation) ───────────────────────
    function protectParens(sql) {
        var tokens = [];
        var flat   = '';
        var depth  = 0;
        var buf    = '';
        for (var i = 0; i < sql.length; i++) {
            var c = sql[i];
            if (c === '(') {
                if (depth === 0) { flat += buf; buf = ''; }
                depth++;
                buf += c;
            } else if (c === ')') {
                depth--;
                buf += c;
                if (depth === 0) {
                    var tok = '__P' + tokens.length + '__';
                    tokens.push(buf);
                    flat += tok;
                    buf = '';
                }
            } else {
                if (depth > 0) buf += c;
                else           flat += c;
            }
        }
        flat += buf;
        return { flat: flat, tokens: tokens };
    }

    function restoreTokens(s, tokens) {
        return s.replace(/__P(\d+)__/g, function (_, idx) {
            return tokens[parseInt(idx, 10)];
        });
    }

    // ── Parser SQL → map de clauses ──────────────────────────────────────
    function parseSQL(sql) {
        var trimmed = sql.trim().replace(/\s+/g, ' ');

        // Détecter les SET OPS au niveau 0
        var prot   = protectParens(trimmed);
        var flat   = prot.flat;
        var tokens = prot.tokens;

        var setOpRe = /\s+(UNION\s+ALL|UNION|INTERSECT|EXCEPT)\s+/i;
        var soMatch = flat.match(setOpRe);
        if (soMatch) {
            var soIdx    = flat.indexOf(soMatch[0]);
            var leftSQL  = restoreTokens(flat.slice(0, soIdx).trim(), tokens);
            var rightSQL = restoreTokens(flat.slice(soIdx + soMatch[0].length).trim(), tokens);
            return {
                setOp:    soMatch[1].trim().toUpperCase().replace(/\s+/g, ' '),
                leftSQL:  leftSQL,
                rightSQL: rightSQL
            };
        }

        // Découper sur les mots-clés de clause
        var clauseRe = /\b(SELECT|FROM|WHERE|INNER\s+JOIN|LEFT\s+OUTER\s+JOIN|LEFT\s+JOIN|RIGHT\s+OUTER\s+JOIN|RIGHT\s+JOIN|FULL\s+OUTER\s+JOIN|CROSS\s+JOIN|JOIN|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/gi;

        var parts   = [];
        var lastKey = null;
        var lastIdx = 0;
        var m;
        var re = new RegExp(clauseRe.source, 'gi');
        while ((m = re.exec(flat)) !== null) {
            if (lastKey !== null) {
                parts.push({ key: lastKey, val: flat.slice(lastIdx, m.index).trim() });
            }
            lastKey = m[0].trim().toUpperCase().replace(/\s+/g, ' ');
            lastIdx = m.index + m[0].length;
        }
        if (lastKey !== null) {
            parts.push({ key: lastKey, val: flat.slice(lastIdx).trim() });
        }

        var clauses = { joins: [] };
        parts.forEach(function (p) {
            var val = restoreTokens(p.val, tokens);
            var key = p.key;
            if (key === 'SELECT') {
                if (/^DISTINCT\s+/i.test(val)) {
                    clauses.distinct = true;
                    val = val.replace(/^DISTINCT\s+/i, '');
                }
                clauses.select = val;
            } else if (key === 'FROM') {
                clauses.from = val;
            } else if (key === 'WHERE') {
                clauses.where = val;
            } else if (/JOIN/.test(key)) {
                var onMatch = val.match(/^([\s\S]*?)\s+ON\s+([\s\S]*)$/i);
                if (onMatch) {
                    clauses.joins.push({ type: key, table: onMatch[1].trim(), on: onMatch[2].trim() });
                } else {
                    clauses.joins.push({ type: key, table: val, on: null });
                }
            } else if (key === 'GROUP BY') {
                clauses.groupBy = val;
            } else if (key === 'HAVING') {
                clauses.having = val;
            } else if (key === 'ORDER BY') {
                clauses.orderBy = val;
            } else if (key === 'LIMIT') {
                clauses.limit = val;
            }
        });

        // Agrégats scalaires sans GROUP BY
        if (!clauses.groupBy && clauses.select &&
            /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(clauses.select)) {
            clauses.hasScalarAggregate = true;
        }

        return clauses;
    }

    // ── Nœuds de l'arbre ────────────────────────────────────────────────
    function makeNode(op, label, subscript, children, nodeType) {
        return {
            op:       op       || '',
            label:    label    || '',
            subscript: subscript || '',
            children: children || [],
            nodeType: nodeType || 'unary'
        };
    }

    function makeLeaf(tableName) {
        var t = tableName.trim();
        if (/^\(/.test(t)) {
            return makeNode('', '(sous-requête)', '', [], 'leaf');
        }
        // Alias : "employes e" ou "employes AS e"
        var m = t.match(/^(\S+)\s+(?:AS\s+)?(\w+)$/i);
        var display = m ? m[1] + ' (' + m[2] + ')' : t;
        return makeNode('', display, '', [], 'leaf');
    }

    // ── Construction bottom-up ───────────────────────────────────────────
    function buildTreeFromSQL(sql) {
        try {
            return buildTree(parseSQL(sql.trim()));
        } catch (e) {
            return makeNode('?', trunc(sql, 30), '', [], 'leaf');
        }
    }

    function buildTree(clauses) {
        // SET OP
        if (clauses.setOp) {
            var lTree  = buildTreeFromSQL(clauses.leftSQL);
            var rTree  = buildTreeFromSQL(clauses.rightSQL);
            var opSym  = clauses.setOp === 'UNION'        ? '∪'
                       : clauses.setOp === 'UNION ALL'    ? '∪ₐₗₗ'
                       : clauses.setOp === 'INTERSECT'    ? '∩'
                       :                                    '−';
            return makeNode(opSym, clauses.setOp, '', [lTree, rTree], 'binary');
        }

        // 1. Feuilles FROM
        var fromParts = clauses.from ? splitTopLevel(clauses.from, ',') : [];
        var current;

        if (fromParts.length === 0) {
            current = makeLeaf('?');
        } else {
            var leaves = fromParts.map(function (p) {
                var t = p.trim();
                if (/^\(/.test(t)) {
                    // Sous-requête dans FROM
                    var aliasM  = t.match(/\)\s+(?:AS\s+)?(\w+)\s*$/i);
                    var innerSQL = t.replace(/^\(/, '').replace(/\)\s*(?:AS\s+)?\w*\s*$/i, '').trim();
                    var sub = buildTreeFromSQL(innerSQL);
                    if (aliasM) sub.alias = aliasM[1];
                    return sub;
                }
                return makeLeaf(t);
            });

            current = leaves[0];

            // 2. Produit cartésien pour plusieurs tables sans JOIN
            for (var i = 1; i < leaves.length; i++) {
                current = makeNode('×', 'Produit cartésien', '', [current, leaves[i]], 'binary');
            }
        }

        // 3. Jointures
        (clauses.joins || []).forEach(function (j) {
            var right;
            if (/^\(/.test(j.table)) {
                right = buildTreeFromSQL(j.table.slice(1, -1));
            } else {
                right = makeLeaf(j.table);
            }
            var sym   = /CROSS/i.test(j.type) ? '×' : '⋈';
            var label = /LEFT/i.test(j.type)         ? '⋈ gauche'
                      : /RIGHT/i.test(j.type)        ? '⋈ droite'
                      : /FULL/i.test(j.type)         ? '⋈ pleine'
                      : /CROSS/i.test(j.type)        ? '×'
                      :                                '⋈';
            var sub = j.on ? trunc(j.on, 40) : '';
            current = makeNode(sym, label, sub, [current, right], 'binary');
        });

        // 4. σ WHERE
        if (clauses.where) {
            current = makeNode('σ', 'Sélection', trunc(clauses.where, 45), [current], 'unary');
        }

        // 5. γ Agrégation
        if (clauses.groupBy || clauses.hasScalarAggregate) {
            var aggSub = clauses.groupBy ? trunc(clauses.groupBy, 35) : 'scalaire';
            current = makeNode('γ', 'Agrégation', aggSub, [current], 'unary');
        }

        // 6. σ HAVING
        if (clauses.having) {
            current = makeNode('σ', 'Filtrage HAVING', trunc(clauses.having, 45), [current], 'unary');
        }

        // 7. π Projection
        var sel = (clauses.select || '*').trim();
        current = makeNode('π', 'Projection', trunc(sel, 45), [current], 'unary');

        // 8. δ DISTINCT
        if (clauses.distinct) {
            current = makeNode('δ', 'Distinct', '', [current], 'unary');
        }

        // 9. τ Tri
        if (clauses.orderBy) {
            current = makeNode('τ', 'Tri', trunc(clauses.orderBy, 35), [current], 'unary');
        }

        // 10. ℒ LIMIT
        if (clauses.limit) {
            current = makeNode('ℒ', 'Limite', clauses.limit, [current], 'unary');
        }

        return current;
    }

    // ── Rendu HTML ───────────────────────────────────────────────────────
    var NODE_CLASSES = {
        'σ': 'alg-node--select',
        'π': 'alg-node--project',
        '⋈': 'alg-node--join',
        '×': 'alg-node--join',
        'γ': 'alg-node--aggregate',
        'τ': 'alg-node--sort',
        'δ': 'alg-node--distinct',
        'ℒ': 'alg-node--limit',
        '∪': 'alg-node--setop',
        '∪ₐₗₗ': 'alg-node--setop',
        '∩': 'alg-node--setop',
        '−': 'alg-node--setop'
    };

    function nodeClass(node) {
        if (!node.op) return 'alg-node--leaf';
        return NODE_CLASSES[node.op] || 'alg-node--leaf';
    }

    function renderNode(node) {
        var cls = nodeClass(node);
        var inner = '';
        if (node.op)        inner += '<span class="alg-op">'        + esc(node.op)        + '</span>';
        if (node.label)     inner += '<span class="alg-label">'     + esc(node.label)     + '</span>';
        if (node.subscript) inner += '<span class="alg-subscript">' + esc(node.subscript) + '</span>';

        var html = '<div class="alg-node-wrap">';
        html += '<div class="alg-node ' + cls + '">' + inner + '</div>';

        if (node.children && node.children.length > 0) {
            var childrenCls = node.children.length > 1 ? 'alg-children--binary' : 'alg-children--unary';
            html += '<div class="alg-connector"></div>';
            html += '<div class="alg-children ' + childrenCls + '">';
            node.children.forEach(function (child) {
                html += renderNode(child);
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // ── API publique ─────────────────────────────────────────────────────
    window.buildAlgebraTree = function (sqlText) {
        try {
            var clauses = parseSQL(sqlText.trim());
            var tree    = buildTree(clauses);
            return '<div class="alg-tree">' + renderNode(tree) + '</div>';
        } catch (e) {
            return '<div class="alg-tree alg-tree--error">Arbre indisponible : ' + esc(e.message) + '</div>';
        }
    };

})();
