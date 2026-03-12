/* sim-viz.js — Renderers SVG + animations + widget init pour le simulateur TD4 */
'use strict';

const SimViz = (() => {
  // ── Couleurs opérateurs ──
  const OP_COLORS = {
    scan:    '#9e9a94',
    select:  '#3b82f6',
    join:    '#d67556',
    project: '#22c55e',
    agg:     '#a855f7',
  };

  // ══════════════════════════════════════════════════════════
  // QUERY TREE RENDERER — SVG inline
  // ══════════════════════════════════════════════════════════
  const QueryTreeRenderer = {
    _activeNodeId: null,

    render(container, rootNode, onNodeClick) {
      container.innerHTML = '';
      if (!rootNode || rootNode.error) {
        container.innerHTML = `<p style="color:#f87171;padding:1rem">${rootNode?.error || 'Aucun arbre à afficher'}</p>`;
        return;
      }

      // Calcul layout (positions des nœuds)
      const nodes = [];
      const edges = [];
      QueryTreeRenderer._layout(rootNode, nodes, edges, 0, 0);

      // Dimensions SVG
      const xs = nodes.map(n => n.x);
      const ys = nodes.map(n => n.y);
      const minX = Math.min(...xs) - 60;
      const maxX = Math.max(...xs) + 60;
      const minY = Math.min(...ys) - 30;
      const maxY = Math.max(...ys) + 50;
      const W = maxX - minX;
      const H = maxY - minY;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `${minX} ${minY} ${W} ${H}`);
      svg.style.cssText = 'width:100%;max-height:380px;display:block;overflow:visible';

      // Defs : animation flow + glow (inséré avant les arêtes)
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <style>
          @keyframes flowUp { from { stroke-dashoffset: 20 } to { stroke-dashoffset: 0 } }
          .edge-flow { stroke-dasharray: 6 4; animation: flowUp 1.5s linear infinite; }
        </style>`;
      svg.appendChild(defs);

      // Arêtes animées avec largeur encodant la cardinalité
      for (const e of edges) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(158,154,148,0.5)');
        const card = e.card ?? 10;
        const sw = Math.max(1, Math.min(5, Math.log10(card + 1) * 1.5));
        path.setAttribute('stroke-width', sw);
        path.classList.add('edge-flow');
        svg.appendChild(path);
      }

      // Nœuds
      for (const n of nodes) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${n.x}, ${n.y})`);
        g.style.cursor = 'pointer';
        g.dataset.nodeId = n.nodeId;

        const isActive = n.nodeId === QueryTreeRenderer._activeNodeId;
        const color = OP_COLORS[n.op] || '#9e9a94';

        // Fond nœud
        const rx = n.op === 'scan' ? 6 : 20;
        const bw = Math.max(n.label.length * 7 + 20, 60);
        const bh = 32;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', -bw / 2); rect.setAttribute('y', -bh / 2);
        rect.setAttribute('width', bw); rect.setAttribute('height', bh);
        rect.setAttribute('rx', rx);
        rect.setAttribute('fill', `${color}22`);
        rect.setAttribute('stroke', isActive ? color : `${color}88`);
        rect.setAttribute('stroke-width', isActive ? '2.5' : '1.5');
        if (isActive) rect.setAttribute('filter', 'url(#glow)');
        g.appendChild(rect);

        // Texte
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '700');
        text.setAttribute('fill', color);
        text.textContent = n.label;
        g.appendChild(text);

        // Cardinalité (petit badge sous le nœud)
        if (n.estimatedCard !== undefined) {
          const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          badge.setAttribute('text-anchor', 'middle');
          badge.setAttribute('y', bh / 2 + 12);
          badge.setAttribute('font-size', '9');
          badge.setAttribute('fill', 'rgba(158,154,148,0.7)');
          badge.textContent = `${n.estimatedCard} tuple${n.estimatedCard > 1 ? 's' : ''}`;
          g.appendChild(badge);
        }

        // Hover → tooltip positionné près du nœud
        g.addEventListener('mouseenter', (evt) => {
          QueryTreeRenderer._activeNodeId = n.nodeId;
          if (onNodeClick) onNodeClick(n);
          // Tooltip flottant positionné relativement au SVG container
          let tip = document.getElementById('sim-node-hover-tip');
          if (!tip) {
            tip = document.createElement('div');
            tip.id = 'sim-node-hover-tip';
            tip.style.cssText = `position:absolute;z-index:9999;padding:0.6rem 0.9rem;
              background:#1a1814;border:1px solid rgba(214,117,86,0.5);border-radius:8px;
              max-width:280px;font-size:0.8rem;color:#dedad5;pointer-events:none;
              box-shadow:0 4px 20px rgba(0,0,0,0.5);transition:opacity 0.15s`;
            const svgParent = container.offsetParent || container.parentElement;
            (svgParent.style.position ? svgParent : container.parentElement).style.position = 'relative';
            container.style.position = 'relative';
            container.appendChild(tip);
          }
          tip.innerHTML = `<strong style="color:#d67556">${n.label}</strong><br>
            <span style="color:#9e9a94;font-size:0.75rem">${n.formalDef || ''}</span><br>
            <span>Cardinalité : <strong>${n.estimatedCard}</strong></span>`;
          tip.style.opacity = '1';
          tip.style.display = 'block';
          // Position near cursor within container
          const cRect = container.getBoundingClientRect();
          const x = evt.clientX - cRect.left + 10;
          const y = evt.clientY - cRect.top + 10;
          tip.style.left = x + 'px';
          tip.style.top = y + 'px';
        });
        g.addEventListener('mousemove', (evt) => {
          const tip = document.getElementById('sim-node-hover-tip');
          if (!tip) return;
          const cRect = container.getBoundingClientRect();
          tip.style.left = (evt.clientX - cRect.left + 10) + 'px';
          tip.style.top = (evt.clientY - cRect.top + 10) + 'px';
        });
        g.addEventListener('mouseleave', () => {
          const tip = document.getElementById('sim-node-hover-tip');
          if (tip) tip.style.display = 'none';
        });
        // Also keep click for onNodeClick callback (panel below tree)
        g.addEventListener('click', () => {
          if (onNodeClick) onNodeClick(n);
        });

        svg.appendChild(g);
      }

      // (defs already inserted above with glow + flowUp animation)

      container.appendChild(svg);
    },

    // DFS layout : assigne (x, y) à chaque nœud
    _layout(node, nodes, edges, depth, siblingIndex) {
      const Y_STEP = 80;
      const y = depth * Y_STEP;

      // Calculer largeur sous-arbre
      const width = QueryTreeRenderer._subtreeWidth(node);
      const x = siblingIndex + width / 2;

      nodes.push({ ...node, x, y });

      let childX = siblingIndex;
      for (const child of node.children) {
        const cw = QueryTreeRenderer._subtreeWidth(child);
        const childNode = QueryTreeRenderer._layout(child, nodes, edges, depth + 1, childX);
        edges.push({ x1: x, y1: y + 16, x2: childNode.x, y2: childNode.y - 16, card: child.estimatedCard ?? 10 });
        childX += cw;
      }
      return { x, y };
    },

    _subtreeWidth(node) {
      const MIN_W = 120;
      if (!node.children || node.children.length === 0) return MIN_W;
      return node.children.reduce((s, c) => s + QueryTreeRenderer._subtreeWidth(c), 0);
    },

    setActiveNode(nodeId) {
      QueryTreeRenderer._activeNodeId = nodeId;
    },
  };

  // ══════════════════════════════════════════════════════════
  // STEP PLAYER — Lecture pas-à-pas des snapshots
  // ══════════════════════════════════════════════════════════
  const StepPlayer = {
    _snapshots: [],
    _currentStep: 0,
    _autoTimer: null,
    _treeContainer: null,
    _treeRoot: null,

    init(snapshots, treeContainer, treeRoot, counterEl, labelEl, tuplesEl, prevBtn, nextBtn, autoBtn) {
      StepPlayer._snapshots = snapshots;
      StepPlayer._currentStep = 0;
      StepPlayer._treeContainer = treeContainer;
      StepPlayer._treeRoot = treeRoot;
      StepPlayer._counterEl = counterEl;
      StepPlayer._labelEl = labelEl;
      StepPlayer._tuplesEl = tuplesEl;
      StepPlayer.stop();
      StepPlayer._render();

      if (prevBtn) prevBtn.onclick = () => StepPlayer.prev();
      if (nextBtn) nextBtn.onclick = () => StepPlayer.next();
      if (autoBtn) {
        autoBtn.onclick = () => {
          if (StepPlayer._autoTimer) {
            StepPlayer.stop();
            autoBtn.textContent = '▷ Auto';
          } else {
            StepPlayer.start();
            autoBtn.textContent = '⏸ Pause';
          }
        };
      }
    },

    prev() {
      if (StepPlayer._currentStep > 0) {
        StepPlayer._currentStep--;
        StepPlayer._render();
      }
    },

    next() {
      if (StepPlayer._currentStep < StepPlayer._snapshots.length - 1) {
        StepPlayer._currentStep++;
        StepPlayer._render();
      }
    },

    start() {
      StepPlayer.stop();
      const speedEl = document.getElementById('step-speed');
      const interval = speedEl ? parseInt(speedEl.value, 10) : 1200;
      StepPlayer._autoTimer = setInterval(() => {
        if (StepPlayer._currentStep < StepPlayer._snapshots.length - 1) {
          StepPlayer._currentStep++;
          StepPlayer._render();
        } else {
          StepPlayer.stop();
          const autoBtn = document.getElementById('step-auto');
          if (autoBtn) autoBtn.textContent = '▷ Auto';
        }
      }, interval);
      // Update speed label
      const labelEl = document.getElementById('step-speed-label');
      if (labelEl && speedEl) labelEl.textContent = (interval / 1000).toFixed(1) + 's';
    },

    stop() {
      if (StepPlayer._autoTimer) {
        clearInterval(StepPlayer._autoTimer);
        StepPlayer._autoTimer = null;
      }
    },

    _render() {
      const snap = StepPlayer._snapshots[StepPlayer._currentStep];
      const total = StepPlayer._snapshots.length;
      const idx = StepPlayer._currentStep;

      if (StepPlayer._counterEl) {
        StepPlayer._counterEl.textContent = `Étape ${idx + 1}/${total}`;
      }
      if (StepPlayer._labelEl && snap) {
        const opColor = OP_COLORS[snap.op] || '#9e9a94';
        StepPlayer._labelEl.innerHTML = `<span style="display:inline-block;padding:1px 7px;border-radius:4px;background:${opColor}22;color:${opColor};font-size:0.74rem;font-weight:700;margin-right:0.4rem">${snap.op?.toUpperCase() || '?'}</span>${snap.opLabel}${snap.formalDef ? '  —  ' + snap.formalDef : ''}`;
      }

      // Mettre à jour l'arbre (nœud actif)
      if (snap && StepPlayer._treeContainer && StepPlayer._treeRoot) {
        QueryTreeRenderer.setActiveNode(snap.nodeId);
        QueryTreeRenderer.render(StepPlayer._treeContainer, StepPlayer._treeRoot, (n) => {
          StepPlayer._showTooltip(n);
        });
      }

      // Afficher les tuples
      if (StepPlayer._tuplesEl && snap) {
        StepPlayer._renderTuples(snap);
      }
    },

    _renderTuples(snap) {
      const el = StepPlayer._tuplesEl;
      const tuples = snap.outputTuples || [];
      if (tuples.length === 0) {
        el.innerHTML = '<p style="color:#9e9a94;font-size:0.85rem">Aucun tuple en sortie.</p>';
        return;
      }
      const cols = Object.keys(tuples[0]);
      const shown = tuples.slice(0, 10); // max 10 lignes
      let html = '<div class="table-glass" style="margin-top:0.5rem"><table><thead><tr>';
      for (const c of cols) html += `<th style="text-align:center">${c}</th>`;
      html += '</tr></thead><tbody>';
      for (const row of shown) {
        html += '<tr>';
        for (const c of cols) html += `<td style="text-align:center">${row[c] ?? ''}</td>`;
        html += '</tr>';
      }
      if (tuples.length > 10) {
        html += `<tr><td colspan="${cols.length}" style="color:#9e9a94;text-align:center">… ${tuples.length - 10} autres tuples …</td></tr>`;
      }
      html += `</tbody></table></div>`;
      html += `<p style="margin-top:0.5rem;font-size:0.82rem;color:#9e9a94"><strong>${tuples.length}</strong> tuple${tuples.length > 1 ? 's' : ''} en sortie</p>`;
      el.innerHTML = html;
    },

    _showTooltip(node) {
      // Tooltip simple via alert-style div flottant
      let tip = document.getElementById('sim-tooltip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'sim-tooltip';
        tip.style.cssText = `position:fixed;z-index:9999;padding:0.75rem 1rem;background:#1a1814;
          border:1px solid rgba(214,117,86,0.4);border-radius:10px;max-width:320px;
          font-size:0.82rem;color:#dedad5;box-shadow:0 8px 32px rgba(0,0,0,0.5);pointer-events:none`;
        document.body.appendChild(tip);
      }
      tip.innerHTML = `<strong style="color:#d67556">${node.label}</strong><br>
        <span style="color:#9e9a94">${node.formalDef || ''}</span><br>
        <span>Cardinalité estimée : <strong>${node.estimatedCard}</strong></span>`;
      tip.style.display = 'block';
      tip.style.top = '50%'; tip.style.left = '50%';
      tip.style.transform = 'translate(-50%,-50%)';
      const hide = () => { tip.style.display = 'none'; document.removeEventListener('click', hide); };
      setTimeout(() => document.addEventListener('click', hide), 100);
    },
  };

  // ══════════════════════════════════════════════════════════
  // BJI RENDERER — 3 panneaux animés
  // ══════════════════════════════════════════════════════════
  const BJIRenderer = {
    _mode: 'bji', // 'bji' | 'nested'

    render(container) {
      container.innerHTML = '';
      container.style.cssText = 'display:block;padding:1rem 0';

      // Contrôles mode
      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center';
      
      const btnBJI = document.createElement('button');
      btnBJI.className = 'sim-btn';
      btnBJI.innerHTML = '<div style="text-align:left;line-height:1.2"><b>Mode BJI</b> (Index de jointure)<br><span style="font-size:0.75rem;opacity:0.85">Analogie : L\'autoroute directe</span></div>';
      btnBJI.style.cssText = 'background:rgba(214,117,86,0.15);border-color:#d67556;color:#f5f3f0;padding:6px 12px;display:flex;align-items:center;gap:8px';
      btnBJI.title = "L'index donne directement l'adresse exacte (RID) des données à assembler. Pas de détours !";

      const btnNL = document.createElement('button');
      btnNL.className = 'sim-btn';
      btnNL.innerHTML = '<div style="text-align:left;line-height:1.2"><b>Nested Loop</b> (Boucles)<br><span style="font-size:0.75rem;opacity:0.85">Analogie : Le labyrinthe aveugle</span></div>';
      btnNL.style.cssText = 'background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);color:#9e9a94;padding:6px 12px;display:flex;align-items:center;gap:8px';
      btnNL.title = "La base doit comparer chaque ligne de Student avec chaque ligne de Grades... Une tâche de titan !";

      btnBJI.onclick = () => {
        BJIRenderer._mode = 'bji';
        clearTimeout(BJIRenderer._loopTimer);
        btnBJI.style.cssText = 'background:rgba(214,117,86,0.25);border-color:#d67556;color:#f5f3f0;padding:6px 12px;display:flex;align-items:center;gap:8px;box-shadow:0 0 12px rgba(214,117,86,0.3)';
        btnNL.style.cssText = 'background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);color:#9e9a94;padding:6px 12px;display:flex;align-items:center;gap:8px';
        BJIRenderer._drawSVG(svgContainer);
      };
      btnNL.onclick = () => {
        BJIRenderer._mode = 'nested';
        clearTimeout(BJIRenderer._loopTimer);
        btnNL.style.cssText = 'background:rgba(248,113,113,0.15);border-color:#f87171;color:#f5f3f0;padding:6px 12px;display:flex;align-items:center;gap:8px;box-shadow:0 0 12px rgba(248,113,113,0.2)';
        btnBJI.style.cssText = 'background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);color:#9e9a94;padding:6px 12px;display:flex;align-items:center;gap:8px';
        BJIRenderer._drawSVG(svgContainer);
      };
      controls.appendChild(btnBJI);
      controls.appendChild(btnNL);
      container.appendChild(controls);

      const info = document.createElement('p');
      info.style.cssText = 'font-size:0.82rem;color:#9e9a94;margin:0 0 0.75rem';
      info.textContent = 'Requête : WHERE Level = \'HCSC\' AND Dept = \'Stat\' — résultat : 4 tuples Grades qualifiants';
      container.appendChild(info);

      const svgContainer = document.createElement('div');
      svgContainer.style.cssText = 'overflow-x:auto';
      container.appendChild(svgContainer);
      BJIRenderer._drawSVG(svgContainer);
    },

    _drawSVG(container) {
      container.innerHTML = '';
      const isBJI = BJIRenderer._mode === 'bji';

      if (!isBJI) {
        // Nested Loop : layout HTML animé
        BJIRenderer._buildNestedLoopHTML(container);
        return;
      }

      const W = 760, H = 280;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.cssText = `width:100%;max-width:${W}px;display:block;font-family:'Inter',system-ui,sans-serif`;

      // ── Panneau Student ──
      BJIRenderer._drawTablePanel(svg, 'Student', 0, 0, 160, H - 20, [
        { rid: 1, label: 'RID 1 · Ali', color: '#5ba6a0', highlight: true },
        { rid: 2, label: 'RID 2 · Craig', color: '#9e9a94' },
        { rid: 3, label: 'RID 3 · Daniel', color: '#5ba6a0', highlight: true },
        { rid: 4, label: 'RID 4 · Ankit', color: '#9e9a94' },
        { rid: 5, label: 'RID 5 · Philip', color: '#9e9a94' },
        { rid: 6, label: 'RID 6 · Nicolas', color: '#5ba6a0', highlight: true },
      ], '#5ba6a0');

      // ── Panneau Index BJI (centre) ──
      BJIRenderer._drawIndexPanel(svg, 220, 0, 320, H - 20);

      // ── Panneau Grades ──
      BJIRenderer._drawGradesPanel(svg, 560, 0, 200, H - 20);

      // Bouton Replay
      const replayBtn = document.createElement('button');
      replayBtn.className = 'sim-btn';
      replayBtn.innerHTML = '<b>Rejouer l\'animation</b> <span style="opacity:0.7;font-weight:normal;margin-left:4px">(voir la magie opérer)</span>';
      replayBtn.style.cssText = 'font-size:0.85rem;margin-bottom:0.75rem;padding:6px 14px;border-radius:20px;background:rgba(52,211,153,0.15);border-color:#34d399;color:#6ee7b7;box-shadow:0 0 10px rgba(52,211,153,0.1)';
      replayBtn.onmouseenter = () => { replayBtn.style.background = 'rgba(52,211,153,0.25)'; };
      replayBtn.onmouseleave = () => { replayBtn.style.background = 'rgba(52,211,153,0.15)'; };
      replayBtn.onclick = () => {
        clearTimeout(BJIRenderer._loopTimer);
        svg.querySelectorAll('.bji-anim-line').forEach(l => l.remove());
        svg.querySelectorAll('rect[data-rid], text[data-rid]').forEach(el => { el.style.opacity = ''; });
        const si = container.querySelector('#bji-step-info');
        if (si) si.textContent = '';
        BJIRenderer._animateBJILines(svg, si);
      };
      container.appendChild(replayBtn);
      container.appendChild(svg);

      // Compteur d'étapes BJI
      const stepInfo = document.createElement('div');
      stepInfo.id = 'bji-step-info';
      stepInfo.style.cssText = 'margin-top:0.6rem;font-size:0.8rem;color:#9e9a94;min-height:1.4em;font-family:monospace';
      container.appendChild(stepInfo);

      // Widget comparaison de coût BJI vs Nested Loop
      const costDiv = document.createElement('div');
      costDiv.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.75rem;font-size:0.8rem';
      costDiv.innerHTML = `
        <div style="padding:0.75rem;background:rgba(91,166,160,0.08);border:1px solid rgba(91,166,160,0.3);border-radius:8px">
          <div style="font-weight:700;color:#5ba6a0;margin-bottom:0.4rem">✓ BJI (avec index)</div>
          <div>Lookups JI₁[HCSC] : <strong>13 RIDs</strong></div>
          <div>Lookups JI₂[Stat] : <strong>7 RIDs</strong></div>
          <div>Intersection ∩ : <strong>4 RIDs</strong></div>
          <div>Accès Grades : <strong>4 blocs</strong></div>
          <div style="margin-top:0.4rem;color:#6ee7b7;font-weight:700">Total ≈ 24 ops</div>
        </div>
        <div style="padding:0.75rem;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:8px">
          <div style="font-weight:700;color:#f87171;margin-bottom:0.4rem">✗ Nested Loop</div>
          <div>6 étudiants × 27 notes</div>
          <div>= <strong>162 comparaisons</strong></div>
          <div>Sans tri ni index</div>
          <div style="margin-top:0.4rem;color:#f87171;font-weight:700">Total = 162 ops</div>
        </div>`;
      container.appendChild(costDiv);

      // Animer les lignes en 3 phases
      BJIRenderer._animateBJILines(svg, stepInfo);
    },

    _drawTablePanel(svg, title, x, y, w, h, rows, color) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y + 20);
      rect.setAttribute('width', w); rect.setAttribute('height', h - 20);
      rect.setAttribute('rx', '8'); rect.setAttribute('fill', `${color}11`);
      rect.setAttribute('stroke', `${color}55`); rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleEl.setAttribute('x', x + w / 2); titleEl.setAttribute('y', y + 14);
      titleEl.setAttribute('text-anchor', 'middle'); titleEl.setAttribute('font-size', '11');
      titleEl.setAttribute('font-weight', '700'); titleEl.setAttribute('fill', color);
      titleEl.textContent = title;
      g.appendChild(titleEl);

      rows.forEach((row, i) => {
        const ry = y + 38 + i * 34;
        if (row.highlight) {
          const rh = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rh.setAttribute('x', x + 6); rh.setAttribute('y', ry - 10);
          rh.setAttribute('width', w - 12); rh.setAttribute('height', 22);
          rh.setAttribute('rx', '5'); rh.setAttribute('fill', `${row.color}22`);
          rh.setAttribute('stroke', `${row.color}66`); rh.setAttribute('stroke-width', '1');
          g.appendChild(rh);
        }
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x + w / 2); t.setAttribute('y', ry + 4);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9');
        t.setAttribute('fill', row.color); t.setAttribute('font-weight', row.highlight ? '700' : '400');
        t.setAttribute('data-rid', row.rid);
        t.textContent = row.label;
        g.appendChild(t);
      });
      svg.appendChild(g);
    },

    _drawIndexPanel(svg, x, y, w, h) {
      const color = '#d67556';
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y + 20);
      rect.setAttribute('width', w); rect.setAttribute('height', h - 20);
      rect.setAttribute('rx', '8'); rect.setAttribute('fill', `${color}08`);
      rect.setAttribute('stroke', `${color}44`); rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('x', x + w / 2); title.setAttribute('y', y + 14);
      title.setAttribute('text-anchor', 'middle'); title.setAttribute('font-size', '11');
      title.setAttribute('font-weight', '700'); title.setAttribute('fill', color);
      title.textContent = 'Index BJI (JI₁ + JI₂)';
      g.appendChild(title);

      // JI1[HCSC] — ligne principale
      const entries = [
        { label: "JI₁[HCSC]", val: "{1,3,6,7,8,9,14,15,16,24,25,26,27}", y: y + 55, color: '#5ba6a0', highlight: true },
        { label: "JI₁[MCSC]", val: "{2,4,10,11,12,13,17,18,19,20}", y: y + 100, color: '#9e9a94' },
        { label: "JI₁[MSC]",  val: "{5,21,22,23}", y: y + 135, color: '#9e9a94' },
        { label: "JI₂[Stat]", val: "{9,16,17,18,23,24,27}", y: y + 175, color: '#d67556', highlight: true },
        { label: "JI₂[Comp]", val: "{1–8,10,13,15,19,21,22,26}", y: y + 210, color: '#9e9a94' },
        { label: "JI₂[Math]", val: "{11,12,14,20,25}", y: y + 245, color: '#9e9a94' },
      ];

      for (const e of entries) {
        if (e.highlight) {
          const rh = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rh.setAttribute('x', x + 8); rh.setAttribute('y', e.y - 13);
          rh.setAttribute('width', w - 16); rh.setAttribute('height', 24);
          rh.setAttribute('rx', '5'); rh.setAttribute('fill', `${e.color}22`);
          rh.setAttribute('stroke', `${e.color}55`); rh.setAttribute('stroke-width', '1');
          g.appendChild(rh);
        }
        const tl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tl.setAttribute('x', x + 18); tl.setAttribute('y', e.y);
        tl.setAttribute('font-size', '9'); tl.setAttribute('font-weight', '700');
        tl.setAttribute('fill', e.color);
        tl.textContent = e.label;
        g.appendChild(tl);

        const tv = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tv.setAttribute('x', x + 85); tv.setAttribute('y', e.y);
        tv.setAttribute('font-size', '8.5'); tv.setAttribute('fill', e.highlight ? e.color : '#9e9a94');
        tv.textContent = e.val;
        g.appendChild(tv);
      }

      // Intersection ∩
      const inter = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      inter.setAttribute('x', x + w / 2 - 10); inter.setAttribute('y', y + 150);
      inter.setAttribute('text-anchor', 'middle'); inter.setAttribute('font-size', '22');
      inter.setAttribute('font-weight', '800'); inter.setAttribute('fill', color);
      inter.textContent = '∩';
      g.appendChild(inter);

      svg.appendChild(g);
    },

    _drawGradesPanel(svg, x, y, w, h) {
      const color = '#d67556';
      const qualifyingRIDs = new Set([9, 16, 24, 27]);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y + 20);
      rect.setAttribute('width', w); rect.setAttribute('height', h - 20);
      rect.setAttribute('rx', '8'); rect.setAttribute('fill', `${color}08`);
      rect.setAttribute('stroke', `${color}44`); rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('x', x + w / 2); title.setAttribute('y', y + 14);
      title.setAttribute('text-anchor', 'middle'); title.setAttribute('font-size', '11');
      title.setAttribute('font-weight', '700'); title.setAttribute('fill', color);
      title.textContent = 'Grades (27 tuples)';
      g.appendChild(title);

      // Afficher les 27 RIDs en grille 3×9
      for (let rid = 1; rid <= 27; rid++) {
        const col = (rid - 1) % 3;
        const row = Math.floor((rid - 1) / 3);
        const px = x + 18 + col * 58;
        const py = y + 40 + row * 26;
        const isQ = qualifyingRIDs.has(rid);

        const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        pill.setAttribute('x', px - 2); pill.setAttribute('y', py - 9);
        pill.setAttribute('width', 46); pill.setAttribute('height', 18);
        pill.setAttribute('rx', '4');
        pill.setAttribute('fill', isQ ? 'rgba(214,117,86,0.25)' : 'rgba(158,154,148,0.1)');
        pill.setAttribute('stroke', isQ ? '#d67556' : 'rgba(158,154,148,0.25)');
        pill.setAttribute('data-rid', rid);
        g.appendChild(pill);

        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', px + 21); t.setAttribute('y', py + 3);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9');
        t.setAttribute('font-weight', isQ ? '700' : '400');
        t.setAttribute('fill', isQ ? '#d67556' : '#9e9a94');
        t.setAttribute('data-rid', rid);
        t.textContent = `RID ${rid}`;
        g.appendChild(t);
      }

      svg.appendChild(g);
    },

    _buildNestedLoopHTML(container) {
      // Données
      const students = [
        { rid: 1, name: 'Ali',    level: 'HCSC', studId: 1 },
        { rid: 2, name: 'Craig',  level: 'MCSC', studId: 2 },
        { rid: 3, name: 'Daniel', level: 'HCSC', studId: 3 },
        { rid: 4, name: 'Ankit',  level: 'MCSC', studId: 4 },
        { rid: 5, name: 'Philip', level: 'MSC',  studId: 5 },
        { rid: 6, name: 'Nicolas',level: 'HCSC', studId: 6 },
      ];
      // Sample grades (studId, courseId subset for display)
      const grades = [
        { rid: 1,  studId: 1, courId: 'CS101' },
        { rid: 2,  studId: 1, courId: 'CS201' },
        { rid: 3,  studId: 2, courId: 'CS101' },
        { rid: 4,  studId: 3, courId: 'STAT1' },
        { rid: 5,  studId: 3, courId: 'CS201' },
        { rid: 6,  studId: 4, courId: 'STAT1' },
        { rid: 7,  studId: 5, courId: 'MATH1' },
        { rid: 8,  studId: 6, courId: 'STAT1' },
        { rid: 9,  studId: 6, courId: 'CS101' },
      ];

      // Matches (where studId equals)
      const matchPairs = [];
      for (const s of students) {
        for (const g of grades) {
          if (s.studId === g.studId) matchPairs.push({ s, g });
        }
      }

      const totalComparisons = students.length * grades.length;
      let outerIdx = 0, innerIdx = 0;
      let comparisons = 0, matches = 0;

      container.innerHTML = `
        <style>
          .nl-wrap { display:flex; gap:0.75rem; font-size:0.8rem; }
          .nl-panel { flex:1; min-width:0; border:1px solid rgba(255,255,255,0.1); border-radius:8px; overflow:hidden; }
          .nl-panel-title { padding:5px 8px; font-weight:700; font-size:0.78rem; border-bottom:1px solid rgba(255,255,255,0.08); }
          .nl-table { width:100%; border-collapse:collapse; }
          .nl-table tr { transition:background 0.2s; }
          .nl-table td { padding:3px 8px; border-bottom:1px solid rgba(255,255,255,0.05); white-space:nowrap; }
          .nl-active-outer { background:rgba(214,117,86,0.25)!important; box-shadow:inset 3px 0 0 #d67556; }
          .nl-active-inner { background:rgba(91,166,160,0.2)!important; box-shadow:inset 3px 0 0 #5ba6a0; }
          .nl-match-flash  { background:rgba(34,197,94,0.35)!important; }
          .nl-pseudo { font-family:monospace; font-size:0.76rem; line-height:1.6; padding:0.5rem; }
          .nl-pseudo .ps-line { padding:1px 4px; border-radius:3px; }
          .nl-pseudo .ps-active { background:rgba(214,117,86,0.18); color:#d67556; }
          .nl-counter { font-size:0.78rem; color:#9e9a94; padding:0.4rem 0.5rem; border-top:1px solid rgba(255,255,255,0.08); }
          .nl-output-row { padding:2px 8px; border-bottom:1px solid rgba(255,255,255,0.05); color:#6ee7b7; font-size:0.76rem; }
        </style>
        <div style="display:flex;gap:0.75rem;margin-bottom:0.8rem;flex-wrap:wrap;align-items:center">
          <div style="display:flex;align-items:center;gap:0.5rem;background:rgba(0,0,0,0.2);padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
            <button id="nl-prev" class="sim-btn" style="padding:4px 10px">◀</button>
            <span id="nl-counter" style="font-size:0.85rem;color:#f5f3f0;min-width:140px;text-align:center;font-variant-numeric:tabular-nums;font-weight:600">Comp. 0/${totalComparisons}</span>
            <button id="nl-next" class="sim-btn" style="padding:4px 10px">▶</button>
          </div>
          <button id="nl-auto" class="sim-btn">▷ Lecture Auto</button>
          <span style="font-size:0.8rem;color:#9e9a94;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:20px;margin-left:auto">Matches trouvés : <b id="nl-matches" style="color:#6ee7b7">0</b></span>
        </div>
        <div class="nl-wrap">
          <div class="nl-panel" style="border-color:rgba(214,117,86,0.3)">
            <div class="nl-panel-title" style="color:#d67556;background:rgba(214,117,86,0.08)">Student — boucle externe</div>
            <table class="nl-table" id="nl-outer-table">
              ${students.map((s, i) => `<tr data-idx="${i}"><td style="color:#9e9a94;font-size:0.72rem">RID ${s.rid}</td><td>${s.name}</td><td style="color:#9e9a94">${s.level}</td></tr>`).join('')}
            </table>
          </div>
          <div class="nl-panel" style="border-color:rgba(91,166,160,0.3)">
            <div class="nl-panel-title" style="color:#5ba6a0;background:rgba(91,166,160,0.08)">Grades — boucle interne</div>
            <table class="nl-table" id="nl-inner-table">
              ${grades.map((g, i) => `<tr data-idx="${i}"><td style="color:#9e9a94;font-size:0.72rem">RID ${g.rid}</td><td>StudId ${g.studId}</td><td style="color:#9e9a94">${g.courId}</td></tr>`).join('')}
            </table>
          </div>
        </div>
        
        <div class="nl-wrap" style="margin-top:0.75rem;">
          <div class="nl-panel" style="border-color:rgba(214,117,86,0.3); flex: 0 0 auto; min-width: 250px;">
            <div class="nl-panel-title" style="color:#d67556;background:rgba(214,117,86,0.08)">Algorithme (Pseudo-code)</div>
            <div class="nl-pseudo" style="margin-top:0.25rem">
              <div class="ps-line" id="ps0">FOR r IN Student:</div>
              <div class="ps-line" id="ps1" style="padding-left:10px">FOR s IN Grades:</div>
              <div class="ps-line" id="ps2" style="padding-left:18px">IF r.StudId=s.StudId:</div>
              <div class="ps-line" id="ps3" style="padding-left:26px">OUTPUT(r,s)</div>
            </div>
          </div>
          <div class="nl-panel" style="border-color:rgba(34,197,94,0.3);">
            <div class="nl-panel-title" style="color:#6ee7b7;background:rgba(34,197,94,0.08)">Sortie (Matches trouvés)</div>
            <div id="nl-output" style="max-height: 150px; overflow-y: auto;"></div>
          </div>
        </div>
        <div id="nl-stats" class="nl-counter" style="margin-top:0.75rem">Comparaisons: 0 / ${totalComparisons} &nbsp;·&nbsp; Matches: 0</div>`;

      const outerTbl = container.querySelector('#nl-outer-table');
      const innerTbl = container.querySelector('#nl-inner-table');
      const outputEl = container.querySelector('#nl-output');
      const statsEl  = container.querySelector('#nl-stats');
      const counterEl = container.querySelector('#nl-counter');
      const matchesEl = container.querySelector('#nl-matches');

      function highlightStep() {
        // Clear highlights
        outerTbl.querySelectorAll('tr').forEach(r => r.className = '');
        innerTbl.querySelectorAll('tr').forEach(r => r.className = '');
        document.querySelectorAll('.ps-line').forEach(l => l.classList.remove('ps-active'));

        if (outerIdx >= students.length) {
          // Done
          container.querySelector('#ps0').classList.add('ps-active');
          return;
        }

        const s = students[outerIdx];
        const g = grades[innerIdx];
        const isMatch = s.studId === g.studId;

        outerTbl.querySelector(`tr[data-idx="${outerIdx}"]`).className = 'nl-active-outer';
        const innerRow = innerTbl.querySelector(`tr[data-idx="${innerIdx}"]`);
        innerRow.className = isMatch ? 'nl-match-flash' : 'nl-active-inner';

        // Scroll into view
        innerRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

        // Pseudocode highlight
        container.querySelector('#ps1').classList.add('ps-active');
        container.querySelector('#ps2').classList.add('ps-active');
        if (isMatch) container.querySelector('#ps3').classList.add('ps-active');

        // Update stats
        comparisons = outerIdx * grades.length + innerIdx + 1;
        matches = outputEl.querySelectorAll('.nl-output-row').length + (isMatch ? 1 : 0);
        
        if (statsEl) statsEl.innerHTML = `Comparaisons: ${comparisons} / ${totalComparisons} &nbsp;·&nbsp; Matches: ${matches}`;
        if (counterEl) counterEl.textContent = `Comp. ${comparisons}/${totalComparisons}`;
        if (matchesEl) matchesEl.textContent = matches;

        if (isMatch) {
          const row = document.createElement('div');
          row.className = 'nl-output-row';
          row.textContent = `${s.name} × G${g.rid} (StudId=${s.studId})`;
          outputEl.appendChild(row);
        }
      }

      function advance() {
        innerIdx++;
        if (innerIdx >= grades.length) {
          innerIdx = 0;
          outerIdx++;
        }
        highlightStep();
      }

      function retreat() {
        if (outerIdx === 0 && innerIdx === 0) return;
        const newOuter = innerIdx === 0 ? Math.max(0, outerIdx - 1) : outerIdx;
        const newInner = innerIdx === 0 ? grades.length - 1 : innerIdx - 1;
        outerIdx = newOuter;
        innerIdx = newInner;
        // Rebuild output up to this point
        outputEl.innerHTML = '';
        for (let oi = 0; oi <= outerIdx; oi++) {
          const maxI = oi < outerIdx ? grades.length - 1 : innerIdx;
          for (let ii = 0; ii <= maxI; ii++) {
            if (students[oi].studId === grades[ii].studId) {
              const row = document.createElement('div');
              row.className = 'nl-output-row';
              row.textContent = `${students[oi].name} × G${grades[ii].rid}`;
              outputEl.appendChild(row);
            }
          }
        }
        highlightStep();
      }

      let nlTimer = null;
      container.querySelector('#nl-prev').onclick = () => { stopNL(); retreat(); };
      container.querySelector('#nl-next').onclick = () => { stopNL(); advance(); };
      const autoBtn = container.querySelector('#nl-auto');
      autoBtn.onclick = () => {
        if (nlTimer) { stopNL(); autoBtn.textContent = '▷ Auto'; }
        else { autoBtn.textContent = '⏸ Pause'; startNL(); }
      };

      function stopNL() { if (nlTimer) { clearInterval(nlTimer); nlTimer = null; } }
      function startNL() {
        stopNL();
        nlTimer = setInterval(() => {
          if (outerIdx < students.length) advance();
          else { stopNL(); autoBtn.textContent = '▷ Auto'; }
        }, 500);
      }

      highlightStep();
    },

    _animateBJILine(svg, x1, y1, x2, y2, color, width, len) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', width);
      line.setAttribute('stroke-dasharray', len);
      line.setAttribute('stroke-dashoffset', len);
      line.classList.add('bji-anim-line');
      svg.appendChild(line);
      requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset 0.35s ease-out';
        line.setAttribute('stroke-dashoffset', '0');
      });
      return line;
    },

    _animateBJILines(svg, stepInfoEl) {
      // Positions HCSC rows in Student panel (RID 1,3,6 → rows 0,2,5)
      const hcscRows = [
        { rid: 1, ry: 38 + 0 * 34 },
        { rid: 3, ry: 38 + 2 * 34 },
        { rid: 6, ry: 38 + 5 * 34 },
      ];
      const INDEX_LEFT  = 220;
      const INDEX_RIGHT = 220 + 320;
      const STUDENT_RIGHT = 160;
      const JI1_Y = 55;
      const JI2_Y = 175;

      // Phase A (0ms): Student HCSC rows → JI₁[HCSC] entry
      if (stepInfoEl) stepInfoEl.textContent = '1. Consultation JI₁[HCSC] → 13 RIDs qualifiants…';

      let delay = 0;
      for (const row of hcscRows) {
        const d = delay;
        const ry = row.ry;
        setTimeout(() => {
          BJIRenderer._animateBJILine(svg, STUDENT_RIGHT, ry, INDEX_LEFT + 20, JI1_Y, '#5ba6a0', 1.5, 280);
        }, d);
        delay += 250;
      }

      // Phase B (700ms): pulse JI₁ and JI₂ highlights, animate ∩
      setTimeout(() => {
        if (stepInfoEl) stepInfoEl.textContent = '2. Consultation JI₂[Stat] → 7 RIDs qualifiants…';
        const rects = svg.querySelectorAll('rect');
        rects.forEach(r => {
          const x = parseFloat(r.getAttribute('x'));
          const y = parseFloat(r.getAttribute('y'));
          const inIndex = x >= INDEX_LEFT && x <= INDEX_RIGHT;
          if (inIndex && (Math.abs(y - 42) < 5 || Math.abs(y - 162) < 5)) {
            r.style.transition = 'stroke-width 0.2s';
            r.setAttribute('stroke-width', '2.5');
            setTimeout(() => { r.style.transition = 'stroke-width 0.2s'; r.setAttribute('stroke-width', '1'); }, 400);
          }
        });
        const texts = svg.querySelectorAll('text');
        texts.forEach(t => {
          if (t.textContent === '∩') {
            t.style.transition = 'font-size 0.2s';
            t.setAttribute('font-size', '30');
            t.setAttribute('fill', '#ffb347');
            setTimeout(() => {
              t.setAttribute('font-size', '22');
              t.setAttribute('fill', '#d67556');
            }, 500);
          }
        });
      }, 700);

      // Phase C (1400ms): Index right edge → 4 qualifying RIDs in Grades
      setTimeout(() => {
        if (stepInfoEl) stepInfoEl.textContent = '3. Intersection ∩ → 4 RIDs qualifiants : 9, 16, 24, 27';
        const qualRIDs = [9, 16, 24, 27];
        const gradesX = 560;
        svg.querySelectorAll('rect[data-rid]').forEach(p => {
          const rid = parseInt(p.getAttribute('data-rid'));
          if (!qualRIDs.includes(rid)) {
            p.style.transition = 'opacity 0.4s';
            p.style.opacity = '0.25';
          }
        });
        svg.querySelectorAll('text[data-rid]').forEach(t => {
          const rid = parseInt(t.getAttribute('data-rid'));
          if (!qualRIDs.includes(rid)) {
            t.style.transition = 'opacity 0.4s';
            t.style.opacity = '0.25';
          }
        });

        let qDelay = 0;
        for (const rid of qualRIDs) {
          const col = (rid - 1) % 3;
          const row = Math.floor((rid - 1) / 3);
          const gx = gradesX + 18 + col * 58 + 21;
          const gy = 40 + row * 26;
          const d = qDelay;
          setTimeout(() => {
            BJIRenderer._animateBJILine(svg, INDEX_RIGHT - 10, JI2_Y, gx, gy, '#d67556', 2, 300);
          }, d);
          qDelay += 250;
        }
      }, 1400);

      // Auto-loop: after ~3.8s total, reset and replay
      BJIRenderer._loopTimer = setTimeout(() => {
        svg.querySelectorAll('.bji-anim-line').forEach(l => l.remove());
        svg.querySelectorAll('rect[data-rid], text[data-rid]').forEach(el => {
          el.style.opacity = '';
        });
        if (stepInfoEl) stepInfoEl.textContent = '';
        BJIRenderer._animateBJILines(svg, stepInfoEl);
      }, 3800);
    },
  };

  // ══════════════════════════════════════════════════════════
  // ERD RENDERER — Schéma entité-relation Student/Grades/Course
  // ══════════════════════════════════════════════════════════
  const ERDRenderer = {
    render(container) {
      container.innerHTML = '';
      container.style.cssText = 'display:block;padding:1rem 0';

      const info = document.createElement('p');
      info.style.cssText = 'font-size:0.82rem;color:#9e9a94;margin:0 0 0.75rem';
      info.innerHTML = 'Schéma des 3 tables avec clés primaires (PK), clés étrangères (FK) et colonnes indexées par les BJI. <span style="color:#d67556;font-weight:700">Orange</span> = PK, <span style="color:#5ba6a0;font-weight:700">Teal</span> = FK, <span style="color:#a855f7;font-weight:700">Violet</span> = colonne filtrée (WHERE).';
      container.appendChild(info);

      const W = 700, H = 320;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.cssText = `width:100%;max-width:${W}px;display:block;font-family:'Inter',system-ui,sans-serif`;

      const ns = 'http://www.w3.org/2000/svg';

      // Helper: draw entity box
      function drawEntity(title, fields, x, y, w, titleColor) {
        const g = document.createElementNS(ns, 'g');
        const rowH = 22;
        const headerH = 28;
        const totalH = headerH + fields.length * rowH + 10;

        // Background
        const bg = document.createElementNS(ns, 'rect');
        bg.setAttribute('x', x); bg.setAttribute('y', y);
        bg.setAttribute('width', w); bg.setAttribute('height', totalH);
        bg.setAttribute('rx', '8');
        bg.setAttribute('fill', 'rgba(255,255,255,0.04)');
        bg.setAttribute('stroke', titleColor + '55');
        bg.setAttribute('stroke-width', '1.5');
        g.appendChild(bg);

        // Header band
        const hdr = document.createElementNS(ns, 'rect');
        hdr.setAttribute('x', x); hdr.setAttribute('y', y);
        hdr.setAttribute('width', w); hdr.setAttribute('height', headerH);
        hdr.setAttribute('rx', '8');
        hdr.setAttribute('fill', titleColor + '22');
        g.appendChild(hdr);
        // Patch bottom corners of header
        const hdrPatch = document.createElementNS(ns, 'rect');
        hdrPatch.setAttribute('x', x); hdrPatch.setAttribute('y', y + headerH - 8);
        hdrPatch.setAttribute('width', w); hdrPatch.setAttribute('height', 8);
        hdrPatch.setAttribute('fill', titleColor + '22');
        g.appendChild(hdrPatch);

        // Title text
        const tTitle = document.createElementNS(ns, 'text');
        tTitle.setAttribute('x', x + w / 2); tTitle.setAttribute('y', y + 18);
        tTitle.setAttribute('text-anchor', 'middle');
        tTitle.setAttribute('font-size', '12');
        tTitle.setAttribute('font-weight', '700');
        tTitle.setAttribute('fill', titleColor);
        tTitle.textContent = title;
        g.appendChild(tTitle);

        // Separator line
        const sep = document.createElementNS(ns, 'line');
        sep.setAttribute('x1', x); sep.setAttribute('y1', y + headerH);
        sep.setAttribute('x2', x + w); sep.setAttribute('y2', y + headerH);
        sep.setAttribute('stroke', titleColor + '44');
        sep.setAttribute('stroke-width', '1');
        g.appendChild(sep);

        // Fields
        fields.forEach((f, i) => {
          const fy = y + headerH + 6 + i * rowH + 12;

          if (f.highlight) {
            const fhdr = document.createElementNS(ns, 'rect');
            fhdr.setAttribute('x', x + 4); fhdr.setAttribute('y', fy - 11);
            fhdr.setAttribute('width', w - 8); fhdr.setAttribute('height', rowH - 2);
            fhdr.setAttribute('rx', '3');
            fhdr.setAttribute('fill', f.color + '22');
            g.appendChild(fhdr);
          }

          // Tag (PK/FK)
          if (f.tag) {
            const tag = document.createElementNS(ns, 'text');
            tag.setAttribute('x', x + 10); tag.setAttribute('y', fy);
            tag.setAttribute('font-size', '7.5');
            tag.setAttribute('font-weight', '700');
            tag.setAttribute('fill', f.color);
            tag.textContent = f.tag;
            g.appendChild(tag);
          }

          const tf = document.createElementNS(ns, 'text');
          tf.setAttribute('x', x + (f.tag ? 28 : 10)); tf.setAttribute('y', fy);
          tf.setAttribute('font-size', '10');
          tf.setAttribute('font-weight', f.bold ? '700' : '400');
          tf.setAttribute('fill', f.color);
          tf.textContent = f.name;
          g.appendChild(tf);

          // Store field Y for connector
          f._y = fy;
        });

        svg.appendChild(g);
        return { x, y, w, totalH, fields };
      }

      // Helper: arrow connector (horizontal)
      function drawConnector(x1, y1, x2, y2, color, label1, label2) {
        const midX = (x1 + x2) / 2;
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-dasharray', '4 3');
        path.setAttribute('opacity', '0.7');
        svg.appendChild(path);

        // Arrowhead at x2,y2
        const dx = x2 - midX, dy = y2 - y2; // horizontal at endpoint
        const arr = document.createElementNS(ns, 'polygon');
        const ax = x2, ay = y2;
        arr.setAttribute('points', `${ax},${ay} ${ax - 7},${ay - 4} ${ax - 7},${ay + 4}`);
        arr.setAttribute('fill', color);
        arr.setAttribute('opacity', '0.8');
        svg.appendChild(arr);

        if (label1) {
          const t = document.createElementNS(ns, 'text');
          t.setAttribute('x', x1 + 5); t.setAttribute('y', y1 - 4);
          t.setAttribute('font-size', '9'); t.setAttribute('fill', color); t.setAttribute('font-weight', '700');
          t.textContent = label1;
          svg.appendChild(t);
        }
        if (label2) {
          const t = document.createElementNS(ns, 'text');
          t.setAttribute('x', x2 - 12); t.setAttribute('y', y2 - 4);
          t.setAttribute('font-size', '9'); t.setAttribute('fill', color); t.setAttribute('font-weight', '700');
          t.textContent = label2;
          svg.appendChild(t);
        }
      }

      // ── Entity definitions ──
      const studentFields = [
        { name: 'RID', tag: '', color: '#9e9a94', bold: false },
        { name: 'StudId', tag: 'PK', color: '#d67556', bold: true, highlight: true },
        { name: 'Name', tag: '', color: '#dedad5', bold: false },
        { name: 'Level', tag: '', color: '#a855f7', bold: true, highlight: true },
      ];
      const gradesFields = [
        { name: 'RID', tag: '', color: '#9e9a94', bold: false },
        { name: 'StudId', tag: 'FK', color: '#5ba6a0', bold: true, highlight: true },
        { name: 'CourId', tag: 'FK', color: '#5ba6a0', bold: true, highlight: true },
        { name: 'Grade', tag: '', color: '#dedad5', bold: false },
      ];
      const courseFields = [
        { name: 'RID', tag: '', color: '#9e9a94', bold: false },
        { name: 'CourId', tag: 'PK', color: '#d67556', bold: true, highlight: true },
        { name: 'Name', tag: '', color: '#dedad5', bold: false },
        { name: 'Dept', tag: '', color: '#a855f7', bold: true, highlight: true },
      ];

      const ENT_W = 155;
      const studentEnt = drawEntity('Student', studentFields, 10, 20, ENT_W, '#5ba6a0');
      const gradesEnt  = drawEntity('Grades',  gradesFields,  270, 20, ENT_W + 10, '#d67556');
      const courseEnt  = drawEntity('Course',  courseFields,  530, 20, ENT_W, '#5ba6a0');

      // ── Connectors ──
      // Student.StudId → Grades.StudId
      const studIdField   = studentFields.find(f => f.name === 'StudId');
      const gradesSIdField = gradesFields.find(f => f.name === 'StudId');
      if (studIdField && gradesSIdField) {
        drawConnector(
          10 + ENT_W, studIdField._y,
          270, gradesSIdField._y,
          '#5ba6a0', '1', 'N'
        );
      }

      // Course.CourId → Grades.CourId
      const courIdField    = courseFields.find(f => f.name === 'CourId');
      const gradesCIdField = gradesFields.find(f => f.name === 'CourId');
      if (courIdField && gradesCIdField) {
        drawConnector(
          530, courIdField._y,
          270 + ENT_W + 10, gradesCIdField._y,
          '#5ba6a0', '1', 'N'
        );
      }

      // ── BJI badges ──
      const bjiY = 230;

      // JI₁ badge under Student (pointing to Level column)
      const ji1 = document.createElementNS(ns, 'g');
      const ji1Rect = document.createElementNS(ns, 'rect');
      ji1Rect.setAttribute('x', '20'); ji1Rect.setAttribute('y', bjiY);
      ji1Rect.setAttribute('width', '135'); ji1Rect.setAttribute('height', '32');
      ji1Rect.setAttribute('rx', '6');
      ji1Rect.setAttribute('fill', 'rgba(91,166,160,0.15)');
      ji1Rect.setAttribute('stroke', '#5ba6a0');
      ji1Rect.setAttribute('stroke-width', '1');
      ji1.appendChild(ji1Rect);
      const ji1T = document.createElementNS(ns, 'text');
      ji1T.setAttribute('x', '88'); ji1T.setAttribute('y', bjiY + 12);
      ji1T.setAttribute('text-anchor', 'middle'); ji1T.setAttribute('font-size', '10');
      ji1T.setAttribute('font-weight', '700'); ji1T.setAttribute('fill', '#5ba6a0');
      ji1T.textContent = 'JI₁ : index sur Level';
      ji1.appendChild(ji1T);
      const ji1T2 = document.createElementNS(ns, 'text');
      ji1T2.setAttribute('x', '88'); ji1T2.setAttribute('y', bjiY + 24);
      ji1T2.setAttribute('text-anchor', 'middle'); ji1T2.setAttribute('font-size', '8.5');
      ji1T2.setAttribute('fill', '#9e9a94');
      ji1T2.textContent = "→ RIDs des Grades (HCSC)";
      ji1.appendChild(ji1T2);
      svg.appendChild(ji1);

      // JI₂ badge under Course (pointing to Dept column)
      const ji2 = document.createElementNS(ns, 'g');
      const ji2Rect = document.createElementNS(ns, 'rect');
      ji2Rect.setAttribute('x', '538'); ji2Rect.setAttribute('y', bjiY);
      ji2Rect.setAttribute('width', '140'); ji2Rect.setAttribute('height', '32');
      ji2Rect.setAttribute('rx', '6');
      ji2Rect.setAttribute('fill', 'rgba(214,117,86,0.15)');
      ji2Rect.setAttribute('stroke', '#d67556');
      ji2Rect.setAttribute('stroke-width', '1');
      ji2.appendChild(ji2Rect);
      const ji2T = document.createElementNS(ns, 'text');
      ji2T.setAttribute('x', '608'); ji2T.setAttribute('y', bjiY + 12);
      ji2T.setAttribute('text-anchor', 'middle'); ji2T.setAttribute('font-size', '10');
      ji2T.setAttribute('font-weight', '700'); ji2T.setAttribute('fill', '#d67556');
      ji2T.textContent = 'JI₂ : index sur Dept';
      ji2.appendChild(ji2T);
      const ji2T2 = document.createElementNS(ns, 'text');
      ji2T2.setAttribute('x', '608'); ji2T2.setAttribute('y', bjiY + 24);
      ji2T2.setAttribute('text-anchor', 'middle'); ji2T2.setAttribute('font-size', '8.5');
      ji2T2.setAttribute('fill', '#9e9a94');
      ji2T2.textContent = "→ RIDs des Grades (Stat)";
      ji2.appendChild(ji2T2);
      svg.appendChild(ji2);

      // WHERE clause legend
      const legend = document.createElementNS(ns, 'text');
      legend.setAttribute('x', W / 2); legend.setAttribute('y', bjiY + 8);
      legend.setAttribute('text-anchor', 'middle'); legend.setAttribute('font-size', '9');
      legend.setAttribute('fill', '#a855f7'); legend.setAttribute('font-weight', '700');
      legend.textContent = "WHERE Level='HCSC' AND Dept='Stat'";
      svg.appendChild(legend);

      container.appendChild(svg);
    },
  };

  // ══════════════════════════════════════════════════════════
  // PARTITION RENDERER — Fragments horizontaux
  // ══════════════════════════════════════════════════════════
  const PartitionRenderer = {
    render(container) {
      container.innerHTML = '';
      container.style.cssText = 'display:block;padding:1rem 0; font-family:"Inter",sans-serif;';

      const header = document.createElement('div');
      header.style.cssText = 'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:1rem; margin-bottom:1.5rem;';
      header.innerHTML = `
        <h4 style="margin:0 0 0.5rem; color:#dedad5;">Comment fonctionne l'élimination de partitions (Partition Pruning) ?</h4>
        <p style="font-size:0.85rem; color:#9e9a94; margin:0 0 0.5rem; line-height:1.4;">
          <strong>Requête :</strong> <code>SELECT ... WHERE Level = 'HCSC' AND Dept = 'Stat'</code><br/>
          Techniquement, le SGBD ne lit pas toute la table puis filtre. Il utilise les métadonnées (le dictionnaire système) pour savoir dans quel fichier/bloc physique se trouvent les données. Les partitions ne correspondant pas aux filtres de la clause WHERE ne sont <strong>pas du tout chargées en mémoire depuis le disque</strong>. C'est ce qu'on appelle le <em>Partition Pruning</em>.
        </p>
      `;
      container.appendChild(header);

      // ── Student fragments ──
      const studentSection = document.createElement('div');
      studentSection.style.cssText = 'margin-bottom:1.5rem; padding-left:1rem; border-left:3px solid #5ba6a0;';
      studentSection.innerHTML = `
        <h4 style="margin:0 0 0.25rem; font-size:1rem; color:#5ba6a0;">1. Partitionnement Horizontal Primaire (Table Student)</h4>
        <p style="font-size:0.82rem; color:#9e9a94; margin:0 0 1rem;">
          <strong>Qu'est-ce que c'est ?</strong> C'est la table principale découpée selon <em>ses propres attributs</em>.<br/>
          <strong>Techniquement :</strong> Lors du <code>CREATE TABLE ... PARTITION BY LIST (Level)</code>, le SGBD a créé deux fichiers physiques distincts. Pour la requête, il ouvre uniquement le fichier <code>F₁_HCSC</code> car le prédicat le permet.
        </p>
      `;
      container.appendChild(studentSection);

      const studentGrid = document.createElement('div');
      studentGrid.style.cssText = 'display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem;';
      studentSection.appendChild(studentGrid);

      const fragments = SimDB.Fragments.Student;
      for (const frag of fragments) {
        const isActive = frag.name === 'F₁_HCSC';
        const div = document.createElement('div');
        div.style.cssText = `flex:1;min-width:180px;padding:1rem;border-radius:10px;
          border:1px solid ${isActive ? frag.color + '66' : 'rgba(255,255,255,0.1)'};
          background:${isActive ? frag.color + '18' : 'rgba(255,255,255,0.03)'};
          opacity:${isActive ? '1' : '0.4'};position:relative;transition:all 0.3s`;
        div.innerHTML = `
          <div style="font-weight:700;color:${isActive ? frag.color : '#9e9a94'};margin-bottom:0.4rem">${frag.name}</div>
          <div style="font-size:0.78rem;color:#9e9a94;margin-bottom:0.5rem">Critère: <code>${frag.predicate}</code></div>
          <div style="font-size:0.8rem;color:#dedad5">${frag.rids.length} tuple${frag.rids.length > 1 ? 's' : ''}</div>
          ${!isActive ? 
            '<div style="font-size:0.72rem;background:rgba(158,154,148,0.15);border-radius:4px;padding:4px 8px;margin-top:0.6rem;color:#9e9a94;display:inline-block">✕ Fichier ignoré (Resté sur disque)</div>' : 
            '<div style="font-size:0.72rem;background:rgba(110,231,183,0.15);border-radius:4px;padding:4px 8px;margin-top:0.6rem;color:#6ee7b7;display:inline-block">✓ Fichier chargé en RAM</div>'}`;
        studentGrid.appendChild(div);
      }

      // ── Grades fragments dérivés ──
      const gradesSection = document.createElement('div');
      gradesSection.style.cssText = 'margin-bottom:1.5rem; padding-left:1rem; border-left:3px solid #d67556;';
      gradesSection.innerHTML = `
        <h4 style="margin:0 0 0.25rem; font-size:1rem; color:#d67556;">2. Partitionnement Horizontal Dérivé (Table Grades)</h4>
        <p style="font-size:0.82rem; color:#9e9a94; margin:0 0 1rem;">
          <strong>Qu'est-ce que c'est ?</strong> La table enfant (Grades) est découpée selon une politique qui hérite du parent (Student), pour aligner physiquement les données jointes.<br>
          <strong>Comment est-ce possible ?</strong> Lors de l'insertion d'une note, le SGBD regarde le <code>Level</code> de l'étudiant correspondant pour savoir dans quel fichier la ranger. Résultat : pas besoin de faire de jointure pour savoir quelle partition Grades lire !
        </p>
      `;
      container.appendChild(gradesSection);

      const gradesGrid = document.createElement('div');
      gradesGrid.style.cssText = 'display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;';
      gradesSection.appendChild(gradesGrid);

      for (const frag of SimDB.Fragments.GradesFromStudent) {
        const isActive = frag.name === 'G_HCSC';
        const div = document.createElement('div');
        div.style.cssText = `flex:1;min-width:180px;padding:1rem;border-radius:10px;
          border:1px solid ${isActive ? frag.color + '66' : 'rgba(255,255,255,0.1)'};
          background:${isActive ? frag.color + '18' : 'rgba(255,255,255,0.03)'};
          opacity:${isActive ? '1' : '0.4'};transition:all 0.3s`;
        div.innerHTML = `
          <div style="font-weight:700;color:${isActive ? frag.color : '#9e9a94'};margin-bottom:0.4rem">${frag.name}</div>
          <div style="font-size:0.78rem;color:#9e9a94;margin-bottom:0.5rem">Alignée sur la partition : <code>${frag.derivedFrom}</code></div>
          <div style="font-size:0.8rem;color:#dedad5">${frag.rids.length} tuples</div>
          ${!isActive ? 
            '<div style="font-size:0.72rem;background:rgba(158,154,148,0.15);border-radius:4px;padding:4px 8px;margin-top:0.6rem;color:#9e9a94;display:inline-block">✕ Fichier ignoré</div>' : 
            '<div style="font-size:0.72rem;background:rgba(110,231,183,0.15);border-radius:4px;padding:4px 8px;margin-top:0.6rem;color:#6ee7b7;display:inline-block">✓ Fichier chargé</div>'}`;
        gradesGrid.appendChild(div);
      }

      // ── Stats tuples évités ──
      const stats = document.createElement('div');
      stats.style.cssText = `padding:1rem;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);
        border-radius:10px;font-size:0.85rem;color:#dedad5;display:flex;align-items:center;gap:1rem;`;
      stats.innerHTML = `
        <div>
          <strong style="color:#6ee7b7; display:block; margin-bottom:0.3rem; font-size:0.95rem;">Bilan de performance matériel :</strong>
          Student : <strong>${6 - 3} tuples évités au niveau I/O</strong> (seuls 3/6 tuples sont lus depuis le disque)<br>
          Grades  : <strong>${27 - 13} tuples évités au niveau I/O</strong> (seuls 13/27 tuples lus depuis le disque)<br>
          <em>Conclusion :</em> L'I/O (lecture disque) est très largement réduit comparé à un scan complet ou à l'utilisation d'un index traditionnel. 
        </div>`;
      container.appendChild(stats);
    },
  };

  // ══════════════════════════════════════════════════════════
  // WIDGET INIT — Appelé depuis section-ex1 et section-ex2
  // ══════════════════════════════════════════════════════════
  function initWidgets() {
    document.querySelectorAll('.sim-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrapper = btn.closest('[data-sim-mode]');
        if (!wrapper) return;
        const mode = wrapper.dataset.simMode;
        const panel = btn.nextElementSibling;
        if (!panel) return;
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
          if (mode === 'bji') BJIRenderer.render(panel);
          if (mode === 'partition') PartitionRenderer.render(panel);
        }
      });
    });
  }

  // Appel automatique si des widgets .sim-trigger sont présents
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    initWidgets();
  }

  // ── API publique ──
  return {
    renderQueryTree(container, rootNode, onNodeClick) {
      QueryTreeRenderer.render(container, rootNode, onNodeClick);
    },
    renderBJI(container) {
      BJIRenderer.render(container);
    },
    renderPartition(container) {
      PartitionRenderer.render(container);
    },
    renderERD(container) {
      ERDRenderer.render(container);
    },
    StepPlayer,
    QueryTreeRenderer,
    BJIRenderer,
    PartitionRenderer,
    ERDRenderer,
  };
})();

if (typeof module !== 'undefined') module.exports = { SimViz };
