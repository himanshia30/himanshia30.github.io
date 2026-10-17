/* ============================================================================
   Autonomous Exception Management — Control Tower Demo — WORLD STATE
   Same Northbridge Electronics world as the incident-response demo (incident-response.html), one
   layer up: the whole agent fleet, seen by supply chain leadership.
   Edit this file to change names, numbers, and story facts.
   ============================================================================ */

const TDATA = {

  meta: {
    subtitle: 'Control Tower',
    company: 'Northbridge Electronics',
    clockStart: 'Thu · 06:38',
    dailyTaskBudget: 1000,
    tasksAtOpen: 312,
    estCostAtOpen: 155.30
  },

  connectors: [
    { id: 'planner',   name: 'Planning Model', kind: 'Planning',     sync: 'live',       icon: 'M' },
    { id: 'erp',       name: 'SAP S/4HANA',            kind: 'ERP',         sync: 'live · CDC', icon: 'S' },
    { id: 'crm',       name: 'Salesforce',             kind: 'CRM',         sync: '6 min ago',  icon: 'C' },
    { id: 'logistics', name: 'GlobalFreight',          kind: 'Logistics',   sync: '2 min ago',  icon: 'G' },
    { id: 'fabric',    name: 'Databricks',             kind: 'Data fabric', sync: 'streaming',  icon: 'D' },
    { id: 'risk',      name: 'Risk Intelligence',      kind: 'Signals',     sync: '3 min ago',  icon: 'R' }
  ],

  /* the fleet — status is animated by beats; counters are "today so far" */
  fleet: [
    { id: 'inventory', letter: 'I', name: 'Inventory Agent',        scope: '14 DCs · 3 plants',      autonomy: 'Autonomous', color: '#0e8f80', signals: 214, actions: 11 },
    { id: 'demand',    letter: 'D', name: 'Demand Agent',           scope: '3 regions · 5 channels', autonomy: 'Supervised', color: '#5b7ad4', signals: 168, actions: 6  },
    { id: 'supply',    letter: 'S', name: 'Supply Agent',           scope: '214 suppliers',          autonomy: 'Supervised', color: '#7c5cff', signals: 341, actions: 9  },
    { id: 'transport', letter: 'T', name: 'Transportation Agent',   scope: '38 lanes · 6 carriers',  autonomy: 'Autonomous', color: '#e07b16', signals: 296, actions: 12 },
    { id: 'risk',      letter: 'R', name: 'Supplier Risk Agent',    scope: 'Risk Intelligence feed', autonomy: 'Autonomous', color: '#d4a017', signals: 187, actions: 2  },
    { id: 'service',   letter: 'C', name: 'Customer Service Agent', scope: 'CRM · 1,240 accounts',   autonomy: 'Supervised', color: '#00a1e0', signals: 78,  actions: 1  }
  ],

  /* today counters (right rail) — beats increment these */
  today: {
    signals: 1284,
    autoResolved: 41,
    escalated: 1,
    awaitingHuman: 0,
    slaHealth: '99.1%'
  },

  /* --------------------------------------------------------------------------
     Act 1 — ambient auto-resolutions (the platform never stops watching)
     First three are present at open; the next batch arrives on beat 1.
  -------------------------------------------------------------------------- */
  ambientOpen: [
    { time: '05:12', agent: 'inventory', text: 'Rebalanced safety stock Rotterdam → Lyon (312 units) — coverage floors held', tag: 'auto' },
    { time: '05:47', agent: 'transport', text: 'Re-tendered lane CHI → DAL after carrier decline — saved $4.2K', tag: 'auto' },
    { time: '06:03', agent: 'service',   text: 'Updated 14 promise dates after overnight ASN confirmations', tag: 'auto' }
  ],
  ambientMore: [
    { time: '06:19', agent: 'risk',      text: 'Elevated watch on 2 suppliers in typhoon path — no confirmed impact', tag: 'watch' },
    { time: '06:27', agent: 'inventory', text: 'Cleared 9 stale allocation locks at Penang DC — released 1,140 units', tag: 'auto' },
    { time: '06:33', agent: 'supply',    text: 'Flagged early-warning: Astrel Semi on-time trend −6% over 4 weeks', tag: 'watch' }
  ],

  /* --------------------------------------------------------------------------
     Incident A — demand surge (detect → reason → conflict → auto-act)
  -------------------------------------------------------------------------- */
  incidentA: {
    id: 'INC-0612',
    time: '06:41',
    source: 'Databricks · demand sensing',
    icon: 'D',
    title: 'Demand surge — NX-420, EMEA · +34% week-over-week',
    detail: 'Retail promotion pulled forward by two channel partners. Demand Agent woke on threshold breach and assembled context via the semantic graph — no one pointed it at a worksheet.',
    context: ['9 open orders', '2 DCs · 3 plants', 'Penang capacity @ 87%', 'channel POS feed (Databricks)'],
    conflict: {
      a: { agent: 'demand', name: 'Demand Agent', goal: 'protect service',
           text: 'Reallocate 2,400 units from NA + air expedite the gap.',
           nums: [['service', '98.7%'], ['cost', '+$310K']] },
      b: { agent: 'supply', name: 'Supply Agent', goal: 'protect cost',
           text: 'Hold allocation; add weekend shift at Penang SMT instead.',
           nums: [['service', '93.1%'], ['cost', '+$95K']] },
      resolution: {
        text: 'Hybrid: reallocate 1,100 units + weekend shift + sea-air on one lane. Solved in scenarios TWR-0612-D/S/H by the Supply Planning solver — 0 hard-constraint violations.',
        nums: [['service', '97.2%'], ['cost', '+$142K'], ['margin floor', 'held'], ['confidence', '94%']]
      }
    },
    routing: {
      policy: 'auto-execute if impact ≤ Medium ∧ confidence ≥ 90% ∧ cost ≤ $150K',
      check: 'Medium · 94% · $142K — within autonomous band',
      verdict: 'auto'
    },
    execution: [
      { system: 'SAP S/4HANA',  icon: 'S', action: '2 transfer orders created — NA → EMEA reallocation', ref: 'TO-771204 / 05' },
      { system: 'Planner',      icon: 'M', action: 'Weekend shift added to Penang SMT calendar · scenario TWR-0612-H committed', ref: 'TWR-0612-H' },
      { system: 'GlobalFreight',icon: 'G', action: 'Sea-air booking on SIN → RTM lane', ref: 'GF-90311' },
      { system: 'Salesforce',   icon: 'C', action: 'Allocation notes posted to 2 account teams', ref: 'TASK-90177…78' }
    ]
  },

  /* --------------------------------------------------------------------------
     Incident B — lane down (detect → high impact → escalate to human)
  -------------------------------------------------------------------------- */
  incidentB: {
    id: 'INC-0613',
    time: '06:52',
    source: 'Risk Intelligence',
    icon: 'R',
    title: 'Lane down — Rotterdam rail strike (72h announced)',
    detail: 'Transportation Agent traced the lane through the semantic graph: 5 inbound component shipments affected, feeding 2 strategic customer orders.',
    context: ['5 inbound shipments', '2 strategic orders (Helios Energy, TransCore)', '$1.9M revenue exposure', 'OTD −4.1 pts if unmitigated'],
    routing: {
      policy: 'escalate if strategic-account exposure > $1M ∨ impact = High',
      check: 'High · strategic exposure $1.9M — human decision required',
      verdict: 'esc'
    },
    briefing: {
      situation: 'A 72-hour rail strike closes the Rotterdam inland rail leg from 06:00 tomorrow. Five inbound component shipments ride that leg this week; two feed strategic orders for Helios Energy and TransCore Systems due Jul 21–24.',
      impact: 'Unmitigated: $1.9M revenue at risk and −4.1 pts on-time delivery this month. Constraint check: no plant-side slack available (Penang SMT at 87% with the EMEA surge action just committed).',
      options: [
        { name: 'A · Reroute via Antwerp + partial air', cost: '$67K',  otd: '100% protected', note: '+1 day on 3 non-critical shipments', reco: true,  conf: '91%' },
        { name: 'B · Hold — wait out the strike',        cost: '$0',    otd: '−4.1 pts',       note: 'strike length uncertain; risk compounds', reco: false, conf: '48%' },
        { name: 'C · Full air freight, all 5 shipments', cost: '$148K', otd: '100% protected', note: 'burns 22% of remaining Q3 air budget', reco: false, conf: '89%' }
      ],
      assumptions: 'Antwerp terminal capacity confirmed with GlobalFreight as of 06:49; air slots held until 14:00 CET. All three options pre-simulated in scenarios; zero hard-constraint violations on A and C.',
      recommendation: 'Approve Option A. It protects both strategic orders at 35% of the full-air cost, and the +1-day slip lands only on shipments with buffer.'
    },
    execution: [
      { system: 'GlobalFreight',icon: 'G', action: 'Rebooked 5 shipments — Antwerp terminal + air leg for 2 critical', ref: 'GF-90417' },
      { system: 'SAP S/4HANA',  icon: 'S', action: 'Inbound delivery dates updated on 5 shipments', ref: 'IBD-448291…95' },
      { system: 'Planner',      icon: 'M', action: 'Scenario TWR-0613-A committed — supply plan re-solved', ref: 'TWR-0613-A' },
      { system: 'Salesforce',   icon: 'C', action: 'Heads-up posted to Helios & TransCore account teams', ref: 'TASK-90201…02' }
    ]
  },

  neverDo: 'Boundaries held: no customer order changes, no pricing actions, no direct customer contact — never-do list enforced fleet-wide (0 attempts today).',

  /* --------------------------------------------------------------------------
     Act 5 — fleet Control Plane
  -------------------------------------------------------------------------- */
  registry: [
    { role: 'Lead / arbitration',       model: 'Opus 4.8',  pin: 'pinned · v2026.06.12', note: 'candidate 4.9 in eval sandbox' },
    { role: 'Specialist agents',        model: 'Haiku 4.5', pin: 'pinned · v2026.05.30', note: 'auto-selected per task' },
    { role: 'Forecast explanation',     model: 'Sonnet 5',  pin: 'pinned · v2026.06.02', note: 'customer upgrade window: Aug' },
    { role: 'BYOM slot (customer LLM)', model: 'Azure-hosted', pin: 'sandbox', note: 'evaluation only — no writeback' }
  ],

  consumption: [
    { agent: 'Inventory Agent',        used: 84, budget: 200 },
    { agent: 'Demand Agent',           used: 111, budget: 200 },
    { agent: 'Supply Agent',           used: 74, budget: 150 },
    { agent: 'Transportation Agent',   used: 58, budget: 150 },
    { agent: 'Supplier Risk Agent',    used: 18, budget: 100 },
    { agent: 'Customer Service Agent', used: 13, budget: 100 }
  ],

  audit: [
    { time: '05:12', actor: 'Agent', entry: 'Inventory Agent: safety-stock rebalance Rotterdam → Lyon — coverage floors validated', rollback: true },
    { time: '05:47', actor: 'Agent', entry: 'Transportation Agent: lane re-tender CHI → DAL — carrier SLA check passed', rollback: true },
    { time: '06:41', actor: 'Agent', entry: 'INC-0612 detected (demand surge, EMEA) · context assembled via semantic graph in 1.6 min' },
    { time: '06:44', actor: 'Agent', entry: 'INC-0612 conflict arbitrated: Demand vs Supply → hybrid plan · scenarios TWR-0612-D/S/H · 0 violations' },
    { time: '06:45', actor: 'Agent', entry: 'INC-0612 auto-executed under policy (Medium · 94% · $142K) — 4 writebacks', rollback: true },
    { time: '06:52', actor: 'Agent', entry: 'INC-0613 detected (Rotterdam rail strike) · strategic exposure $1.9M → escalated with briefing' },
    { time: '07:04', actor: 'VP',   entry: 'INC-0613 Option A approved — reroute via Antwerp + partial air' },
    { time: '07:05', actor: 'Agent', entry: 'INC-0613 executed — 4 writebacks · outcome tracking armed', rollback: true },
    { time: '07:05', actor: 'Agent', entry: 'Never-do boundaries: 0 violation attempts fleet-wide today' }
  ],

  sla: [
    { label: 'Signal → context assembled (avg)', value: '1.8 min' },
    { label: 'Auto-resolution success (30d)',    value: '99.1%' },
    { label: 'Escalations with complete briefing', value: '100%' },
    { label: 'Rollbacks invoked (30d)',          value: '2 · both clean' }
  ],

  closing: {
    stats: [
      { label: 'resolved quietly today', value: '42' },
      { label: 'escalated to a human',   value: '2 · 1 decision' },
      { label: 'hard-constraint violations', value: '0' },
      { label: 'tasks vs daily budget',  value: 'on budget' }
    ],
    takeaway: 'Not a copilot. <span>A control tower that runs itself</span> — within the limits you set.'
  }
};
