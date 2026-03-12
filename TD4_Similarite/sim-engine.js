/* sim-engine.js — Parser SQL + Planner + Executor pour le simulateur TD4 */
'use strict';

// ══════════════════════════════════════════════════════════════
// PARSER — SQL → AST (regex-based, supporte les patterns TD4)
// ══════════════════════════════════════════════════════════════
const SimParser = {
  parse(sql) {
    try {
      return SimParser._parse(sql.trim());
    } catch (e) {
      return { error: e.message };
    }
  },

  _parse(sql) {
    // Normaliser espaces et sauts de ligne
    const s = sql.replace(/\s+/g, ' ').trim();

    // ── SELECT ──
    const selectMatch = s.match(/^SELECT\s+(.*?)\s+FROM\s+/i);
    if (!selectMatch) throw new Error('Syntaxe invalide : SELECT … FROM attendu.');
    const selectRaw = selectMatch[1].trim();
    let projection = null; // null = *
    if (/^count\s*\(\s*\*\s*\)$/i.test(selectRaw)) {
      projection = { type: 'count' };
    } else if (selectRaw !== '*') {
      const cols = selectRaw.split(',').map(c => c.trim());
      projection = { type: 'columns', cols };
    }

    // ── FROM ──
    const fromMatch = s.match(/FROM\s+([\w,\s]+?)(?:\s+WHERE\s+|$)/i);
    if (!fromMatch) throw new Error('Clause FROM manquante.');
    const tables = fromMatch[1].split(',').map(t => t.trim()).filter(Boolean);
    if (tables.length === 0) throw new Error('Au moins une table requise dans FROM.');
    if (tables.length > 3) throw new Error('Maximum 3 tables supportées dans ce simulateur.');
    const validTables = ['Student', 'Course', 'Grades'];
    for (const t of tables) {
      if (!validTables.includes(t)) throw new Error(`Table "${t}" inconnue. Tables disponibles : ${validTables.join(', ')}.`);
    }

    // ── WHERE (optionnel) ──
    const whereMatch = s.match(/WHERE\s+(.*?)$/i);
    const conditions = [];
    const joins = [];
    if (whereMatch) {
      const whereParts = whereMatch[1].split(/\s+AND\s+/i);
      for (const part of whereParts) {
        const p = part.trim();
        // Jointure : T1.col = T2.col
        const joinMatch = p.match(/^(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)$/);
        if (joinMatch) {
          joins.push({ left: { table: joinMatch[1], col: joinMatch[2] }, right: { table: joinMatch[3], col: joinMatch[4] } });
          continue;
        }
        // Condition simple : col = 'val'
        const condMatch = p.match(/^(\w+)\s*=\s*'([^']+)'$/);
        if (condMatch) {
          conditions.push({ col: condMatch[1], val: condMatch[2] });
          continue;
        }
        throw new Error(`Condition non supportée : "${p}". Format attendu : Col = 'valeur' ou T1.Col = T2.Col.`);
      }
    }

    return { type: 'select', tables, projection, conditions, joins };
  },
};

