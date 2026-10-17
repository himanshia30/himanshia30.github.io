/* ============================================================================
   Autonomous Exception Management — Exception Triage Demo — engine
   11 guided beats (0–10): processing console → Arjun's briefing.
   Story content lives in exceptions-data.js.

   Controls: on-screen player (Play / Pause, Next, Restart). Esc closes an overlay.
   Triage rows and alternative-option chips stay freely clickable once rendered.
   ============================================================================ */

(function () {
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function sysIcon(letter, small) { return '<span class="sysicon sys-' + letter + (small ? ' sm' : '') + '">' + letter + '</span>'; }
function usdC(n) {
  const a = Math.abs(n);
  if (a >= 1e6) { const v = a / 1e6; return '$' + (v >= 10 ? v.toFixed(1) : v.toFixed(2).replace(/0$/, '')) + 'M'; }
  if (a >= 1e3) { const v = a / 1e3; return '$' + (v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + 'K'; }
  return '$' + a;
}

/* ---------------------------- state ---------------------------- */

let beatIdx = -1;
let busy = false;
let tasks = XDATA.meta.tasksAtOpen;
let adjusted = false;

/* ---------------------------- chrome ---------------------------- */

function setClock(t) { $('#clock').textContent = t; }
function setStatus(text, busyDot) {
  $('#agent-dot').className = 'dot' + (busyDot ? ' busy' : '');
  $('#agent-status-text').innerHTML = text;
}
function updateBudget() {
  $('#budget-fill').style.width = (tasks / XDATA.meta.dailyTaskBudget * 100).toFixed(1) + '%';
  $('#budget-text').innerHTML = '<b>' + tasks.toLocaleString() + '</b><span class="lbl">/' + XDATA.meta.dailyTaskBudget.toLocaleString() + ' today</span>';
}
function addTasks(n) { tasks += n; updateBudget(); }

function toast(title, sub) {
  const t = el('div', 'toast', '<span class="avatar">A</span><div><div class="tt">' + esc(title) + '</div><div class="ts">' + esc(sub) + '</div></div>');
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 550); }, 3400);
}

function renderStatic() {
  const c = $('#connectors');
  XDATA.connectors.forEach(k => {
    c.appendChild(el('div', 'connector',
      sysIcon(k.icon) +
      '<div class="meta"><div class="name">' + esc(k.name) + '</div><div class="kind">' + esc(k.kind) + ' · MCP</div></div>' +
      '<div class="sync">' + esc(k.sync) + '</div>'));
  });
  updateBudget();
}

function switchView(name) {
  $('#view-processing').classList.toggle('active', name === 'processing');
  $('#view-briefing').classList.toggle('active', name === 'briefing');
}

function feed() { return $('#feed'); }
function scrollB() { const sc = $('#briefing-scroll'); sc.scrollTop = sc.scrollHeight; }

function cardLoader(container, label, ms, instant, prepend) {
  if (instant) return Promise.resolve();
  const loader = el('div', 'card-loader', '<span class="spinner"></span><span class="think-shimmer lbl">' + label + '</span>');
  if (prepend) container.insertBefore(loader, container.firstChild); else container.appendChild(loader);
  return sleep(ms).then(() => loader.remove());
}

async function countUp(node, target, ms, instant) {
  if (instant) { node.textContent = target.toLocaleString(); return; }
  const start = performance.now();
  return new Promise(res => {
    (function tick(now) {
      const p = Math.min(1, (now - start) / ms);
      node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(tick); else res();
    })(start);
  });
}

/* ---------------------------- beats ---------------------------- */

