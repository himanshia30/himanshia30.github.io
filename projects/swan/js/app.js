/* ============================================================================
   SWAN Demo — engine
   Beat state machine + chat renderer + overlays. Story content lives in
   data.js / chat-script.js; this file rarely needs edits.

   Controls: on-screen player (Play / Pause, Next, Restart). Esc closes an overlay.
   ============================================================================ */

(function () {
'use strict';

/* ---------------------------- tiny helpers ---------------------------- */

const $ = (s, r) => (r || document).querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* **bold** + paragraph markdown-lite */
function md(text) {
  return text.split(/\n\n+/).map(p =>
    '<p>' + esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>'
  ).join('');
}

function usd(n) { return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US'); }

function usdC(n) { // compact: $4.0M / $86.4K
  const a = Math.abs(n), sign = n < 0 ? '−$' : '$';
  if (a >= 1e6) { const v = a / 1e6; return sign + (v >= 10 ? v.toFixed(1) : v.toFixed(2).replace(/0$/, '')) + 'M'; }
  if (a >= 1e3) { const v = a / 1e3; return sign + (v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + 'K'; }
  return sign + a;
}

function sysIcon(letter, small) {
  return '<span class="sysicon sys-' + letter + (small ? ' sm' : '') + '">' + letter + '</span>';
}

/* ---------------------------- state ---------------------------- */

let beatIdx = -1;
let busy = false;
let currentView = 'console';
let runTasks = 0;
let clockLabel = DATA.meta.clockLabel;
let traceTime = '06:41';
let emailSigned = false;

/* typing beat state */
let armed = null;        // beat waiting for input
let typedText = '';
let typedPos = 0;

const beats = SCRIPT.beats;

/* ---------------------------- chrome ---------------------------- */

function setClock(label) { clockLabel = label; $('#clock').textContent = label; }

function setAgentStatus(text, busyDot) {
  $('#agent-dot').className = 'dot' + (busyDot ? ' busy' : '');
  $('#agent-status-text').innerHTML = text;
}

function updateBudget() {
  const b = DATA.budget;
  const used = b.usedBeforeRun + runTasks;
  $('#budget-fill').style.width = (used / b.monthlyTasks * 100).toFixed(1) + '%';
  $('#budget-text').innerHTML = '<b>' + used.toLocaleString() + '</b><span class="lbl">/' + b.monthlyTasks.toLocaleString() + ' tasks</span>';
  $('#trace-cost').textContent = 'Run: ' + runTasks + ' tasks · est $' + (runTasks * 0.498).toFixed(2);
}

function addTasks(n) { runTasks += n; updateBudget(); }

function toast(title, sub) {
  const t = el('div', 'toast', '<span class="avatar">S</span><div><div class="tt">' + esc(title) + '</div><div class="ts">' + esc(sub) + '</div></div>');
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 550); }, 3400);
}

/* ---------------------------- views ---------------------------- */

function switchView(name) {
  currentView = name;
  $('#view-console').classList.toggle('active', name === 'console');
  $('#view-workspace').classList.toggle('active', name === 'workspace');
}

/* ---------------------------- console rendering ---------------------------- */

function renderStatic() {
  // connectors
  const c = $('#connectors');
  DATA.connectors.forEach(k => {
    c.appendChild(el('div', 'connector',
      sysIcon(k.icon) +
      '<div class="meta"><div class="name">' + esc(k.name) + '</div><div class="kind">' + esc(k.kind) + ' · MCP</div></div>' +
      '<div class="sync">' + esc(k.sync) + '</div>'));
  });
  // past runs
  const p = $('#pastruns');
  DATA.pastRuns.forEach(r => {
    p.appendChild(el('div', 'pastrun',
      '<div class="t">' + esc(r.title) + '</div>' +
      '<div class="s"><span class="badge ' + r.status.toLowerCase() + '">' + r.status + '</span> ' + esc(r.when) + '</div>'));
  });
  // ambient signal (foreshadowing)
  $('#feed').appendChild(el('div', 'signal', sysIcon('R') +
    '<div class="body"><div class="head"><span class="src">RISK INTELLIGENCE</span><span class="time">yesterday 22:10</span></div>' +
    '<div class="title">Typhoon watch — Taiwan Strait</div>' +
    '<div class="sub">Monitoring · 2 suppliers in region · no confirmed impact</div></div>'));
  // workspace runs list
  const rl = $('#runslist');
  rl.appendChild(el('div', 'run-item current', '<div class="t">DSR-1847 · MCU-8347 supply delay</div><div class="s"><span class="live-dot"></span>Active · ' + esc(DATA.meta.runId) + '</div>'));
  DATA.pastRuns.forEach(r => {
    rl.appendChild(el('div', 'run-item', '<div class="t">' + esc(r.title) + '</div><div class="s">' + r.status + ' · ' + esc(r.when) + '</div>'));
  });
  updateBudget();
}

function signalCard(sig) {
  let inner = '<div class="head"><span class="src">' + esc(sig.system).toUpperCase() + '</span><span class="time">' + sig.time + '</span></div>' +
    '<div class="title">' + esc(sig.title) + '</div>';
  if (sig.kind === 'email') {
    inner += '<div class="sub"><b>' + esc(sig.from) + '</b> — ' + esc(sig.subject) + '</div>' +
      '<div class="preview">' + esc(sig.body) + '</div>';
  } else {
    inner += '<div class="kv">' + sig.fields.map(f => '<span class="k">' + esc(f[0]) + '</span><span class="v">' + esc(f[1]) + '</span>').join('') + '</div>';
  }
  const card = el('div', 'signal', sysIcon(sig.icon) + '<div class="body">' + inner + '</div>');
  card.dataset.sig = sig.id;
  return card;
}

function setNarrator(html) { $('#narrator-text').innerHTML = html; }

/* correlation card: rows of shared facts, one source-slot per system, and a
   confidence meter that climbs as corroboration arrives */
function buildCorrCard() {
  const c = DATA.correlation;
  const card = el('div', 'corr',
    '<div class="ch"><span class="t">Signal correlation — DSR-1847 (forming)</span>' +
    '<span class="conf-wrap"><span class="thresh">confirm at ' + c.threshold + '%</span>' +
    '<span class="conf-bar"><i id="conf-fill"></i><span class="tmark" style="left:' + c.threshold + '%"></span></span>' +
    '<span class="conf-num" id="conf-num">0%</span></span></div>' +
    c.rows.map(r =>
      '<div class="corr-row" data-row="' + r.m + '"><span>' + esc(r.label) + '</span>' +
      '<span class="srcs2">' + r.srcs.map(s => '<span class="slot sys-' + s + '" data-src="' + s + '">' + s + '</span>').join('') + '</span></div>').join('') +
    '<div class="note" id="corr-note">Waiting for signals…</div>');
  $('#correlation').appendChild(card);
}

function updateCorr(sig, instant) {
  const c = DATA.correlation;
  const step = c.steps[sig.id];
  // light up this source's slots on every row it corroborates
  c.rows.forEach(r => {
    if (!r.srcs.includes(sig.icon)) return;
    $('#correlation [data-row="' + r.m + '"] [data-src="' + sig.icon + '"]').classList.add('on');
    // once a fact is corroborated by ≥2 sources, highlight the matching chips on the cards
    const on = document.querySelectorAll('#correlation [data-row="' + r.m + '"] .slot.on').length;
    if (on >= 2) document.querySelectorAll('.xchip[data-m="' + r.m + '"]').forEach(x => x.classList.add('hit'));
  });
  $('#conf-fill').style.width = step.conf + '%';
  $('#conf-num').textContent = step.conf + '%';
  if (step.conf >= c.threshold) { $('#conf-fill').classList.add('ok'); $('#conf-num').classList.add('ok'); }
  $('#corr-note').textContent = step.note;
  setNarrator(step.narrator);
}

async function beatSignal(beat, instant) {
  const sig = DATA.signals.find(s => s.id === beat.signal);
  setClock('Tue · ' + sig.time);
  const feed = $('#feed');
  const card = signalCard(sig);
  feed.insertBefore(card, feed.firstChild);
  $('#feed-sub').textContent = 'new signal from ' + sig.system;

  // the agent visibly READS the signal, then extracts structured facts from it
  if (!instant) { setNarrator('<span class="think-shimmer">Reading ' + esc(sig.system) + ' signal…</span>'); await sleep(1100); }
  card.querySelector('.body').appendChild(el('div', 'xchips',
    '<span class="xl">SWAN extracted</span>' +
    sig.extracted.map(e => '<span class="xchip" data-m="' + e.m + '">' + esc(e.t) + '</span>').join('')));
  if (!instant) await sleep(700);

  // …then correlates it against what it has already seen
  if (!$('#correlation .corr')) buildCorrCard();
  updateCorr(sig, instant);
  if (!instant) await sleep(900);
}

async function beatFuse(instant) {
  const feed = $('#feed');
  const sigs = [...feed.querySelectorAll('.signal')].filter(s => s.dataset.sig);
  if (!instant) {
    sigs.forEach(s => s.classList.add('fusing'));
    setAgentStatus('<b>Correlating signals…</b>', true);
    $('#corr-note').textContent = '96% ≥ 90% threshold — creating one confirmed disruption record from 3 signals…';
    await sleep(2200);
  }
  setNarrator(DATA.correlation.confirmedNarrator);
  const corrTitle = $('#correlation .ch .t');
  if (corrTitle) corrTitle.textContent = 'Signal correlation — DSR-1847 · CONFIRMED';
  sigs.forEach(s => { s.classList.remove('fusing'); s.classList.add('collapsed'); });
  const d = DATA.disruption;
  const card = el('div', 'disruption',
    '<div class="tag">⚠ Confirmed disruption · ' + d.id + ' · ' + d.severity + '</div>' +
    '<h2>' + esc(d.title) + '</h2>' +
    '<div class="facts">' +
      '<span><b>' + d.part + '</b> · ' + esc(d.partDesc) + '</span>' +
      '<span>Supplier: <b>' + esc(d.supplier) + '</b></span>' +
      '<span>PO <b>' + d.po + '</b> · ' + d.qty + '</span>' +
    '</div>' +
    '<div class="facts"><span>' + esc(d.impactPreview) + '</span></div>' +
    '<div class="foot">' +
      '<span class="conf">' + d.confidence + '% confidence</span>' +
      '<span class="srcs">' + sysIcon('O', 1) + sysIcon('S', 1) + sysIcon('G', 1) + ' 3 corroborating sources</span>' +
      '<span class="open">Open with SWAN</span>' +
    '</div>');
  card.id = 'disruption-card';
  card.addEventListener('click', () => { if (beatIdx === 4 && !busy) advance(); });
  feed.insertBefore(card, feed.firstChild);
  $('#feed-sub').textContent = 'disruption confirmed · agent investigating';
  setAgentStatus('<b>Investigating</b> · DSR-1847', true);
  if (!instant) toast('Disruption confirmed — DSR-1847', 'Fused from 3 sources · SWAN is investigating');
}

/* ---------------------------- chat rendering ---------------------------- */

function chatEl() { return $('#chat'); }
function scrollChat() { const s = $('#chat-scroll'); s.scrollTop = s.scrollHeight; }

function addTrace(step) {
  const cls = step.system === 'SWAN' ? 'tool sys-swan' : 'tool';
  $('#trace').appendChild(el('div', 'titem',
    '<span class="tl">' + traceTime + '</span>' +
    '<span><span class="' + cls + '">' + esc(step.tool) + '</span><span class="lbl">' + esc(step.label) + '</span></span>'));
  const t = $('#trace-scroll'); t.scrollTop = t.scrollHeight;
}

async function addUserMsg(text, instant) {
  const m = el('div', 'msg user',
    '<div class="who">' + esc(DATA.meta.persona) + ' · ' + esc(DATA.meta.personaRole) + '</div>' +
    '<div class="bubble">' + esc(text) + '</div>');
  chatEl().appendChild(m); scrollChat();
  if (!instant) await sleep(350);
}

async function agentTurn(turnName, instant) {
  const turn = SCRIPT.turns[turnName];
  const msg = el('div', 'msg agent',
    '<div class="who"><span class="avatar">S</span> SWAN <span class="model-tag">' + DATA.models.lead.name + ' · ' + DATA.models.lead.selection + '</span></div>');
  chatEl().appendChild(msg);

  // reasoning block
  if (turn.steps && turn.steps.length) {
    const rb = el('div', 'reasoning', '<div class="rhead"><span class="think-shimmer">Working…</span></div>');
    msg.appendChild(rb); scrollChat();
    for (const step of turn.steps) {
      const cls = step.system === 'SWAN' ? 'tool sys-swan' : 'tool';
      const row = el('div', 'rstep',
        '<span class="st"><span class="spinner"></span></span>' +
        '<span class="' + cls + '">' + esc(step.tool) + '</span>' +
        '<span>' + esc(step.label) + '</span>' +
        '<span class="ms"></span>');
      rb.appendChild(row); scrollChat();
      // each reasoning step visibly "works" for 1.2–2s so the audience can read it
      if (!instant) await sleep(1200 + Math.min(step.ms, 2600) * 0.3);
      row.querySelector('.st').innerHTML = '<span class="check">✓</span>';
      row.querySelector('.ms').textContent = (step.ms / 1000).toFixed(step.ms >= 1000 ? 1 : 2).replace(/^0/, '') + 's';
      addTrace(step);
    }
    rb.querySelector('.rhead').innerHTML = '<span>Reasoning · ' + turn.steps.length + (turn.steps.length === 1 ? ' step' : ' steps') + '</span>';
    if (!instant) await sleep(500);  // beat between "done thinking" and the answer
  }

  // streamed text
  const bubble = el('div', 'bubble');
  msg.appendChild(bubble);
  if (instant) {
    bubble.innerHTML = md(turn.text);
  } else {
    await streamText(bubble, turn.text);
  }
  scrollChat();

  // cards — show a "building…" loader, then mount the card and let it animate in place
  for (const cardId of (turn.cards || [])) {
    if (!instant) {
      const loader = el('div', 'card-loader',
        '<span class="spinner"></span><span class="think-shimmer lbl">' + (CARD_LOADING[cardId] || 'Preparing…') + '</span>');
      msg.appendChild(loader); scrollChat();
      await sleep(CARD_LOAD_MS[cardId] || 1400);
      loader.remove();
    }
    await CARDS[cardId](instant, node => { msg.appendChild(node); scrollChat(); });
    if (!instant) await sleep(400);
  }
  addTasks(TASKS[turnName] || 3);
  scrollChat();
}

async function streamText(bubble, text) {
  const paras = text.split(/\n\n+/);
  for (const p of paras) {
    const pe = el('p');
    bubble.appendChild(pe);
    const html = esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // stream by whole tokens so tags never render half-open
    const tokens = html.split(/(<strong>|<\/strong>|\s+)/);
    let out = '';
    const caret = '<span class="caret"></span>';
    for (const t of tokens) {
      out += t;
      pe.innerHTML = out + caret;
      if (t.trim() && !t.startsWith('<')) { scrollChat(); await sleep(32); }
    }
    pe.innerHTML = out;
  }
}

/* task counts per turn (sums with execution to the budget figure) */
const TASKS = { briefing: 3, impact: 9, orchestration: 12, solver: 8, recommend: 6, explain: 3, approval: 1, execution: 5 };

/* loader captions & durations shown before each rich card renders */
const CARD_LOADING = {
  blastRadius:      'Creating runtime worksheet “MCU-8347 Recovery” — querying Planner, Salesforce, SAP…',
  orchestration:    'Spinning up 3 specialist agents from reusable skills…',
  compose:          'Lead agent — assembling the specialists’ findings into candidate plans…',
  solver:           'Opening simulation scenarios — handing off to the planning solver…',
  options:          'Ranking options against your preferences and precedent…',
  controlPlaneLink: 'Writing decision record…'
};
const CARD_LOAD_MS = { blastRadius: 2300, orchestration: 1500, compose: 1500, solver: 1400, options: 1700, controlPlaneLink: 900 };

/* ---------------------------- cards ---------------------------- */

const CARDS = {

  async blastRadius(instant, mount) {
    const im = DATA.impact;
    const top = DATA.orders.slice(0, 5);
    const card = el('div', 'ccard',
      '<div class="chead">' + sysIcon('M', 1) +
        '<span class="t">' + esc(DATA.worksheet.name) + '</span>' +
        '<span class="sub">runtime worksheet · ' + esc(DATA.worksheet.sources) + '</span>' +
        '<span class="act" id="open-worksheet">Open worksheet →</span></div>' +
      '<div class="cbody">' +
        '<div class="stats-row">' +
          '<div class="stat"><div class="v bad">' + usdC(im.totalRevenue) + '</div><div class="l">revenue at risk · 12 orders</div></div>' +
          '<div class="stat"><div class="v">' + usdC(im.strategicRevenue) + '</div><div class="l">with 3 strategic accounts <span class="prov crm">CRM</span></div></div>' +
          '<div class="stat"><div class="v bad">' + im.otdNoAction + '%</div><div class="l">OTD if no action</div></div>' +
        '</div>' +
        '<table class="mini-table"><thead><tr><th>Order</th><th>Customer</th><th>Tier</th><th class="num">Qty</th><th>Promise</th><th class="num">Slip</th><th class="num">Rev at risk</th></tr></thead><tbody>' +
        top.map(o => '<tr><td class="mono">' + o.id + '</td><td>' + esc(o.customer) + '</td><td><span class="tier ' + o.tier + '">' + o.tier + '</span></td><td class="num">' + o.qty.toLocaleString() + '</td><td>' + o.promise + '</td><td class="num slip">+' + o.slip + 'd</td><td class="num">' + usd(o.revenue) + '</td></tr>').join('') +
        '</tbody></table>' +
        '<div class="more-note">+ 7 more orders · full lineage in the worksheet</div>' +
      '</div>');
    card.querySelector('#open-worksheet').addEventListener('click', () => openOverlay('worksheet'));
    if (mount) mount(card);
    return card;
  },

  async orchestration(instant, mount) {
    const card = el('div', 'ccard',
      '<div class="chead"><span class="avatar">S</span>' +
        '<span class="t">' + esc(DATA.leadAgent.name) + '</span>' +
        '<span class="sub">delegating to 3 specialists · ' + DATA.models.specialists.name + ' (' + DATA.models.specialists.selection + ')</span></div>' +
      '<div class="cbody"><div class="lanes"></div></div>');
    const lanesEl = card.querySelector('.lanes');
    const laneEls = DATA.subagents.map(a => {
      const lane = el('div', 'lane',
        '<div class="lh"><span class="avatar" style="background:linear-gradient(135deg,#5b7ad4,#7c5cff)">A</span><div><div class="ln">' + esc(a.name) + '</div><div class="lm">' + a.model + '</div></div></div>' +
        '<div class="skills">' + a.skills.map(s => '<span class="skill">' + s + '</span>').join('') + '</div>' +
        '<div class="lane-bar"><i></i></div>' +
        '<div class="lsteps"></div>');
      lanesEl.appendChild(lane);
      return lane;
    });
    if (mount) mount(card);   // mount BEFORE animating so the lanes fill in on screen

    const animateLane = async (lane, agent) => {
      const steps = lane.querySelector('.lsteps');
      const bar = lane.querySelector('.lane-bar i');
      let done = 0;
      for (const s of agent.steps) {
        const row = el('div', 'lstep', '<span class="spinner"></span><span>' + esc(s) + '</span>');
        steps.appendChild(row);
        if (!instant) await sleep(950 + Math.random() * 550);
        done++;
        bar.style.width = Math.round(done / agent.steps.length * 100) + '%';
        row.innerHTML = '<span style="color:var(--low);font-weight:700">✓</span><span>' + esc(s.replace(/…$/, '')) + '</span>';
      }
      if (!instant) await sleep(350);
      lane.appendChild(el('div', 'finding', '<b>Finding:</b> ' + esc(agent.finding)));
      scrollChat();
    };
    // run the three lanes in parallel — that IS the story
    const anims = DATA.subagents.map((a, i) => animateLane(laneEls[i], a));
    if (!instant) { scrollChat(); }
    await Promise.all(anims);

    if (!instant) await sleep(1000);  // let the findings land before the conflict appears
    const cf = DATA.conflict;
    card.querySelector('.cbody').appendChild(el('div', 'arbitration',
      '<b>⚖ Conflict detected:</b> ' + esc(cf.issue) +
      '<div class="res"><b>Arbitrated by lead:</b> ' + esc(cf.resolution) + '</div>'));
    if (!instant) { scrollChat(); await sleep(700); }
    addTrace({ tool: 'swan.arbitrate', system: 'SWAN', label: 'Safety-stock pull capped at 1,850 units (policy floor)' });
    return card;
  },

  /* the bridge between findings and scenarios: WHAT the lead built from WHOM */
  async compose(instant, mount) {
    const card = el('div', 'ccard',
      '<div class="chead"><span class="avatar">S</span><span class="t">From findings to candidate plans</span>' +
      '<span class="sub">the specialists found what’s possible — the lead composes what to do</span></div>' +
      '<div class="cbody" id="composelist"></div>');
    if (mount) mount(card);
    const list = card.querySelector('#composelist');
    for (const p of DATA.composition) {
      list.appendChild(el('div', 'plan-row',
        '<span class="rank">' + p.opt + '</span>' +
        '<span class="pr-main"><b>' + esc(p.title) + '</b><span class="pr-recipe">' + esc(p.recipe) + '</span></span>' +
        '<span class="pr-from">' + p.from.map(f => '<span class="skill">' + esc(f) + '</span>').join('') + '</span>'));
      if (!instant) { scrollChat(); await sleep(750); }
    }
    return card;
  },

  async solver(instant, mount) {
    const s = DATA.solver;
    const scens = DATA.scenarios.filter(x => x.id !== 'BASE');
    const card = el('div', 'ccard',
      '<div class="chead">' + sysIcon('M', 1) + '<span class="t">Simulation-first · planning solver run</span>' +
      '<span class="sub">scenarios are children of Enterprise baseline — live plan untouched</span></div>' +
      '<div class="cbody"><div class="solver-rows"></div>' +
        '<div class="solver-foot">' +
          '<span class="solver-badge">◆ ' + s.name + ' · ' + s.runtime + '</span>' +
          '<span>Hard constraints: ' + s.constraintsChecked.join(' · ') + '</span>' +
          '<span class="ok">✓ ' + s.violations + ' violations</span>' +
        '</div></div>');
    const rows = card.querySelector('.solver-rows');
    if (mount) mount(card);   // mount first — scenarios solve one by one on screen
    for (const sc of scens) {
      const row = el('div', 'solver-row',
        '<span class="sn">' + sc.id + '</span><span>' + esc(sc.name.replace(/^[ABC] · /, '')) + '</span>' +
        '<span class="st"><span class="spinner"></span></span>');
      rows.appendChild(row); scrollChat();
      if (!instant) await sleep(1300);
      row.querySelector('.st').innerHTML = '<span class="check">✓ solved</span>';
    }
    return card;
  },

  async options(instant, mount) {
    const wrap = el('div');
    const mem = DATA.memory;
    wrap.appendChild(el('div', 'memory-chip',
      '<span class="mi">◆</span><div><b>Memory:</b> ' + esc(mem.preference) + '<br><b>' + esc(mem.precedent.label) + ':</b> ' + esc(mem.precedent.text) + '</div>'));
    if (mount) mount(wrap);            // memory chip lands first…
    if (!instant) await sleep(1000);   // …and gets a moment to be read

    const head = el('div', 'ccard',
      '<div class="chead"><span class="t">Recovery options — ranked</span>' +
      '<span class="sub">simulated & validated · DSR-1847</span>' +
      '<span class="act" id="open-scorecard">Compare scenarios →</span></div>' +
      '<div class="cbody" id="optlist"></div>');
    wrap.appendChild(head);
    head.querySelector('#open-scorecard').addEventListener('click', () => openOverlay('scorecard'));

    const list = head.querySelector('#optlist');
    for (const o of DATA.recommendations) {
      const lead = o.rank === 1;
      const div = el('div', 'option' + (lead ? ' lead' : ''),
        '<div class="ohead"><span class="rank">' + (lead ? '★ RECOMMENDED' : '#' + o.rank) + '</span>' +
          '<span class="ot">' + esc(o.title) + '</span>' +
          (o.precedent ? '<span class="opt-precedent">◆ matches your playbook</span>' : '') +
          '<span class="conf">' + o.confidence + '%<span class="bar"><i style="width:' + o.confidence + '%"></i></span></span></div>' +
        '<div class="osum">' + esc(o.summary) + '</div>' +
        '<div class="onums">' +
          '<span><span class="k">protects</span> <b>' + usdC(o.protects) + '</b></span>' +
          '<span><span class="k">cost</span> <b>' + usdC(o.cost) + '</b></span>' +
          '<span><span class="k">OTD</span> <b>' + o.otd + '%</b></span>' +
          '<span><span class="k">scenario</span> <b class="mono" style="font-family:var(--mono);font-size:11px">' + o.scenario + '</b></span>' +
        '</div>' +
        '<ul class="otrade">' + o.tradeoffs.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
        (lead ? '<button class="obtn" id="proceed-a">Proceed with Option A</button>' : ''));
      list.appendChild(div);
      if (!instant) { scrollChat(); await sleep(650); }
    }
    list.querySelector('#proceed-a').addEventListener('click', () => {
      if (busy) return;
      if (beatIdx >= 11 && beatIdx <= 13) {
        armed = null; renderInput();   // visitor skipped the Q3 beat — disarm typing
        beatIdx = 13; advance();
      }
    });
    return wrap;
  },

  async controlPlaneLink(instant, mount) {
    const card = el('div', 'ccard');
    card.appendChild(el('div', 'cp-link',
      '<span class="sysicon sys-W">◈</span>' +
      '<div><div class="t">Control Plane — decision record DSR-1847</div>' +
      '<div class="s">audit trail · rollback · task consumption · outcome tracking</div></div>' +
      '<span class="go">View in Control Plane →</span>'));
    card.querySelector('.cp-link').addEventListener('click', () => { if (beatIdx === 16 && !busy) advance(); else openOverlay('cp'); });
    if (mount) mount(card);
    return card;
  }
};

/* ---------------------------- approval & execution beats ---------------------------- */

function apprRow(a) {
  return '<div class="appr-row">' + sysIcon(a.icon, 1) +
    '<span class="sys">' + esc(a.system) + '</span><span class="act">' + esc(a.action) + '</span>' +
    (a.risk ? '<span class="risk ' + a.risk + '">' + a.risk + '</span>' : '') + '</div>';
}

async function beatApproval(instant) {
  await addUserMsg('Proceed with Option A.', instant);
  const ap = DATA.approval;
  const msg = el('div', 'msg agent',
    '<div class="who"><span class="avatar">S</span> SWAN <span class="model-tag">' + DATA.models.lead.name + '</span></div>' +
    '<div class="bubble"><p>Here is exactly what that authorizes. Four actions need your approval; two low-risk actions will run automatically; one is held for your sign-off. Everything is logged and reversible.</p></div>');
  chatEl().appendChild(msg);

  if (!instant) {
    scrollChat();
    const loader = el('div', 'card-loader',
      '<span class="spinner"></span><span class="think-shimmer lbl">Preparing approval package — validating writeback targets, risk levels & never-do boundaries…</span>');
    msg.appendChild(loader); scrollChat();
    await sleep(1600);
    loader.remove();
  }

  const card = el('div', 'ccard',
    '<div class="chead"><span class="t">Approval gate — ' + esc(ap.option) + '</span>' +
    '<span class="sub">autonomy: ' + DATA.meta.autonomyLevel + ' · confidence-based escalation</span></div>' +
    '<div class="cbody">' +
      '<div class="appr-sec"><div class="sh">Requires your approval</div>' + ap.gated.map(apprRow).join('') + '</div>' +
      '<div class="appr-sec"><div class="sh">Auto-executes (below risk threshold)</div>' + ap.auto.map(apprRow).join('') + '</div>' +
      '<div class="appr-sec"><div class="sh">Held for sign-off</div>' + ap.held.map(a =>
        '<div class="appr-row">' + sysIcon(a.icon, 1) + '<span class="sys">' + esc(a.system) + '</span><span class="act">' + esc(a.action) + '</span><span class="risk Medium">Sign-off</span></div>' +
        '<div class="appr-note">' + esc(a.note) + '</div>').join('') + '</div>' +
      '<div class="appr-sec"><div class="sh">SWAN will never do <span style="text-transform:none;font-weight:500">(never-do list · policy)</span></div>' +
        ap.neverDo.map(n => '<div class="appr-row blocked">' + sysIcon('W', 1) + '<span class="sys">Policy</span><span class="act">' + esc(n) + '</span><span class="blocked-pill">BLOCKED</span></div>').join('') + '</div>' +
      '<div class="appr-cta"><button class="btn-primary" id="btn-approve">Approve &amp; execute</button>' +
        '<button class="btn-ghost">Modify…</button><button class="btn-ghost">Reject</button>' +
        '<span class="gnote">every action reversible · full audit trail</span></div>' +
    '</div>');
  msg.appendChild(card);
  card.querySelector('#btn-approve').addEventListener('click', () => { if (beatIdx === 14 && !busy) advance(); });
  addTasks(TASKS.approval);
  scrollChat();
  if (!instant) await sleep(300);
}

async function beatExecution(instant) {
  // freeze the gate
  const btn = $('#btn-approve');
  if (btn) {
    const cta = btn.parentElement;
    cta.innerHTML = '<span style="color:var(--low);font-weight:750">✓ Approved by ' + DATA.meta.persona.split(' ')[0] + ' · 08:22</span><span class="gnote">4 gated actions authorized</span>';
  }
  await addUserMsg('Approved — execute.', instant);

  const msg = el('div', 'msg agent',
    '<div class="who"><span class="avatar">S</span> SWAN <span class="model-tag">' + DATA.models.lead.name + '</span></div>' +
    '<div class="bubble"><p>Executing now — writebacks are gated, validated, and logged as they land:</p></div>');
  chatEl().appendChild(msg);
  if (!instant) { scrollChat(); await sleep(700); }

  const card = el('div', 'ccard',
    '<div class="chead"><span class="t">Execution — DSR-1847 recovery</span><span class="sub">bidirectional writeback via MCP connectors</span></div>' +
    '<div class="cbody" style="padding:6px 8px"></div>');
  msg.appendChild(card); scrollChat();
  const body = card.querySelector('.cbody');

  for (const x of DATA.execution) {
    const row = el('div', 'exec-row' + (x.id === 'x-email' ? ' clickable' : ''),
      sysIcon(x.icon, 1) + '<span class="act">' + esc(x.action) + '</span>' +
      '<span class="ref">' + esc(x.ref) + '</span><span class="st q">queued</span>');
    row.dataset.x = x.id;
    body.appendChild(row); scrollChat();
  }
  const rows = [...body.querySelectorAll('.exec-row')];
  for (let i = 0; i < rows.length; i++) {
    const x = DATA.execution[i], st = rows[i].querySelector('.st');
    if (!instant) { st.className = 'st run'; st.textContent = 'executing…'; await sleep(950); }
    if (x.held) { st.className = 'st held'; st.textContent = emailSigned ? '✓ sent' : '⏸ held'; }
    else { st.className = 'st ok'; st.textContent = '✓ done'; }
  }
  body.querySelector('[data-x="x-email"]').addEventListener('click', () => openOverlay('mail'));
  addTasks(TASKS.execution);
  setAgentStatus('<b>Executed</b> · monitoring outcome', false);
  if (!instant) toast('Recovery executed', '6 actions across 4 systems · 1 held for sign-off');
  scrollChat();
}

/* ---------------------------- overlays ---------------------------- */

function openOverlay(name) {
  const ov = $('#ov-' + name);
  if (!ov.dataset.built) { OVERLAYS[name](); ov.dataset.built = '1'; }
  ov.classList.add('open');
}
function closeOverlays() { document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); }