// ══════════════════════════════════════════════════════════════
// PLANNER — AST → Arbre algèbre relationnelle
// ══════════════════════════════════════════════════════════════
const SimPlanner = {
  _nextId: 0,
  _node(op, label, children, card, formalDef) {
    return { op, label, children: children || [], estimatedCard: card, formalDef, nodeId: 'n' + (++SimPlanner._nextId) };
  },

  plan(ast) {
    SimPlanner._nextId = 0;
    if (ast.error) return { error: ast.error };
    return {
      naive: SimPlanner._buildNaive(ast),
      optimized: SimPlanner._buildOptimized(ast),
    };
  },

  // Arbre naïf : ordre littéral du FROM, filtres en haut
  _buildNaive(ast) {
    const { tables, projection, conditions, joins } = ast;
    // Feuilles : scans
    let leaves = tables.map(t => {
      const card = SimDB[t] ? SimDB[t].length : 0;
      return SimPlanner._node('scan', t, [], card, `${t}`);
    });

    // Jointures dans l'ordre du FROM
    let current = leaves[0];
    for (let i = 1; i < leaves.length; i++) {
      const r = leaves[i];
      const join = joins.find(j =>
        (j.left.table === current.label || j.right.table === current.label) &&
        (j.left.table === r.label || j.right.table === r.label)
      ) || joins[i - 1] || joins[0];
      const joinLabel = join ? `${join.left.table}.${join.left.col} = ${join.right.table}.${join.right.col}` : '⋈';
      const card = (current.estimatedCard * r.estimatedCard);
      current = SimPlanner._node('join', `⋈ (${joinLabel})`, [current, r], card,
        `${current.label} ⋈ ${r.label}  sur  ${joinLabel}`);
    }

    // Sélections naïves : au-dessus des jointures
    for (const c of conditions) {
      const card = Math.ceil(current.estimatedCard * 0.5);
      current = SimPlanner._node('select', `σ ${c.col}='${c.val}'`, [current], card,
        `σ_{${c.col}='${c.val}'}(${current.label || '…'})`);
    }

    // Projection/agrégation
    if (projection?.type === 'count') {
      current = SimPlanner._node('agg', 'γ COUNT(*)', [current], 1, 'γ_{COUNT(*)}');
    } else if (projection?.type === 'columns') {
      current = SimPlanner._node('project', `π ${projection.cols.join(', ')}`, [current], current.estimatedCard,
        `π_{${projection.cols.join(', ')}}`)
    }
    return current;
  },

  // Arbre optimisé : push σ vers les feuilles + ordre jointures par cardinalité croissante
  _buildOptimized(ast) {
    const { tables, projection, conditions, joins } = ast;

    // Filtrer par table
    const filterForTable = (tbl) => conditions.filter(c => {
      const colMap = { Level: 'Student', Dept: 'Course', Grade: 'Grades', Name: 'Grades', StudId: 'Grades', CourId: 'Grades' };
      return colMap[c.col] === tbl || tables.includes(tbl);
    }).filter(c => {
      const colMap = { Level: 'Student', Dept: 'Course' };
      return (colMap[c.col] === tbl) || (!colMap[c.col]);
    });

    // Estimer cardinalité après σ
    const estimateAfterFilter = (tbl, filters) => {
      if (!SimDB[tbl]) return 0;
      let rows = SimDB[tbl];
      for (const f of filters) {
        rows = rows.filter(r => String(r[f.col]) === f.val);
      }
      return rows.length;
    };

    // Construire les feuilles avec σ poussés
    let leaves = tables.map(tbl => {
      const filters = filterForTable(tbl);
      const baseCard = SimDB[tbl] ? SimDB[tbl].length : 0;
      let node = SimPlanner._node('scan', tbl, [], baseCard, tbl);
      for (const f of filters) {
        const card = estimateAfterFilter(tbl, filters);
        node = SimPlanner._node('select', `σ ${f.col}='${f.val}'`, [node], card,
          `σ_{${f.col}='${f.val}'}(${tbl})`);
        node.label = `σ ${f.col}='${f.val}'`;
      }
      return { node, tbl, card: filters.length ? estimateAfterFilter(tbl, filters) : baseCard };
    });

    // Trier par cardinalité croissante (plus petit d'abord)
    leaves.sort((a, b) => a.card - b.card);

    // Construire les jointures dans cet ordre
    let current = leaves[0].node;
    let joinedTables = [leaves[0].tbl];
    for (let i = 1; i < leaves.length; i++) {
      const r = leaves[i];
      const join = joins.find(j =>
        (joinedTables.includes(j.left.table) || joinedTables.includes(j.right.table)) &&
        (j.left.table === r.tbl || j.right.table === r.tbl)
      ) || joins[i - 1] || joins[0];
      const joinLabel = join ? `${join.left.table}.${join.left.col} = ${join.right.table}.${join.right.col}` : '⋈';
      const card = Math.ceil((current.estimatedCard || 1) * (r.card || 1) * 0.15);
      current = SimPlanner._node('join', `⋈`, [current, r.node], Math.max(card, 1),
        `⋈  sur  ${joinLabel}`);
      joinedTables.push(r.tbl);
    }

    // Projection / agrégation
    if (projection?.type === 'count') {
      current = SimPlanner._node('agg', 'γ COUNT(*)', [current], 1, 'γ_{COUNT(*)}');
    } else if (projection?.type === 'columns') {
      current = SimPlanner._node('project', `π ${projection.cols.join(', ')}`, [current], current.estimatedCard,
        `π_{${projection.cols.join(', ')}}`);
    }
    return current;
  },
};

