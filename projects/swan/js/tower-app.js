/* ============================================================================
   SWAN Control Tower Demo — engine
   Fleet-level vision demo: 11 guided beats (0–10).
   Story content lives in tower-data.js; this file rarely needs edits.

   Controls: on-screen player (Play / Pause, Next, Restart). Esc closes an overlay.
   ============================================================================ */

(function () {
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function sysIcon(letter, small) { return '<span class="sysicon sys-' + letter + (small ? ' sm' : '') + '">' + letter + '</span>'; }

/* Databricks icon color (not in base set) */
const style = document.createElement('style');
style.textContent = '.sys-D { background: #e8442e; }';
document.head.appendChild(style);

/* ---------------------------- state ---------------------------- */

let beatIdx = -1;
let busy = false;
const today = Object.assign({}, TDATA.today);
let tasks = TDATA.meta.tasksAtOpen;

/* ---------------------------- chrome & rails ---------------------------- */

function setClock(t) { $('#clock').textContent = t; }
function setFleetChip(text, busyDot) {
  $('#agent-dot').className = 'dot' + (busyDot ? ' busy' : '');
  $('#agent-status-text').innerHTML = text;
}
function updateBudget() {
  $('#budget-fill').style.width = (tasks / TDATA.meta.dailyTaskBudget * 100).toFixed(1) + '%';
  $('#budget-text').innerHTML = '<b>' + tasks.toLocaleString() + '</b><span class="lbl">/' + TDATA.meta.dailyTaskBudget.toLocaleString() + ' today</span>';
}
function addTasks(n) { tasks += n; updateBudget(); renderStats(); }

function renderStats() {
  $('#st-signals').textContent = today.signals.toLocaleString();
  $('#st-auto').textContent = today.autoResolved;
  $('#st-esc').textContent = today.escalated + (today.awaitingHuman ? ' · ' + today.awaitingHuman + ' awaiting you' : '');
  $('#st-esc').classList.toggle('red', today.awaitingHuman > 0);
  $('#st-tasks').textContent = tasks + ' / ' + TDATA.meta.dailyTaskBudget;
  $('#st-bar').style.width = (tasks / TDATA.meta.dailyTaskBudget * 100) + '%';
  $('#st-sla').textContent = today.slaHealth;
}

function agentChip(agentId) {
  const a = TDATA.fleet.find(x => x.id === agentId);
  return '<span class="agent-chip" style="color:' + a.color + ';background:' + a.color + '1a">' + esc(a.name.replace(' Agent', '')) + '</span>';
}

function setTile(agentId, state, statusText) {
  const t = $('#at-' + agentId);
  t.className = 'atile ' + state;
  t.querySelector('.astxt').textContent = statusText;
}

function bumpTile(agentId, dSignals, dActions) {
  const a = TDATA.fleet.find(x => x.id === agentId);
  a.signals += dSignals; a.actions += dActions;
  const t = $('#at-' + agentId);
  t.querySelector('.n-sig').textContent = a.signals;
  t.querySelector('.n-act').textContent = a.actions;
}

function toast(title, sub) {
  const t = el('div', 'toast', '<span class="avatar">S</span><div><div class="tt">' + esc(title) + '</div><div class="ts">' + esc(sub) + '</div></div>');
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 550); }, 3400);
}

function renderStatic() {
  // connector strip
  $('#tw-connectors').innerHTML = TDATA.connectors.map(c => sysIcon(c.icon)).join('') +
    '<span style="font-size:10.5px;color:var(--text-3);margin-left:4px">6 systems · live</span>';
  // fleet tiles
  const f = $('#fleet');
  TDATA.fleet.forEach(a => {
    const t = el('div', 'atile watching',
      '<div class="ah"><span class="avatar" style="background:' + a.color + '">' + a.letter + '</span>' +
      '<div><div class="an">' + esc(a.name) + '</div><div class="ac">' + esc(a.scope) + '</div></div>' +
      '<span class="apill ' + a.autonomy + '">' + a.autonomy + '</span></div>' +
      '<div class="ast"><span class="sdot"></span><span class="astxt">watching</span></div>' +
      '<div class="anums"><span><b class="n-sig">' + a.signals + '</b> signals today</span><span><b class="n-act">' + a.actions + '</b> actions</span></div>');
    t.id = 'at-' + a.id;
    f.appendChild(t);
  });
  updateBudget();
  renderStats();
}

/* ---------------------------- feed helpers ---------------------------- */