const BEATS = [

  /* 0 · Sense — the run finished; the agent already picked up the work */
  async function (instant) {
    const card = el('div', 'signal', sysIcon('M') +
      '<div class="body"><div class="head"><span class="src">PLANNER</span><span class="time">06:58</span></div>' +
      '<div class="title">Plan run complete — Enterprise scenario</div>' +
      '<div class="sub">Full net-change · <b>812 exceptions generated</b> across 6 exception types</div></div>');
    feed().appendChild(card);
    feed().appendChild(el('div', 'signal', sysIcon('W') +
      '<div class="body"><div class="head"><span class="src">AGENT</span><span class="time">06:58</span></div>' +
      '<div class="title">Exception Management Agent — picked up the work</div>' +
      '<div class="sub">Nobody launched it. Reading every exception from the plan, ERP, and supplier signals via MCP — the instant there was work to do.</div></div>'));
    setStatus('<b>Processing</b> · reading 812 exceptions', true);
    $('#feed-sub').textContent = 'Monday 07:02 — Arjun is not in yet';
  },

  /* 1 · Understand — 812 exceptions are not 812 problems.
     Sequence: count them → explain where every one went (ledger, one row at a
     time) → funnel 812 → 760 → 52 → 14 → the 14, ranked. */
  async function (instant) {
    setClock('Mon · 07:03');
    const T = XDATA.totals;
    const card = el('div', 'ccard',
      '<div class="chead">' + sysIcon('W', 1) + '<span class="t">Understanding the wall — clustering, not filtering</span>' +
      '<span class="sub">semantic graph · root-cause tracing · revenue ranking (Salesforce)</span></div>' +
      '<div class="cbody">' +
        '<div class="xcounter"><span class="num" id="xnum">0</span><span class="lbl">exceptions this run — <b>read one by one, the moment the engine finished</b></span></div>' +
        '<div class="xtypes">' + XDATA.exceptionTypes.map(t => '<span class="xtype"><b>' + t[1] + '</b> ' + esc(t[0]) + '</span>').join('') + '</div>' +
        '<div id="xledger"></div><div id="xfunnel"></div><div id="xclusters"></div>' +
      '</div>');
    await cardLoader(feed(), 'Reading exceptions from the plan, ERP and supplier signals…', 1600, instant, true);
    feed().insertBefore(card, feed().firstChild);
    await countUp($('#xnum'), T.exceptions, 2100, instant);
    if (!instant) await sleep(900);

    // the explained ledger — where did the 812 go?
    const lg = $('#xledger');
    lg.appendChild(el('div', 'appr-sec', '<div class="sh" style="margin-top:10px">Where did the 812 go? — every one accounted for</div>'));
    await cardLoader(lg, 'Walking the semantic graph — tracing which exceptions are symptoms of the same root cause…', 2400, instant);
    const ledger = el('div', 'ledger');
    lg.appendChild(ledger);
    for (const row of XDATA.clearing) {
      ledger.appendChild(el('div', 'ledger-row',
        '<span class="ln2">' + row.n + '</span>' +
        '<span class="lb"><b>' + esc(row.label) + '</b><span class="lx">' + esc(row.text) + '</span></span>'));
      if (!instant) await sleep(1600);   // one category at a time — let each be read
    }
    if (!instant) await sleep(1200);

    // the funnel — matches the ledger exactly, one collapse only
    $('#xfunnel').appendChild(el('div', 'funnel',
      '<div class="fstage hot"><div class="fv">812</div><div class="fl">exceptions</div></div><span class="farrow">→</span>' +
      '<div class="fstage ok"><div class="fv">760</div><div class="fl">cleared — every one explained</div></div><span class="farrow">→</span>' +
      '<div class="fstage act"><div class="fv">14</div><div class="fl">root problems to work</div></div>'));
    if (!instant) await sleep(1200);

    const cl = $('#xclusters');
    cl.appendChild(el('div', 'appr-sec', '<div class="sh" style="margin-top:12px">The 14 root issues — top 5, ranked by revenue &amp; service impact</div>'));
    const list = el('div', 'clusters');
    cl.appendChild(list);
    for (const c of XDATA.clusters) {
      list.appendChild(el('div', 'cluster',
        '<span class="rank">' + c.id + '</span>' +
        '<span class="cn">' + esc(c.name) + '</span><span class="cx">' + esc(c.detail) + '</span>' +
        '<span class="cr">' + usdC(c.revenue) + ' at risk <span class="prov crm">CRM</span></span>'));
      if (!instant) await sleep(600);
    }
    cl.appendChild(el('div', 'more-note', esc(XDATA.clustersMore)));
    addTasks(14);
    if (!instant) toast('812 exceptions → 14 root issues', 'One disruption showing up in five places is one problem, not five');
  },

  /* 2 · Investigate — a worker, not a filter
     Story arithmetic, made visible: 14 issues → 3 workstreams (6 + 4 + 4);
     one runtime worksheet per issue, counted live up to 14. */
  async function (instant) {
    setClock('Mon · 07:11');
    const card = el('div', 'ccard',
      '<div class="chead"><span class="avatar">A</span><span class="t">Investigating all 14 issues at once</span>' +
      '<span class="sub">agents + workflows · specialists from reusable skills · Haiku 4.5 (auto-selected)</span></div>' +
      '<div class="cbody">' +
        '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">' + esc(XDATA.delegation) + '</div>' +
        '<div class="ws-banner" style="margin-bottom:12px">✦ Runtime investigation worksheets: <b>&nbsp;<span id="wsn">0</span> of 14</b> &nbsp;— one per root issue, none pre-authored</div>' +
        '<div class="lanes"></div></div>');
    await cardLoader(feed(), 'Lead agent delegating — 14 issues → 3 workstreams (supply · capacity · demand)…', 2000, instant, true);
    feed().insertBefore(card, feed().firstChild);
    if (!instant) await sleep(1500);   // let the delegation sentence be read before lanes start
    const lanesEl = card.querySelector('.lanes');

    let wsCount = 0;
    const bumpWs = n => { wsCount += n; $('#wsn').textContent = wsCount; };

    const animateLane = async (agent, startDelay) => {
      if (!instant && startDelay) await sleep(startDelay);
      const lane = el('div', 'lane',
        '<div class="lh"><span class="avatar" style="background:linear-gradient(135deg,#5b7ad4,#7c5cff)">A</span><div><div class="ln">' + esc(agent.name) + '</div><div class="lm">' + agent.model + ' · <b>' + agent.count + ' issues</b></div></div></div>' +
        '<div class="skills">' + agent.skills.map(s => '<span class="skill">' + s + '</span>').join('') + '</div>' +
        '<div class="filter" style="font-size:10px;margin-bottom:8px;width:fit-content">owns: ' + esc(agent.assigned) + '</div>' +
        '<div class="lane-bar"><i></i></div><div class="lsteps"></div>');
      lanesEl.appendChild(lane);
      const steps = lane.querySelector('.lsteps');
      const bar = lane.querySelector('.lane-bar i');
      let done = 0;
      for (const s of agent.steps) {
        const row = el('div', 'lstep', '<span class="spinner"></span><span>' + esc(s.text) + '</span>');
        steps.appendChild(row);
        if (!instant) await sleep(1400 + Math.random() * 600);
        done++;
        bar.style.width = Math.round(done / agent.steps.length * 100) + '%';
        bumpWs(s.ws);
        row.innerHTML = '<span style="color:var(--low);font-weight:700">✓</span><span>' + esc(s.text.replace(/…$/, '')) + '</span>';
      }
      if (!instant) await sleep(400);
      const finding = el('div', 'finding clickable',
        '<b>Finding:</b> ' + esc(agent.finding) +
        '<span class="open-inv">Open investigation →</span>');
      finding.addEventListener('click', () => openInv(agent));
      lane.appendChild(finding);
    };
    // lanes start one by one (you can SEE the delegation), then run in parallel
    await Promise.all(XDATA.investigators.map((a, i) => animateLane(a, i * 700)));
    addTasks(21);
    if (!instant) toast('14 issues investigated — in parallel', 'The diagnostic work Arjun does by hand, all at once');
  },

  /* 3 · Resolve — one continuous pipeline the audience can follow:
     14 issues → 41 candidates → 29 survive → 14 recommendations, plus one
     worked example (RI-01) so the numbers feel concrete. */
  async function (instant) {
    setClock('Mon · 07:19');
    const S = XDATA.solver;
    const card = el('div', 'ccard',
      '<div class="chead">' + sysIcon('M', 1) + '<span class="t">Generating &amp; testing resolutions — simulation-first</span>' +
      '<span class="sub">nothing becomes a recommendation until it survives simulation</span></div>' +
      '<div class="cbody">' +
        '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">' + esc(S.intro) + '</div>' +
        '<div class="funnel" id="sfunnel"></div><div id="snotes"></div>' +
        '<div class="solver-foot" style="margin-top:12px">' +
          '<span class="solver-badge">◆ Planning solvers · ' + S.candidates + ' scenarios — one per candidate</span>' +
          '<span>Hard constraints: ' + S.constraints.join(' · ') + '</span>' +
        '</div></div>');
    await cardLoader(feed(), 'Collecting candidate fixes from the 3 investigators…', 1800, instant, true);
    feed().insertBefore(card, feed().firstChild);
    const f = $('#sfunnel'), notes = $('#snotes');
    const pause = ms => instant ? Promise.resolve() : sleep(ms);

    // stage 1: where the candidates come from
    f.appendChild(el('div', 'fstage', '<div class="fv">14</div><div class="fl">root issues investigated</div>'));
    await pause(900);
    f.appendChild(el('span', 'farrow', '→'));
    f.appendChild(el('div', 'fstage hot', '<div class="fv" id="candn">0</div><div class="fl">candidate fixes · ≈3 per issue</div>'));
    await countUp($('#candn'), S.candidates, 1500, instant);
    await pause(700);

    // the solver pass, visible
    if (!instant) {
      const sim = el('div', 'rstep', '<span class="st"><span class="spinner"></span></span><span class="tool">planner.run_solver</span><span>Simulating all 41 — each in its own scenario, so a fix here can’t break a commitment there</span>');
      notes.appendChild(sim);
      await sleep(2400);
      sim.remove();
    }

    // stage 2: constraints filter
    f.appendChild(el('span', 'farrow', '→'));
    f.appendChild(el('div', 'fstage', '<div class="fv">' + S.survived + '</div><div class="fl">survive hard constraints</div>'));
    notes.appendChild(el('div', 'appr-note', esc(S.rejectedNote)));
    await pause(1300);

    // stage 3: best per issue = recommendation
    f.appendChild(el('span', 'farrow', '→'));
    f.appendChild(el('div', 'fstage act', '<div class="fv">' + S.recommendations + '</div><div class="fl">recommendations — best per issue</div>'));
    notes.appendChild(el('div', 'appr-note', esc(S.survivorsNote)));
    await pause(1100);

    // one issue, end to end — makes the pipeline concrete
    notes.appendChild(el('div', 'resolution', '<div class="rh">One issue through the pipeline</div><div class="rt">' + esc(S.example) + '</div>'));
    addTasks(18);
  },

  /* 4 · Staged — the briefing is ready before Arjun sits down */
  async function (instant) {
    setClock('Mon · 07:22');
    const T = XDATA.totals;
    const card = el('div', 'ccard',
      '<div class="chead"><span class="avatar">A</span><span class="t">Run triaged — briefing queued for Arjun</span>' +
      '<span class="sub">07:22 · 24 minutes after the plan run finished · unattended</span></div>' +
      '<div class="cbody">' +
        '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">The 14 recommendations split by risk: <b>6 low-risk ones auto-applied</b> within Arjun’s autonomy level (≤$25K, no strategic accounts) — <b>8 need his judgment</b>.</div>' +
        '<div class="funnel">' +
        '<div class="fstage ok"><div class="fv">' + T.cleared + '</div><div class="fl">exceptions cleared</div></div>' +
        '<div class="fstage ok"><div class="fv">' + T.staged + '</div><div class="fl">staged &amp; applied (of 14)</div></div>' +
        '<div class="fstage hot"><div class="fv">' + T.review + '</div><div class="fl">need Arjun’s call (of 14)</div></div>' +
      '</div></div>');
    feed().insertBefore(card, feed().firstChild);
    const link = el('div', 'ccard');
    link.appendChild(el('div', 'cp-link',
      '<span class="avatar">A</span>' +
      '<div><div class="t">08:05 — Arjun sits down with his coffee and opens the planning model</div>' +
      '<div class="s">normally this is where the Monday grind begins</div></div>' +
      '<span class="go">Open Arjun’s briefing →</span>'));
    link.querySelector('.cp-link').addEventListener('click', () => { if (beatIdx === 4 && !busy) advance(); });
    feed().insertBefore(link, feed().firstChild);
    setStatus('<b>Briefing ready</b> · waiting for Arjun', false);
    if (!instant) toast('Briefing ready', '760 cleared · 6 staged · 8 need a decision');
  },

  /* 5 · Triage & brief — Arjun's single presentation-ready view */
  async function (instant) {
    switchView('briefing');
    setClock('Mon · 08:05');
    setStatus('<b>Briefing open</b> · with Arjun', false);
    const T = XDATA.totals;
    const B = $('#briefing-inner');

    B.appendChild(el('div', 'brief-hero',
      '<div class="bt"><span class="avatar">A</span> Daily briefing · Monday · prepared unattended</div>' +
      '<h2>Good morning, Arjun. 812 exceptions this run — I cleared 760.</h2>' +
      '<div class="bs">Grouped into <b>14 root issues</b>. <b>6 are resolved and staged</b> (applied within your autonomy level), and <b>8 need your call</b> — each with a recommendation, confidence, reasoning, and trade-offs.</div>' +
      '<div class="bstats">' +
        '<div class="stat"><div class="v">' + T.exceptions + '</div><div class="l">exceptions read</div></div>' +
        '<div class="stat"><div class="v" style="color:var(--low)">' + T.cleared + '</div><div class="l">cleared · traceable</div></div>' +
        '<div class="stat"><div class="v" style="color:var(--low)">' + T.staged + '</div><div class="l">staged &amp; applied</div></div>' +
        '<div class="stat"><div class="v" style="color:var(--alert-red)">' + T.review + '</div><div class="l">for your review</div></div>' +
      '</div>'));
    if (!instant) await sleep(900);

    B.appendChild(el('div', 'memory-chip',
      '<span class="mi">◆</span><div><b>Framed your way:</b> ' + esc(XDATA.memory) + '</div>'));
    scrollB();
    if (!instant) await sleep(900);

    const staged = el('div', 'ccard',
      '<div class="chead"><span class="t">Resolved &amp; staged — 6</span><span class="sub">auto-applied within your autonomy level · reversible</span></div>' +
      '<div class="cbody" style="padding:6px 10px">' +
      XDATA.staged.map(s => '<div class="staged-row"><span class="ok">✓</span><span>' + esc(s.text) + '</span><span class="rev">' + esc(s.revenue) + '</span></div>').join('') +
      '</div>');
    B.appendChild(staged); scrollB();
    if (!instant) await sleep(1000);

    B.appendChild(el('div', 'appr-sec', '<div class="sh" style="margin:6px 2px">Needs your call — 8 · sorted by revenue at risk</div>'));
    const q = el('div'); q.id = 'queue';
    B.appendChild(q);
    for (const it of XDATA.review) {
      q.appendChild(triageRow(it)); scrollB();
      if (!instant) await sleep(420);
    }

    const bar = el('div', 'approve-bar',
      '<button class="btn-primary" id="btn-approve-all">Approve 7</button>' +
      '<span class="an2" id="approve-note"><b>7</b> recommended actions ready · <b>1 held</b> (never-do) · adjust any before approving</span>');
    B.appendChild(bar);
    $('#btn-approve-all').addEventListener('click', () => { if ((beatIdx === 7 || beatIdx === 6 || beatIdx === 5) && !busy) { beatIdx = 7; advance(); } });
    scrollB();
    if (!instant) { await sleep(700); $('#briefing-scroll').scrollTo({ top: 0, behavior: 'smooth' }); }
    else $('#briefing-scroll').scrollTop = 0;
  },

  /* 6 · Explain — open the top issue */
  async function (instant) {
    const row = $('#queue .triage');
    row.classList.add('open');
    row.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'center' });
  },

  /* 7 · Adjust — Arjun changes one recommendation */
  async function (instant) {
    const rows = document.querySelectorAll('#queue .triage');
    const idx = XDATA.review.findIndex(r => r.id === XDATA.adjust.item);
    const row = rows[idx];
    row.classList.add('open');
    row.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'center' });
    if (!instant) await sleep(1100);
    const alts = row.querySelectorAll('.talt');
    alts.forEach(a => a.classList.remove('sel'));
    alts[XDATA.adjust.altIndex].classList.add('sel');
    row.querySelector('.th2').appendChild(el('span', 'adjusted', 'ADJUSTED BY ARJUN'));
    adjusted = true;
    if (!instant) toast('RI-03 adjusted', esc(XDATA.adjust.note));
  },

  /* 8 · Act — approve; writebacks execute; never-do stays held */
  async function (instant) {
    setClock('Mon · 08:08');
    document.querySelectorAll('#queue .triage').forEach((row, i) => {
      const it = XDATA.review[i];
      row.classList.remove('open');
      row.classList.add('done-row');
      const st = el('span', 'tdone', it.held ? '⏸ HELD — yours' : '✓ approved');
      row.querySelector('.th2').appendChild(st);
    });
    const bar = $('#btn-approve-all').parentElement;
    bar.innerHTML = '<span style="color:var(--low);font-weight:750">✓ 7 approved by Arjun · 08:08</span><span class="an2">1 held for explicit human action (never-do list)</span>';

    const B = $('#briefing-inner');
    if (!instant) {
      const loader = el('div', 'card-loader', '<span class="spinner"></span><span class="think-shimmer lbl">Executing — writing revised dates &amp; quantities to ERP and the plan, notifying account teams…</span>');
      B.appendChild(loader);
      loader.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(1500); loader.remove();
    }
    const card = el('div', 'ccard',
      '<div class="chead"><span class="t">Execution — Monday run resolutions</span><span class="sub">bidirectional writeback via MCP · gated by your autonomy settings</span></div>' +
      '<div class="cbody" style="padding:6px 8px"></div>');
    B.appendChild(card);
    const body = card.querySelector('.cbody');
    XDATA.execution.forEach(x => {
      body.appendChild(el('div', 'exec-row',
        sysIcon(x.icon, 1) + '<span class="act">' + esc(x.action) + '</span>' +
        '<span class="ref">' + esc(x.ref) + '</span><span class="st q">queued</span>'));
    });
    card.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'center' });
    const rows = [...body.querySelectorAll('.exec-row')];
    for (let i = 0; i < rows.length; i++) {
      const st = rows[i].querySelector('.st');
      if (!instant) { st.className = 'st run'; st.textContent = 'executing…'; await sleep(950); }
      if (XDATA.execution[i].held) { st.className = 'st held'; st.textContent = '⏸ held'; }
      else { st.className = 'st ok'; st.textContent = '✓ done'; }
    }
    B.appendChild(el('div', 'appr-note', esc(XDATA.autoNote)));
    addTasks(15);
    setStatus('<b>Executed</b> · outcome tracking armed', false);
    if (!instant) toast('Queue cleared — 08:08', '5 writebacks · 2 held for Arjun · all logged');
  },

  /* 9 · Govern & learn — the reframe */
  async function (instant) {
    setClock('Mon · 08:09');
    const B = $('#briefing-inner');
    const card = el('div', 'ccard');
    card.appendChild(el('div', 'cp-link',
      '<span class="sysicon sys-W">◈</span>' +
      '<div><div class="t">Monday, 08:09 — the queue is cleared before the first meeting</div>' +
      '<div class="s">every cleared exception traceable · consumption metered · outcomes feed the learning loop</div></div>' +
      '<span class="go">Open Control Plane →</span>'));
    card.querySelector('.cp-link').addEventListener('click', () => { if (beatIdx === 9 && !busy) advance(); else openOverlay('cp'); });
    B.appendChild(card);
    card.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'center' });
  },

  /* 10 · Control Plane */
  async function (instant) {
    openOverlay('cp');
  }
];

