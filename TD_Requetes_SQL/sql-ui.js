/* sql-ui.js — Éditeur SQL interactif : exécution, résultats, autocomplétion */
(function () {
    'use strict';

    var SQL_KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
        'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT',
        'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'NULL', 'IS',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'UNION', 'EXCEPT', 'INTERSECT',
        'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'OVER', 'PARTITION',
        'RANK', 'ROW_NUMBER', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
        'BY', 'ALL', 'INTO', 'VALUES', 'SET'
    ];

    var TABLE_NAMES = ['employes', 'departements', 'projets', 'affectations'];

    var COL_NAMES = [
        'id', 'nom', 'prenom', 'salaire', 'departement_id',
        'date_embauche', 'poste', 'budget', 'localisation',
        'projet_id', 'role', 'heures', 'date_debut', 'date_fin', 'employe_id'
    ];

    var ALL_COMPLETIONS = SQL_KEYWORDS.concat(TABLE_NAMES).concat(COL_NAMES);

    // ── Utilitaires ──────────────────────────────────────────────────────

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getCurrentWord(textarea) {
        var val  = textarea.value;
        var pos  = textarea.selectionStart;
        var before = val.slice(0, pos);
        var match  = before.match(/(\w+)$/);
        return match ? match[1] : '';
    }

    function replaceCurrentWord(textarea, word) {
        var val    = textarea.value;
        var pos    = textarea.selectionStart;
        var before = val.slice(0, pos);
        var after  = val.slice(pos);
        var match  = before.match(/(\w+)$/);
        if (!match) return;
        var newBefore = before.slice(0, before.length - match[1].length) + word;
        textarea.value = newBefore + after;
        var newPos = newBefore.length;
        textarea.setSelectionRange(newPos, newPos);
    }

    // ── Onglets résultat / arbre algébrique ─────────────────────────────

    function buildResultTabs(tableHTML, query) {
        var safeQuery = query
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return '<div class="sql-tabs" data-query="' + safeQuery + '">' +
            '<div class="sql-tabs-header">' +
                '<button class="sql-tab-btn sql-tab-btn--active" data-tab="table">Résultat</button>' +
                '<button class="sql-tab-btn" data-tab="algebra">🌿 Arbre algébrique</button>' +
            '</div>' +
            '<div class="sql-tab-panel" data-panel="table">' + tableHTML + '</div>' +
            '<div class="sql-tab-panel" data-panel="algebra" hidden></div>' +
        '</div>';
    }

    // ── Construction du tableau résultat ────────────────────────────────

    function buildResultTable(results) {
        if (!results || results.length === 0) {
            return '<p class="sql-no-rows">Requête exécutée — 0 ligne retournée.</p>';
        }
        var res  = results[0];
        var cols = res.columns;
        var rows = res.values;
        var n    = rows.length;

        var html = '<div class="sql-result-meta">' + n + ' ligne' + (n > 1 ? 's' : '') + '</div>';
        html += '<div class="sql-table-wrap"><table class="sql-result-table"><thead><tr>';
        cols.forEach(function (c) {
            html += '<th>' + escapeHtml(String(c)) + '</th>';
        });
        html += '</tr></thead><tbody>';
        rows.forEach(function (row) {
            html += '<tr>';
            row.forEach(function (cell) {
                var val = cell === null
                    ? '<span class="sql-null">NULL</span>'
                    : escapeHtml(String(cell));
                html += '<td>' + val + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    // ── Exécution de requête ─────────────────────────────────────────────

    function executeQuery(zone) {
        var textarea   = zone.querySelector('.sql-input');
        var statusEl   = zone.querySelector('.sql-status');
        var resultArea = zone.querySelector('.sql-result-area');
        var runBtn     = zone.querySelector('.sql-run-btn');
        var query      = textarea.value.trim();
        if (!query) return;

        runBtn.disabled = true;
        statusEl.textContent = '';
        statusEl.className   = 'sql-status';
        resultArea.innerHTML = '<div class="sql-loading">Exécution…</div>';

        function doRun() {
            try {
                var t0      = performance.now();
                var results = window.runSQL(query);
                var ms      = Math.round(performance.now() - t0);
                resultArea.innerHTML = buildResultTabs(buildResultTable(results), query);
                statusEl.textContent = ms + ' ms';
                statusEl.className   = 'sql-status sql-status-ok';
            } catch (err) {
                resultArea.innerHTML = '<div class="sql-error">' + escapeHtml(err.message) + '</div>';
                statusEl.textContent = 'Erreur';
                statusEl.className   = 'sql-status sql-status-error';
            }
            runBtn.disabled = false;
        }

        if (window.sqlEngine && window.sqlEngine.ready) {
            doRun();
        } else if (window.sqlEngine && window.sqlEngine.error) {
            resultArea.innerHTML = '<div class="sql-error">Impossible de charger SQL.js : ' +
                escapeHtml(window.sqlEngine.error) + '</div>';
            runBtn.disabled = false;
        } else {
            window.onSQLReady(doRun);
        }
    }

    // ── Autocomplétion ───────────────────────────────────────────────────

    function setupAutocomplete(zone) {
        var textarea   = zone.querySelector('.sql-input');
        var dropdown   = zone.querySelector('.sql-autocomplete');
        var selIdx     = -1;
        var matches    = [];

        function positionDropdown() {
            dropdown.style.top  = (textarea.offsetTop + textarea.offsetHeight) + 'px';
            dropdown.style.left = textarea.offsetLeft + 'px';
        }

        function renderDropdown(word) {
            if (!matches.length || !word || word.length < 2) {
                dropdown.hidden = true;
                return;
            }
            selIdx = 0; // premier élément sélectionné par défaut
            dropdown.innerHTML = matches.slice(0, 10).map(function (m, i) {
                return '<div class="sql-ac-item' + (i === 0 ? ' selected' : '') + '" data-idx="' + i + '">' +
                    '<span class="sql-ac-match">' + escapeHtml(m.slice(0, word.length)) + '</span>' +
                    escapeHtml(m.slice(word.length)) +
                    '</div>';
            }).join('');
            positionDropdown();
            dropdown.hidden = false;

            dropdown.querySelectorAll('.sql-ac-item').forEach(function (item) {
                item.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    var idx = parseInt(item.dataset.idx, 10);
                    replaceCurrentWord(textarea, matches[idx]);
                    dropdown.hidden = true;
                    textarea.focus();
                });
            });
        }

        function updateDropdown() {
            var word  = getCurrentWord(textarea);
            if (!word || word.length < 2) { dropdown.hidden = true; return; }
            var upper = word.toUpperCase();
            matches = ALL_COMPLETIONS.filter(function (c) {
                return c.toUpperCase().startsWith(upper) && c.toUpperCase() !== upper;
            });
            renderDropdown(word);
        }

        function moveSelection(delta) {
            var items = dropdown.querySelectorAll('.sql-ac-item');
            var count = items.length;
            // Tab cycle en boucle, ↑↓ sans boucle
            if (delta === 'tab') {
                selIdx = (selIdx + 1) % count;
            } else {
                selIdx = Math.max(0, Math.min(selIdx + delta, count - 1));
            }
            items.forEach(function (item, i) {
                item.classList.toggle('selected', i === selIdx);
            });
        }

        textarea.addEventListener('input', updateDropdown);

        textarea.addEventListener('keydown', function (e) {
            if (!dropdown.hidden) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault(); moveSelection(1); return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault(); moveSelection(-1); return;
                }
                if (e.key === 'Tab') {
                    e.preventDefault(); moveSelection('tab'); return;
                }
                if (e.key === 'Enter' && matches[selIdx]) {
                    e.preventDefault();
                    replaceCurrentWord(textarea, matches[selIdx]);
                    dropdown.hidden = true;
                    return;
                }
                if (e.key === 'Escape') {
                    dropdown.hidden = true;
                    selIdx = -1;
                    return;
                }
            }
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                executeQuery(zone);
            }
        });

        textarea.addEventListener('blur', function () {
            setTimeout(function () { dropdown.hidden = true; }, 160);
        });
    }

    // ── Initialisation ───────────────────────────────────────────────────

    function initEditors() {
        document.querySelectorAll('.sql-editor-zone').forEach(function (zone) {
            var runBtn = zone.querySelector('.sql-run-btn');
            if (runBtn) {
                runBtn.addEventListener('click', function () { executeQuery(zone); });
            }
            setupAutocomplete(zone);
        });

        // Listener délégué pour les onglets résultat / arbre
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.sql-tab-btn');
            if (!btn) return;
            var tabs     = btn.closest('.sql-tabs');
            var tabName  = btn.dataset.tab;
            var panel    = tabs.querySelector('[data-panel="' + tabName + '"]');

            // Activer l'onglet cliqué
            tabs.querySelectorAll('.sql-tab-btn').forEach(function (b) {
                b.classList.toggle('sql-tab-btn--active', b === btn);
            });
            tabs.querySelectorAll('.sql-tab-panel').forEach(function (p) {
                p.hidden = (p.dataset.panel !== tabName);
            });

            // Rendu lazy de l'arbre
            if (tabName === 'algebra' && !panel.dataset.rendered && window.buildAlgebraTree) {
                panel.innerHTML = window.buildAlgebraTree(tabs.dataset.query);
                panel.dataset.rendered = '1';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEditors);
    } else {
        initEditors();
    }
})();