function feed() { return $('#feed'); }

function tkRow(item) {
  return el('div', 'tk',
    '<span class="tkt">' + item.time + '</span>' + agentChip(item.agent) +
    '<span>' + esc(item.text) + '</span>' +
    '<span class="tag ' + item.tag + '">' + (item.tag === 'auto' ? 'auto · logged' : item.tag === 'watch' ? 'monitoring' : 'escalated') + '</span>');
}

function execRows(container, items) {
  items.forEach(x => {
    container.appendChild(el('div', 'exec-row',
      sysIcon(x.icon, 1) + '<span class="act">' + esc(x.action) + '</span>' +
      '<span class="ref">' + esc(x.ref) + '</span><span class="st q">queued</span>'));
  });
  return [...container.querySelectorAll('.exec-row')];
}

async function tickExec(rows, instant) {
  for (const r of rows) {
    const st = r.querySelector('.st');
    if (!instant) { st.className = 'st run'; st.textContent = 'executing…'; await sleep(480); }
    st.className = 'st ok'; st.textContent = '✓ done';
  }
}

/* ---------------------------- beats ---------------------------- */

const BEATS = [

  /* 0 · Watch — opening state */
  async function (instant) {
    TDATA.ambientOpen.forEach(i => feed().appendChild(tkRow(i)));
    $('#feed-sub').textContent = 'the fleet has been working since midnight — nobody is watching the screens';
  },

  /* 1 · Watch — the platform never stops */
  async function (instant) {
    for (const i of TDATA.ambientMore) {
      feed().insertBefore(tkRow(i), feed().firstChild);
      today.signals += 11; renderStats();
      if (!instant) await sleep(650);
    }
    bumpTile('inventory', 3, 1); bumpTile('risk', 2, 0); bumpTile('supply', 4, 0);
    setClock('Thu · 06:33');
  },

  /* 2 · Detect — incident A arrives, Demand Agent wakes itself */
  async function (instant) {
    setClock('Thu · 06:41');
    const A = TDATA.incidentA;
    const card = el('div', 'ccard',
      '<div class="chead">' + sysIcon(A.icon, 1) + '<span class="t">' + esc(A.title) + '</span>' +
      '<span class="sub">' + A.time + ' · ' + esc(A.source) + ' · ' + A.id + '</span></div>' +
      '<div class="cbody"><div style="font-size:12.5px;color:var(--text-2);margin-bottom:9px">' + esc(A.detail) + '</div>' +
      '<div class="ws-toolbar" style="margin:0">' + A.context.map(c => '<span class="filter">' + esc(c) + '</span>').join('') + '</div>' +
      '<div id="incA-flow"></div><div id="incA-routing"></div></div>');
    card.id = 'card-incA';
    feed().insertBefore(card, feed().firstChild);
    setTile('demand', 'investigating', 'investigating INC-0612 · context via semantic graph');
    bumpTile('demand', 1, 0);
    today.signals += 1; renderStats(); addTasks(6);
    setFleetChip('<b>1 incident</b> · Demand Agent investigating', true);
    if (!instant) toast('Demand Agent woke itself', 'Threshold breach · context assembled in 1.6 min');
  },

  /* 3 · Reason — specialists disagree */
  async function (instant) {
    const cf = TDATA.incidentA.conflict;
    setTile('supply', 'investigating', 'countering: cost impact of INC-0612 plan');
    const flow = $('#incA-flow');
    const props = el('div', 'proposals');
    flow.appendChild(el('div', 'appr-sec', '<div class="sh" style="margin-top:12px">Agents + workflows — specialists in parallel</div>'));
    flow.appendChild(props);
    const mk = (p) => el('div', 'proposal',
      '<div class="ph">' + agentChip(p.agent) + '<span style="color:var(--text-3);font-weight:500;font-size:10.5px">' + esc(p.goal) + '</span></div>' +
      '<div class="pt">' + esc(p.text) + '</div>' +
      '<div class="pn">' + p.nums.map(n => '<span>' + n[0] + ' <b>' + n[1] + '</b></span>').join('') + '</div>');
    props.appendChild(mk(cf.a));
    props.appendChild(el('div', 'vs', 'VS'));
    if (!instant) await sleep(900);
    props.appendChild(mk(cf.b));
    addTasks(9);
    if (!instant) toast('Conflict detected', 'Demand wants service · Supply wants cost — lead agent arbitrating');
  },

  /* 4 · Reason — lead resolves the conflict with trusted math */
  async function (instant) {
    const cf = TDATA.incidentA.conflict;
    const flow = $('#incA-flow');
    if (!instant) { const sp = el('div', 'rstep', '<span class="st"><span class="spinner"></span></span><span class="tool">planner.run_solver</span><span>Simulating 3 scenarios — Supply Planning solver</span>'); flow.appendChild(sp); await sleep(1600); sp.remove(); }
    flow.appendChild(el('div', 'resolution',
      '<div class="rh">⚖ Resolved by lead agent — not punted to a human</div>' +
      '<div class="rt">' + esc(cf.resolution.text) + '</div>' +
      '<div class="rn">' + cf.resolution.nums.map(n => '<span>' + n[0] + ' <b>' + n[1] + '</b></span>').join('') +
      '<span class="solver-badge">◆ Planning solver · 0 violations</span></div>'));
    setTile('demand', 'acting', 'plan agreed · preparing writeback');
    setTile('supply', 'acting', 'plan agreed · preparing writeback');
    addTasks(8);
  },

  /* 5 · Act — below threshold: it just acts */
  async function (instant) {
    setClock('Thu · 06:45');
    const A = TDATA.incidentA;
    const r = $('#incA-routing');
    r.appendChild(el('div', 'appr-sec', '<div class="sh" style="margin-top:12px">Decision routing</div>'));
    r.appendChild(el('div', 'routing',
      '<span class="policy">' + esc(A.routing.policy) + '</span>' +
      '<span style="font-size:11.5px;color:var(--text-2)">' + esc(A.routing.check) + '</span>' +
      '<span class="verdict auto">AUTO-EXECUTE</span>'));
    const box = el('div', '', '');
    r.appendChild(box);
    const rows = execRows(box, A.execution);
    await tickExec(rows, instant);
    r.appendChild(el('div', 'appr-note', esc(TDATA.neverDo)));
    today.autoResolved += 1; renderStats(); addTasks(5);
    bumpTile('demand', 0, 1); bumpTile('supply', 0, 1);
    setTile('demand', 'watching', 'watching'); setTile('supply', 'watching', 'watching');
    setFleetChip('<b>All quiet</b> · 42 auto-resolved today', false);
    if (!instant) toast('INC-0612 auto-resolved', 'Within policy · 4 writebacks · logged & reversible');
  },

  /* 6 · Detect #2 — high impact: the tower knows its limits */
  async function (instant) {
    setClock('Thu · 06:52');
    const B = TDATA.incidentB;
    const card = el('div', 'ccard',
      '<div class="chead">' + sysIcon(B.icon, 1) + '<span class="t">' + esc(B.title) + '</span>' +
      '<span class="sub">' + B.time + ' · ' + esc(B.source) + ' · ' + B.id + '</span></div>' +
      '<div class="cbody"><div style="font-size:12.5px;color:var(--text-2);margin-bottom:9px">' + esc(B.detail) + '</div>' +
      '<div class="ws-toolbar" style="margin:0 0 10px">' + B.context.map(c => '<span class="filter">' + esc(c) + '</span>').join('') + '</div>' +
      '<div class="routing"><span class="policy">' + esc(B.routing.policy) + '</span>' +
      '<span style="font-size:11.5px;color:var(--text-2)">' + esc(B.routing.check) + '</span>' +
      '<span class="verdict esc">ESCALATE</span></div></div>');
    feed().insertBefore(card, feed().firstChild);
    setTile('transport', 'escalated', 'INC-0613 · needs a human decision');
    bumpTile('transport', 1, 0);

    const escCard = el('div', 'escalation',
      '<div class="et">◉ Needs your decision · INC-0613</div>' +
      '<h3>Rotterdam lane down — $1.9M strategic exposure</h3>' +
      '<div class="es">Briefing is ready: impact assessed, 3 options pre-simulated with the planning solver, recommendation prepared. SWAN is holding air slots until 14:00 CET.</div>' +
      '<div class="efoot"><button class="ebtn" id="open-brief">Open briefing</button>' +
      '<span class="estat">prepared unattended in 7 min · nothing has been changed</span></div>');
    escCard.id = 'esc-card';
    feed().insertBefore(escCard, feed().firstChild);
    $('#open-brief').addEventListener('click', () => { if (beatIdx === 6 && !busy) advance(); else if (beatIdx >= 7) openOverlay('brief'); });
    today.signals += 1; today.awaitingHuman = 1; renderStats(); addTasks(7);
    setFleetChip('<b>1 escalation</b> · awaiting your decision', true);
    if (!instant) toast('Escalation — INC-0613', 'Above risk threshold · briefing prepared for you');
  },

  /* 7 · Escalate — open the presentation-ready briefing */
  async function (instant) {
    if (!instant) openOverlay('brief');
  },

  /* 8 · Human decides — approve Option A */
  async function (instant) {
    closeOverlays();
    setClock('Thu · 07:04');
    const B = TDATA.incidentB;
    const escCard = $('#esc-card');
    escCard.classList.add('approved');
    escCard.querySelector('.et').innerHTML = '✓ Approved · Option A — executing';
    escCard.querySelector('.efoot').innerHTML = '<span class="estat">Approved by you · 07:04 · decision logged in Control Plane</span>';
    const box = el('div', '', '');
    escCard.appendChild(box);
    const rows = execRows(box, B.execution);
    await tickExec(rows, instant);
    setTile('transport', 'watching', 'watching');
    bumpTile('transport', 0, 1);
    today.escalated = 2; today.awaitingHuman = 0; renderStats(); addTasks(6);
    setFleetChip('<b>All quiet</b> · fleet healthy', false);
    if (!instant) toast('INC-0613 executed', 'Your decision · SWAN’s legwork · full audit trail');
  },

  /* 9 · Govern — the close */
  async function (instant) {
    setClock('Thu · 07:05');
    const card = el('div', 'ccard');
    card.appendChild(el('div', 'cp-link',
      '<span class="sysicon sys-W">◈</span>' +
      '<div><div class="t">This morning, unattended: 42 resolutions, 1 human decision, 0 boundary violations</div>' +
      '<div class="s">every action logged &amp; reversible · every model pinned &amp; transparent · every task metered</div></div>' +
      '<span class="go">Open Control Plane →</span>'));
    card.querySelector('.cp-link').addEventListener('click', () => { if (beatIdx === 9 && !busy) advance(); else openOverlay('cp'); });
    feed().insertBefore(card, feed().firstChild);
  },

  /* 10 · Govern — fleet Control Plane */
  async function (instant) {
    openOverlay('cp');
  }
];