/* ---------------------------- triage row ---------------------------- */

function triageRow(it) {
  const row = el('div', 'triage' + (it.held ? ' held' : ''),
    '<div class="th2">' +
      '<span class="rank">' + it.id + '</span>' +
      '<div><div class="tt2">' + esc(it.title) + '</div><div class="tsub">' + esc(it.sub) + '</div></div>' +
      '<span class="trev">' + usdC(it.revenue) + '</span>' +
      (it.confidence ? '<span class="tconf">' + it.confidence + '%</span>' : '<span class="blocked-pill">NEVER-DO</span>') +
      '<span class="chev">▾</span>' +
    '</div>' +
    '<div class="tbody2">' +
      '<div class="treco"><b>' + (it.held ? 'Held: ' : 'Recommended: ') + '</b>' + esc(it.reco) +
      (it.precedent ? ' <span class="opt-precedent">◆ ' + esc(it.precedent) + '</span>' : '') + '</div>' +
      '<div class="twhy">' + esc(it.why) + '</div>' +
      (it.alts.length ? '<div class="talts">' + it.alts.map(a => '<span class="talt' + (a.sel ? ' sel' : '') + '">' + esc(a.label) + '</span>').join('') + '</div>' : '') +
    '</div>');
  row.querySelector('.th2').addEventListener('click', () => row.classList.toggle('open'));
  row.querySelectorAll('.talt').forEach(a => a.addEventListener('click', e => {
    e.stopPropagation();
    row.querySelectorAll('.talt').forEach(x => x.classList.remove('sel'));
    a.classList.add('sel');
  }));
  return row;
}