const OVERLAYS = {

  worksheet() {
    const b = $('#ov-worksheet .panel-b');
    const w = DATA.worksheet;
    let totQ = 0, totR = 0;
    DATA.orders.forEach(o => { totQ += o.qty; totR += o.revenue; });
    b.innerHTML =
      '<div class="ws-banner">✦ Created at runtime by SWAN — no one authored this worksheet.<span class="save" id="ws-save">Save as planning resource</span></div>' +
      '<div class="ws-toolbar"><span class="scen">scenario: SCN-1847 (child of Enterprise)</span>' +
        '<span class="filter">Part = MCU-8347 (via BOM)</span><span class="filter">Status = Open</span>' +
        '<span class="right">Sources: ' + esc(w.sources) + ' · 12 rows</span></div>' +
      '<table class="grid"><thead><tr><th>Order</th><th>Customer</th><th>Tier <span class="prov crm">CRM</span></th><th>Product</th><th class="num">Qty</th><th>Promise</th><th class="num">Proj. slip</th><th class="num">Revenue at risk <span class="prov erp">SAP</span></th></tr></thead><tbody>' +
      DATA.orders.map(o =>
        '<tr><td class="mono">' + o.id + '</td><td>' + esc(o.customer) + '</td>' +
        '<td><span class="tier ' + o.tier + '">' + o.tier + '</span></td><td>' + esc(o.product) + '</td>' +
        '<td class="num">' + o.qty.toLocaleString() + '</td><td>' + o.promise + '</td>' +
        '<td class="num slip">+' + o.slip + ' days</td><td class="num">' + usd(o.revenue) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="4">12 orders · 3 products · 12 customers</td><td class="num">' + totQ.toLocaleString() + '</td><td></td><td></td><td class="num">' + usd(totR) + '</td></tr></tfoot></table>';
    $('#ws-save').addEventListener('click', function () {
      this.textContent = '✓ Saved to Supply Planning workbook'; this.style.color = 'var(--low)';
    });
  },

  scorecard() {
    const b = $('#ov-scorecard .panel-b');
    const sc = DATA.scorecard, scens = DATA.scenarios;
    const fmt = (m, v) => m.fmt === 'pct' ? v.toFixed(1) + '%' : m.fmt === 'usd' ? usdC(v) : String(v);
    b.innerHTML =
      '<table class="score-table"><thead><tr><th>Metric — computed by planning solvers</th>' +
      scens.map(s => '<th class="' + (s.id === 'SCN-1847-A' ? 'reco' : '') + '">' + esc(s.name) + (s.id === 'SCN-1847-A' ? ' ★' : '') + '</th>').join('') +
      '</tr></thead><tbody>' +
      sc.metrics.map(m => '<tr><td>' + esc(m.label) + '</td>' +
        scens.map(s => {
          const isReco = s.id === 'SCN-1847-A';
          return '<td class="' + (isReco ? 'reco best' : '') + '">' + fmt(m, s[m.key]) + '</td>';
        }).join('') + '</tr>').join('') +
      '</tbody></table>' +
      '<div class="score-note"><span class="solver-badge">◆ ' + DATA.solver.name + '</span> ' + esc(sc.note) + ' · scenarios remain open for what-if edits</div>';
  },

  mail() {
    const b = $('#ov-mail .panel-b');
    const m = DATA.emailDraft;
    b.innerHTML = '<div class="mail">' +
      '<div class="mail-h">' +
        '<div class="mail-row"><span class="k">To</span><span>' + esc(m.to) + '</span></div>' +
        '<div class="mail-row"><span class="k">Cc</span><span>' + esc(m.cc) + '</span></div>' +
        '<div class="mail-subj">' + esc(m.subject) + '</div></div>' +
      '<div class="mail-b">' + m.body.map(p => '<p>' + esc(p) + '</p>').join('') + '</div>' +
      '<div class="mail-foot"><button class="btn-primary" id="mail-send">Sign off &amp; send</button>' +
        '<span class="note">' + esc(m.footer) + '</span>' +
        '<span class="mail-sent" id="mail-sent">✓ Sent · 08:24</span></div></div>';
    $('#mail-send').addEventListener('click', () => {
      emailSigned = true;
      $('#mail-send').style.display = 'none';
      $('#mail-sent').style.display = 'inline-flex';
      const row = $('[data-x="x-email"]');
      if (row) { const st = row.querySelector('.st'); st.className = 'st ok'; st.textContent = '✓ sent'; }
      DATA.audit.push({ time: '08:24', actor: 'Maya', entry: 'Signed off supplier email — sent to Astrel via Outlook' });
      const cp = $('#ov-cp'); if (cp) cp.dataset.built = '';
      setTimeout(() => { closeOverlays(); toast('Supplier email sent', 'Sign-off recorded in audit trail'); }, 700);
    });
  },

  cp() {
    const b = $('#ov-cp .panel-b');
    const bud = DATA.budget;
    const used = bud.usedBeforeRun + runTasks;
    b.innerHTML =
      '<div class="closing-strip">' + DATA.closing.stats.map(s =>
        '<div class="cs"><div class="v">' + esc(s.value) + '</div><div class="l">' + esc(s.label) + '</div></div>').join('') + '</div>' +
      '<div class="cp-grid">' +
        '<div class="cp-sec"><div class="h">Audit trail — DSR-1847 · every decision, assumption &amp; action</div><div class="b">' +
          DATA.audit.map(a =>
            '<div class="audit-row"><span class="at">' + a.time + '</span>' +
            '<span class="actor"><span class="' + (a.actor === 'SWAN' ? 'actor-swan' : 'actor-user') + '">' + a.actor + '</span></span>' +
            '<span class="e">' + esc(a.entry) + '</span>' +
            (a.rollback ? '<span class="rb">↩ roll back</span>' : '') + '</div>').join('') +
        '</div></div>' +
        '<div>' +
          '<div class="cp-sec" style="margin-bottom:16px"><div class="h">Task consumption — this run</div><div class="b">' +
            '<div class="cp-stat"><span class="k">Tasks used (run ' + DATA.meta.runId + ')</span><span class="v">' + (runTasks || bud.runTasks) + '</span></div>' +
            '<div class="cp-stat"><span class="k">Estimated cost</span><span class="v">$' + ((runTasks || bud.runTasks) * 0.498).toFixed(2) + '</span></div>' +
            '<div class="cp-stat"><span class="k">Monthly budget</span><span class="v">' + used.toLocaleString() + ' / ' + bud.monthlyTasks.toLocaleString() + '</span></div>' +
            '<div class="cp-budget-bar"><i style="width:' + (used / bud.monthlyTasks * 100) + '%"></i></div>' +
            '<div class="cp-stat"><span class="k">Budget policy</span><span class="v">stop &amp; escalate at 90%</span></div>' +
          '</div></div>' +
          '<div class="cp-sec" style="margin-bottom:16px"><div class="h">Outcome learning</div><div class="b">' +
            '<div class="cp-learn">' + esc(DATA.learning.outcome) + '</div>' +
            '<div class="cp-learn"><b>' + esc(DATA.learning.stored) + '</b></div>' +
          '</div></div>' +
          '<div class="cp-sec"><div class="h">Agent SLAs — 30 days</div><div class="b">' +
            DATA.sla.map(s => '<div class="cp-stat"><span class="k">' + esc(s.label) + '</span><span class="v">' + esc(s.value) + '</span></div>').join('') +
          '</div></div>' +
        '</div>' +
      '</div>';
  }
};

/* ---------------------------- input bar (keystroke-independent) ---------------------------- */

function armInput(beat) {
  armed = beat;
  typedText = SCRIPT.questions[beat.question];
  typedPos = 0;
  renderInput();
  $('#inputwrap').classList.add('focus');
  $('#send-btn').classList.remove('idle');
}

function renderInput() {
  const inp = $('#chat-input');
  if (armed) {
    inp.innerHTML = esc(typedText.slice(0, typedPos)) + '<span class="caret"></span>';
  } else {
    inp.innerHTML = '<span class="ph">Message SWAN…</span>';
    $('#inputwrap').classList.remove('focus');
    $('#send-btn').classList.add('idle');
  }
}

async function sendArmed(autoType) {
  if (!armed || busy) return;
  const beat = armed;
  if (autoType && typedPos < typedText.length) {
    busy = true;
    while (typedPos < typedText.length) { typedPos += 2; renderInput(); await sleep(24); }
    busy = false;
  }
  typedPos = typedText.length;
  armed = null;
  renderInput();
  await runBeat(beat, false);
}

/* ---------------------------- beat machine ---------------------------- */

async function runBeat(beat, instant) {
  if (busy) return;
  busy = true;
  try {
    if (beat.view && beat.view !== currentView) {
      switchView(beat.view);
      if (beat.view === 'workspace') setClock('Tue · 08:14');
    }
    switch (beat.action) {
      case 'opening': break;
      case 'signal':      await beatSignal(beat, instant); break;
      case 'fuse':        await beatFuse(instant); break;
      case 'agentTurn':
        if (beat.turn === 'briefing') { traceTime = '08:14'; setAgentStatus('<b>Active</b> · with ' + DATA.meta.persona.split(' ')[0], true); }
        if (beat.turn === 'impact') traceTime = '08:14';
        if (beat.turn === 'orchestration') traceTime = '08:16';
        if (beat.turn === 'solver') traceTime = '08:18';
        if (beat.turn === 'recommend') traceTime = '08:19';
        if (beat.turn === 'explain') traceTime = '08:20';
        if (beat.turn === 'wrapup') traceTime = '08:23';
        await agentTurn(beat.turn, instant);
        break;
      case 'userInput':   await addUserMsg(SCRIPT.questions[beat.question], instant); break;
      case 'approval':    traceTime = '08:21'; await beatApproval(instant); break;
      case 'execution':   traceTime = '08:22'; await beatExecution(instant); break;
      case 'controlPlane': openOverlay('cp'); break;
    }
    beatIdx = beat.id;
  } finally {
    busy = false;
  }
  updateHUD();
  const next = beats[beatIdx + 1];
  if (next && next.trigger === 'auto' && !instant) { await runBeat(next, false); }
  else if (next && next.trigger === 'input' && !instant) armInput(next);
}

async function advance() {
  if (busy) return;
  if (armed) { await sendArmed(true); return; }
  const next = beats[beatIdx + 1];
  if (!next) return;
  await runBeat(next, false);
}

async function jumpTo(n) {
  for (let i = 0; i <= n && i < beats.length; i++) {
    const b = beats[i];
    if (b.action === 'controlPlane' && i === n) { await runBeat(b, true); continue; }
    if (b.action === 'controlPlane') { beatIdx = b.id; continue; }
    await runBeat(b, true);
  }
  const next = beats[beatIdx + 1];
  if (next && next.trigger === 'input') armInput(next);
  updateHUD();
  // land scrolled to the latest content (bypass smooth scrolling)
  const s = $('#chat-scroll');
  s.style.scrollBehavior = 'auto';
  s.scrollTop = s.scrollHeight;
  s.style.scrollBehavior = '';
}

/* ---------------------------- guided player ---------------------------- */
/* The on-screen player (js/player.js) drives the story: Play / Pause, Next, Restart. */

const CAPTIONS = {
  0: 'First signal arrives (Outlook)', 1: 'An ERP signal follows', 2: 'A logistics signal follows',
  3: 'The signals fuse into one disruption', 4: 'Open the disruption',
  5: 'Ask: “How bad is this?”', 7: 'Ask: “What are our options?”',
  9: 'Run the solver on every option', 10: 'Recommendations',
  11: 'Ask a follow-up question', 13: 'Proceed with Option A',
  14: 'Approve and execute', 15: 'Wrap-up', 16: 'Open the Control Plane', 17: 'Demo complete'
};

function updateHUD() {
  if (window.DemoPlayer) DemoPlayer.update(beatIdx, CAPTIONS[beatIdx]);
}

async function step() {
  if (busy) return false;
  const next = beats[beatIdx + 1];
  if (!armed && !next) return false;
  closeOverlays();
  if (armed) { await sendArmed(true); return true; }
  await runBeat(next, false);
  return true;
}

window.DemoApp = { step, last: beats.length - 1, isBusy: () => busy, beat: () => beatIdx };

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });

/* clicking the input bar or send button */
document.addEventListener('DOMContentLoaded', () => {
  $('#inputwrap').addEventListener('click', () => { if (armed) $('#inputwrap').classList.add('focus'); });
  $('#send-btn').addEventListener('click', () => sendArmed(true));
  document.querySelectorAll('.overlay .x').forEach(x => x.addEventListener('click', closeOverlays));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeOverlays(); }));

  renderStatic();
  setClock(DATA.meta.clockLabel);
  setAgentStatus('<b>Monitoring</b> · 6 systems', false);
  renderInput();

  const p = new URLSearchParams(location.search);
  if (p.has('nofx')) document.documentElement.classList.add('nofx'); // kill animations (screenshots/rehearsal)
  const n = parseInt(p.get('beat'), 10);
  const openAfter = p.get('open'); // rehearsal deep link: &open=worksheet|scorecard|mail|cp
  if (!isNaN(n) && n >= 0) {
    jumpTo(Math.min(n, beats.length - 1)).then(() => { if (openAfter && OVERLAYS[openAfter]) openOverlay(openAfter); });
  }
  else { runBeat(beats[0], false); }
});

})();