/* ---------------------------- overlays ---------------------------- */

function openOverlay(name) {
  const ov = $('#ov-' + name);
  if (!ov.dataset.built) { OVERLAYS[name](); ov.dataset.built = '1'; }
  ov.classList.add('open');
}
function closeOverlays() { document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); }

const OVERLAYS = {

  brief() {
    const B = TDATA.incidentB, br = B.briefing;
    const b = $('#ov-brief .panel-b');
    b.innerHTML =
      '<div class="brief-sec"><div class="bh">Situation</div><p>' + esc(br.situation) + '</p></div>' +
      '<div class="brief-sec"><div class="bh">Impact if unmitigated</div><p>' + esc(br.impact) + '</p></div>' +
      '<div class="brief-sec"><div class="bh">Options — pre-simulated · planning solver · 0 violations</div>' +
      '<table class="brief-opts"><thead><tr><th>Option</th><th>Cost</th><th>OTD</th><th>Trade-off</th><th>Confidence</th></tr></thead><tbody>' +
      br.options.map(o => '<tr class="' + (o.reco ? 'reco' : '') + '"><td>' + esc(o.name) + (o.reco ? ' ★' : '') + '</td><td>' + o.cost + '</td><td>' + o.otd + '</td><td>' + esc(o.note) + '</td><td>' + o.conf + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="brief-sec"><div class="bh">Recommendation</div><p>' + esc(br.recommendation) + '</p></div>' +
      '<div class="brief-sec"><div class="bh">Assumptions &amp; validity</div><p style="color:var(--text-2);font-size:12.5px">' + esc(br.assumptions) + '</p></div>' +
      '<div class="brief-cta"><button class="btn-primary" id="btn-approve-a">Approve Option A</button>' +
      '<button class="btn-ghost">Modify…</button><button class="btn-ghost">Defer</button>' +
      '<span class="gnote" style="margin-left:auto;font-size:11px;color:var(--text-3)">air slots held until 14:00 CET · reversible until execution</span></div>';
    $('#btn-approve-a').addEventListener('click', () => { if (beatIdx === 7 && !busy) advance(); });
  },

  cp() {
    const b = $('#ov-cp .panel-b');
    b.innerHTML =
      '<div class="closing-strip">' + TDATA.closing.stats.map(s =>
        '<div class="cs"><div class="v">' + esc(s.value) + '</div><div class="l">' + esc(s.label) + '</div></div>').join('') + '</div>' +
      '<div class="cp-grid">' +
        '<div class="cp-sec"><div class="h">Fleet audit trail — today · every decision, assumption &amp; action</div><div class="b">' +
          TDATA.audit.map(a =>
            '<div class="audit-row"><span class="at">' + a.time + '</span>' +
            '<span class="actor"><span class="' + (a.actor === 'SWAN' ? 'actor-swan' : 'actor-user') + '">' + a.actor + '</span></span>' +
            '<span class="e">' + esc(a.entry) + '</span>' +
            (a.rollback ? '<span class="rb">↩ roll back</span>' : '') + '</div>').join('') +
        '</div></div>' +
        '<div>' +
          '<div class="cp-sec" style="margin-bottom:16px"><div class="h">Model registry — transparent &amp; version-pinned</div><div class="b">' +
            '<table class="registry"><thead><tr><th>Role</th><th>Model</th><th>Version</th></tr></thead><tbody>' +
            TDATA.registry.map(r => '<tr><td>' + esc(r.role) + '</td><td><b>' + esc(r.model) + '</b><div style="font-size:10.5px;color:var(--text-3)">' + esc(r.note) + '</div></td><td><span class="pin">' + esc(r.pin) + '</span></td></tr>').join('') +
            '</tbody></table></div></div>' +
          '<div class="cp-sec" style="margin-bottom:16px"><div class="h">Task metering — per agent · today</div><div class="b">' +
            TDATA.consumption.map(c =>
              '<div class="cp-stat"><span class="k">' + esc(c.agent) + '</span><span class="v">' + c.used + ' / ' + c.budget + '</span></div>' +
              '<div class="cp-budget-bar" style="margin:2px 0 8px"><i style="width:' + (c.used / c.budget * 100) + '%"></i></div>').join('') +
            '<div class="cp-stat"><span class="k">Budget policy</span><span class="v">stop &amp; escalate at 90%</span></div>' +
          '</div></div>' +
          '<div class="cp-sec"><div class="h">Fleet SLAs</div><div class="b">' +
            TDATA.sla.map(s => '<div class="cp-stat"><span class="k">' + esc(s.label) + '</span><span class="v">' + esc(s.value) + '</span></div>').join('') +
          '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="takeaway">' + TDATA.closing.takeaway + '</div>';
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
    if ((i === 7 || i === 10) && i !== n) { beatIdx = i; continue; } // overlay beats: skip unless target
    await runBeat(i, true);
  }
  updateHUD();
}

/* ---------------------------- guided player ---------------------------- */
/* The on-screen player (js/player.js) drives the story: Play / Pause, Next, Restart. */

const CAPTIONS = {
  0: 'More overnight activity', 1: 'A demand surge is detected',
  2: 'Specialist agents propose conflicting plans', 3: 'The lead agent arbitrates and runs the solver',
  4: 'Decision routing: auto-execute', 5: 'A rail strike forces an escalation',
  6: 'Open the decision briefing', 7: 'Approve Option A',
  8: 'Governance close', 9: 'Open the Control Plane', 10: 'Demo complete'
};

function updateHUD() {
  if (window.DemoPlayer) DemoPlayer.update(beatIdx, CAPTIONS[beatIdx]);
}

async function step() {
  if (busy) return false;
  if (beatIdx + 1 >= BEATS.length) return false;
  const briefOpen = $('#ov-brief').classList.contains('open');
  if (!(briefOpen && beatIdx === 7)) closeOverlays();
  await advance();
  return true;
}

window.DemoApp = { step, last: BEATS.length - 1, isBusy: () => busy, beat: () => beatIdx };

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay .x').forEach(x => x.addEventListener('click', closeOverlays));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeOverlays(); }));

  renderStatic();
  setClock(TDATA.meta.clockStart);
  setFleetChip('<b>Fleet healthy</b> · 6 agents · 24/7', false);

  const p = new URLSearchParams(location.search);
  if (p.has('nofx')) document.documentElement.classList.add('nofx');
  const n = parseInt(p.get('beat'), 10);
  const openAfter = p.get('open');
  if (!isNaN(n) && n >= 0) {
    jumpTo(Math.min(n, BEATS.length - 1)).then(() => { if (openAfter && OVERLAYS[openAfter]) openOverlay(openAfter); });
  } else { runBeat(0, false); }
});

})();