/* ---------------------------- overlay ---------------------------- */

function openOverlay(name) {
  const ov = $('#ov-' + name);
  if (!ov.dataset.built) { OVERLAYS[name](); ov.dataset.built = '1'; }
  ov.classList.add('open');
}

/* investigation drill-in — rebuilt per investigator on open (free interaction) */
function openInv(agent) {
  const ov = $('#ov-inv');
  $('#ov-inv .panel-h .t').textContent = 'Investigation — ' + agent.name + ' · ' + agent.count + ' issues';
  $('#ov-inv .panel-b').innerHTML =
    agent.detail.map(d =>
      '<div class="inv-issue">' +
        '<div class="ih"><span class="rank">' + d.id + '</span><span class="t">' + esc(d.name) + '</span><span class="rev">' + d.revenue + ' at risk</span></div>' +
        '<div class="inv-row"><span class="k">What changed</span><span class="v">' + esc(d.changed) + '</span></div>' +
        '<div class="inv-row"><span class="k">What’s driving it</span><span class="v">' + esc(d.driving) + '</span></div>' +
        '<div class="inv-row"><span class="k">What’s downstream</span><span class="v">' + esc(d.downstream) + '</span></div>' +
        (d.note ? '<div class="inv-note">→ ' + esc(d.note) + '</div>' : '') +
      '</div>').join('') +
    '<div class="inv-minor">' + esc(agent.minor) + '</div>';
  ov.classList.add('open');
}
function closeOverlays() { document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); }