// ══════════════════════════════════════════════════════════════
// EXECUTOR — Arbre → snapshots d'exécution
// ══════════════════════════════════════════════════════════════
const SimExecutor = {
  execute(ast) {
    if (ast.error) return { error: ast.error };
    const { tables, projection, conditions, joins } = ast;

    // Vérifie si les tables nécessaires sont disponibles
    for (const t of tables) {
      if (!SimDB[t]) return { error: `Table "${t}" non disponible dans SimDB.` };
    }

    const snapshots = [];
    let stepId = 0;
    const step = (opLabel, nodeId, input, output, formalDef) => {
      snapshots.push({
        stepId: ++stepId,
        opLabel,
        nodeId,
        formalDef: formalDef || '',
        inputTuples: input,
        outputTuples: output,
        cardinality: output.length,
      });
      return output;
    };

    // ── Scans ──
    const scanned = {};
    for (const t of tables) {
      scanned[t] = step(`Scan ${t}`, `scan_${t}`, [], [...SimDB[t]], `${t}`);
    }

    // ── Sélections ──
    const filtered = { ...scanned };
    for (const c of conditions) {
      // Identifier la table cible
      const colMap = { Level: 'Student', Dept: 'Course' };
      const targetTable = colMap[c.col] || tables.find(t => SimDB[t]?.[0]?.[c.col] !== undefined);
      if (targetTable && filtered[targetTable]) {
        const input = filtered[targetTable];
        const output = input.filter(r => String(r[c.col]) === c.val);
        filtered[targetTable] = step(`σ ${c.col}='${c.val}'`, `sel_${c.col}`, input, output,
          `σ_{${c.col}='${c.val}'}(${targetTable})`);
      }
    }

    // ── Jointures (nested loop) ──
    let result = null;
    let resultLabel = '';
    if (tables.length === 1) {
      result = filtered[tables[0]];
      resultLabel = tables[0];
    } else {
      // Déterminer l'ordre optimal des jointures
      const tableOrder = SimExecutor._getJoinOrder(tables, joins, filtered);
      result = filtered[tableOrder[0]];
      resultLabel = tableOrder[0];

      for (let i = 1; i < tableOrder.length; i++) {
        const rightTable = tableOrder[i];
        const right = filtered[rightTable];
        const applicableJoins = SimExecutor._findAllJoins(joins, tableOrder.slice(0, i), rightTable);
        const output = [];
        for (const l of result) {
          for (const r of right) {
            // Vérifier toutes les conditions de jointure applicables
            const passes = applicableJoins.length === 0 || applicableJoins.every(join => {
              // Déterminer quelle colonne vient du côté gauche (déjà dans result)
              // et quelle colonne vient du côté droit (rightTable)
              let lCol, rCol;
              if (join.right.table === rightTable) {
                lCol = join.left.col;
                rCol = join.right.col;
              } else {
                lCol = join.right.col;
                rCol = join.left.col;
              }
              return String(l[lCol]) === String(r[rCol]);
            });
            if (passes) output.push({ ...l, ...r });
          }
        }
        const joinLabel = applicableJoins.length > 0
          ? applicableJoins.map(j => `${j.left.table}.${j.left.col}=${j.right.table}.${j.right.col}`).join(' AND ')
          : 'produit cart.';
        result = step(`⋈ ${joinLabel}`, `join_${i}`, result, output,
          `${resultLabel} ⋈ ${rightTable}  sur  ${joinLabel}`);
        resultLabel = `${resultLabel} ⋈ ${rightTable}`;
      }
    }

    // ── Projection/agrégation ──
    if (projection?.type === 'count') {
      const count = result.length;
      result = step('γ COUNT(*)', 'agg', result, [{ 'Count(*)': count }], 'γ_{COUNT(*)}');
    } else if (projection?.type === 'columns') {
      const cols = projection.cols;
      const output = result.map(r => {
        const obj = {};
        for (const c of cols) {
          const col = c.includes('.') ? c.split('.')[1] : c;
          obj[c] = r[col];
        }
        return obj;
      });
      result = step(`π ${cols.join(', ')}`, 'proj', result, output, `π_{${cols.join(', ')}}`);
    }

    return { snapshots, finalResult: result };
  },

  _getJoinOrder(tables, joins, filtered) {
    // Trier par cardinalité croissante pour l'exécution optimisée
    return [...tables].sort((a, b) => (filtered[a]?.length || 0) - (filtered[b]?.length || 0));
  },

  _findAllJoins(joins, alreadyJoined, newTable) {
    return joins.filter(j =>
      (alreadyJoined.includes(j.left.table) && j.right.table === newTable) ||
      (alreadyJoined.includes(j.right.table) && j.left.table === newTable)
    );
  },

  _findJoin(joins, alreadyJoined, newTable) {
    return this._findAllJoins(joins, alreadyJoined, newTable)[0] || null;
  },
};

// Export
if (typeof module !== 'undefined') module.exports = { SimParser, SimPlanner, SimExecutor };