const OVERLAYS = {
  cp() {
    const b = $('#ov-cp .panel-b');
    b.innerHTML =
      '<div class="closing-strip">' + XDATA.closing.stats.map(s =>
        '<div class="cs"><div class="v">' + esc(s.value) + '</div><div class="l">' + esc(s.label) + '</div></div>').join('') + '</div>' +
      '<div class="cp-grid">' +
        '<div class="cp-sec"><div class="h">Audit trail — this run · why every exception was closed</div><div class="b">' +
          XDATA.audit.map(a =>
            '<div class="audit-row"><span class="at">' + a.time + '</span>' +
            '<span class="actor"><span class="' + (a.actor === 'Agent' ? 'actor-swan' : 'actor-user') + '">' + a.actor + '</span></span>' +
            '<span class="e">' + esc(a.entry) + '</span>' +
            (a.rollback ? '<span class="rb">↩ roll back</span>' : '') + '</div>').join('') +
        '</div></div>' +
        '<div>' +
          '<div class="cp-sec" style="margin-bottom:16px"><div class="h">Consumption — this run</div><div class="b">' +
            '<div class="cp-stat"><span class="k">Tasks used</span><span class="v">' + XDATA.budget.runTasks + '</span></div>' +
            '<div class="cp-stat"><span class="k">Estimated cost</span><span class="v">$' + XDATA.budget.estCost.toFixed(2) + '</span></div>' +
            '<div class="cp-stat"><span class="k">Daily budget</span><span class="v">' + tasks + ' / ' + XDATA.meta.dailyTaskBudget + '</span></div>' +
            '<div class="cp-budget-bar"><i style="width:' + (tasks / XDATA.meta.dailyTaskBudget * 100) + '%"></i></div>' +
          '</div></div>' +
          '<div class="cp-sec" style="margin-bottom:16px"><div class="h">Learning loop — getting sharper at YOUR exceptions</div><div class="b">' +
            XDATA.learning.map(l => '<div class="cp-stat"><span class="k">' + esc(l.k) + '</span><span class="v">' + esc(l.v) + '</span></div>').join('') +
          '</div></div>' +
          '<div class="cp-sec"><div class="h">Agent SLAs</div><div class="b">' +
            XDATA.sla.map(s => '<div class="cp-stat"><span class="k">' + esc(s.label) + '</span><span class="v">' + esc(s.value) + '</span></div>').join('') +
          '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="takeaway">' + XDATA.closing.takeaway + '</div>';
  }
};

/* ---------------------------- machine ---------------------------- */

async function runBeat(i, instant) {
  if (busy) return;
  busy = true;
  try { await BEATS[i](instant); beatIdx = i; } finally { busy = false; }
  updateHUD();
}

async function advance() {
  if (busy) return;
  if (beatIdx + 1 >= BEATS.length) return;
  await runBeat(beatIdx + 1, false);
}

async function jumpTo(n) {
  for (let i = 0; i <= n && i < BEATS.length; i++) {
    if (i === 10 && i !== n) { beatIdx = i; continue; }
    await runBeat(i, true);
  }
  updateHUD();
}

/* ---------------------------- guided player ---------------------------- */
/* The on-screen player (js/player.js) drives the story: Play / Pause, Next, Restart. */

const CAPTIONS = {
  0: 'Cluster 812 exceptions into 14 issues', 1: 'Investigators work in parallel',
  2: 'Solver: 41 candidates, 29 survive', 3: 'Staging summary',
  4: 'Open the planner’s briefing', 5: 'Expand the top issue',
  6: 'The planner adjusts one recommendation', 7: 'Approve 7 recommendations',
  8: 'The reframe', 9: 'Open the Control Plane', 10: 'Demo complete'
};

function updateHUD() {
  if (window.DemoPlayer) DemoPlayer.update(beatIdx, CAPTIONS[beatIdx]);
}

async function step() {
  if (busy) return false;
  if (beatIdx + 1 >= BEATS.length) return false;
  closeOverlays();
  await advance();
  return true;
}

window.DemoApp = { step, last: BEATS.length - 1, isBusy: () => busy, beat: () => beatIdx };

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay .x').forEach(x => x.addEventListener('click', closeOverlays));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeOverlays(); }));

  renderStatic();
  setClock(XDATA.meta.clockStart);
  setStatus('<b>Monitoring</b> · waiting for the plan run', false);

  const p = new URLSearchParams(location.search);
  if (p.has('nofx')) document.documentElement.classList.add('nofx');
  const n = parseInt(p.get('beat'), 10);
  const openAfter = p.get('open');
  if (!isNaN(n) && n >= 0) {
    jumpTo(Math.min(n, BEATS.length - 1)).then(() => { if (openAfter && OVERLAYS[openAfter]) openOverlay(openAfter); });
  } else { runBeat(0, false); }
});

})();
