/* ============================================================================
   Demo — WORLD STATE
   Edit this file to change names, numbers, and story facts.
   No code lives here; app.js renders whatever these objects say.
   ============================================================================ */

const DATA = {

  meta: {
    platform: 'Agent',
    tagline: 'Agentic Supply Chain',
    company: 'Northbridge Electronics',
    persona: 'Maya Chen',
    personaRole: 'Supply Planner',
    runId: 'RUN-1847',
    scenarioPrefix: 'SCN-1847',
    autonomyLevel: 'Supervised',
    clockLabel: 'Tue · 06:40'
  },

  budget: {
    monthlyTasks: 2000,
    usedBeforeRun: 1206,
    runTasks: 50,
    runCostUsd: 24.90
  },

  models: {
    lead:        { name: 'Opus 4.8',  role: 'Lead reasoning',  selection: 'auto-selected' },
    specialists: { name: 'Haiku 4.5', role: 'Specialist agents', selection: 'auto-selected' },
    registryNote: 'Model registry · policy: auto-select per task'
  },

  connectors: [
    { id: 'planner',   name: 'Planning Model', kind: 'Planning',       sync: 'live',        icon: 'M' },
    { id: 'erp',       name: 'SAP S/4HANA',            kind: 'ERP',           sync: 'live · CDC',  icon: 'S' },
    { id: 'crm',       name: 'Salesforce',             kind: 'CRM',           sync: '12 min ago',  icon: 'C' },
    { id: 'outlook',   name: 'Outlook',                kind: 'Email',         sync: '2 min ago',   icon: 'O' },
    { id: 'logistics', name: 'GlobalFreight',          kind: 'Logistics',     sync: '4 min ago',   icon: 'G' },
    { id: 'risk',      name: 'Risk Intelligence',      kind: 'Signals',       sync: '9 min ago',   icon: 'R' }
  ],

  pastRuns: [
    { id: 'RUN-1846', title: 'Capacity breach — Penang SMT Line 3', status: 'Resolved',   when: 'Jul 12' },
    { id: 'RUN-1839', title: 'Demand surge — NX-420 EMEA',          status: 'Resolved',   when: 'Jul 8'  },
    { id: 'RUN-1831', title: 'Supplier risk watch — Astrel Semi',   status: 'Monitoring', when: 'since Jul 1' }
  ],

  /* --------------------------------------------------------------------------
     Act 1 — the three signals and the fused disruption
  -------------------------------------------------------------------------- */
  signals: [
    {
      id: 'sig-outlook',
      system: 'Outlook',
      icon: 'O',
      time: '06:42',
      kind: 'email',
      title: 'Supplier email',
      from: 'K. Tanaka — Astrel Semiconductor',
      subject: 'URGENT: MCU-8347 shipment delay — PO 4500128733',
      body: 'Due to a wafer fab disruption at our Kaohsiung facility, the revised delivery date for PO 4500128733 (24,000 units MCU-8347) is Aug 13 — a 14-day slip. We apologize…',
      extracted: [
        { m: 'part',  t: 'MCU-8347' },
        { m: 'po',    t: 'PO 4500128733' },
        { m: 'delay', t: '+14 days' }
      ]
    },
    {
      id: 'sig-erp',
      system: 'SAP S/4HANA',
      icon: 'S',
      time: '06:47',
      kind: 'asn',
      title: 'ASN change detected',
      fields: [
        ['ASN',        '8000234571'],
        ['PO',         '4500128733'],
        ['Material',   'MCU-8347 · 24,000 EA'],
        ['Delivery',   'Jul 30 → Aug 13 (+14d)']
      ],
      extracted: [
        { m: 'po',    t: 'PO 4500128733' },
        { m: 'part',  t: 'MCU-8347' },
        { m: 'asn',   t: 'ASN 8000234571' },
        { m: 'delay', t: '+14 days' }
      ]
    },
    {
      id: 'sig-logistics',
      system: 'GlobalFreight',
      icon: 'G',
      time: '06:53',
      kind: 'shipment',
      title: 'Shipment ETA slip',
      fields: [
        ['Container', 'MSKU-4471982'],
        ['ASN ref',   '8000234571'],
        ['Route',     'Kaohsiung → Penang'],
        ['Vessel',    'Rebooked · Meridian Star'],
        ['ETA',       'Jul 28 → Aug 11 (+14d)']
      ],
      extracted: [
        { m: 'asn',   t: 'ASN 8000234571' },
        { m: 'cont',  t: 'MSKU-4471982' },
        { m: 'delay', t: '+14 days' }
      ]
    }
  ],

  /* --------------------------------------------------------------------------
     Act 1 — signal correlation: how three signals become ONE disruption.
     Confidence climbs per corroborating source; 90% = confirmation threshold.
  -------------------------------------------------------------------------- */
  correlation: {
    threshold: 90,
    rows: [
      { m: 'delay', label: 'Same delay magnitude — +14 days',              srcs: ['O', 'S', 'G'] },
      { m: 'po',    label: 'Same order — PO 4500128733 · MCU-8347',        srcs: ['O', 'S'] },
      { m: 'asn',   label: 'Same shipment — ASN 8000234571 · MSKU-4471982', srcs: ['S', 'G'] }
    ],
    steps: {
      'sig-outlook':   { conf: 41, note: 'Single source — unverified. The agent holds all action and watches for corroboration.',
                         narrator: 'Read the supplier email and extracted the facts. <b>One source isn’t enough</b> — watching for corroboration…' },
      'sig-erp':       { conf: 78, note: 'Two independent sources agree — same PO, same part, same 14-day slip.',
                         narrator: 'The SAP ASN change matches the email — <b>same PO, same slip</b>. Two independent sources. Confidence rising…' },
      'sig-logistics': { conf: 96, note: 'Three independent sources agree. Confirmation threshold: 90%.',
                         narrator: 'The freight ETA matches the ASN. <b>Three independent sources — crossing the 90% confirmation threshold.</b>' }
    },
    confirmedNarrator: '<b>Confirmed.</b> Disruption record DSR-1847 created — investigating impact. No plan data has been changed.'
  },

  disruption: {
    id: 'DSR-1847',
    severity: 'High',
    confidence: 96,
    title: 'Supply delay — MCU-8347 · +14 days',
    part: 'MCU-8347',
    partDesc: '32-bit secure edge microcontroller',
    supplier: 'Astrel Semiconductor',
    po: '4500128733',
    qty: '24,000 units',
    sources: 3,
    impactPreview: '12 open orders · $4.0M revenue · 3 strategic accounts'
  },

  /* --------------------------------------------------------------------------
     Act 2 — blast radius: affected orders (the runtime recovery worksheet)
     Tier + owner come from Salesforce; order data from the planning model.
  -------------------------------------------------------------------------- */
  worksheet: {
    name: 'MCU-8347 Recovery',
    createdBy: 'Agent · created at runtime',
    sources: 'Planning model · Salesforce · SAP S/4HANA',
    columns: ['Order', 'Customer', 'Tier', 'Product', 'Qty', 'Promise', 'Proj. slip', 'Revenue at risk'],
    provenance: { Tier: 'crm', 'Revenue at risk': 'erp' }
  },

  orders: [
    { id: 'SO-10412', customer: 'Helios Energy',       tier: 'Strategic', product: 'NX-640 Edge Gateway Pro',  qty: 1200, promise: 'Jul 24', slip: 14, revenue: 612000 },
    { id: 'SO-10388', customer: 'TransCore Systems',   tier: 'Strategic', product: 'SG-900 Substation Ctrl',   qty: 850,  promise: 'Jul 27', slip: 12, revenue: 748000 },
    { id: 'SO-10437', customer: 'Meridian Automation', tier: 'Strategic', product: 'NX-640 Edge Gateway Pro',  qty: 900,  promise: 'Jul 29', slip: 12, revenue: 459000 },
    { id: 'SO-10441', customer: 'Baltic Grid',         tier: 'Key',       product: 'NX-420 Edge Gateway',      qty: 1500, promise: 'Jul 31', slip: 11, revenue: 382500 },
    { id: 'SO-10455', customer: 'NovaWater Utilities', tier: 'Key',       product: 'SG-900 Substation Ctrl',   qty: 400,  promise: 'Aug 5',  slip: 10, revenue: 352000 },
    { id: 'SO-10390', customer: 'Corex Industrial',    tier: 'Key',       product: 'NX-420 Edge Gateway',      qty: 1100, promise: 'Aug 3',  slip: 10, revenue: 280500 },
    { id: 'SO-10402', customer: 'Arden Manufacturing', tier: 'Key',       product: 'NX-420 Edge Gateway',      qty: 950,  promise: 'Aug 7',  slip: 9,  revenue: 242250 },
    { id: 'SO-10468', customer: 'Quill Robotics',      tier: 'Standard',  product: 'NX-420 Edge Gateway',      qty: 700,  promise: 'Aug 10', slip: 9,  revenue: 178500 },
    { id: 'SO-10419', customer: 'Fenwick Controls',    tier: 'Standard',  product: 'NX-640 Edge Gateway Pro',  qty: 350,  promise: 'Aug 12', slip: 8,  revenue: 178500 },
    { id: 'SO-10472', customer: 'Osprey Telecom',      tier: 'Standard',  product: 'NX-420 Edge Gateway',      qty: 800,  promise: 'Aug 14', slip: 8,  revenue: 204000 },
    { id: 'SO-10480', customer: 'Delta Farms',         tier: 'Standard',  product: 'NX-420 Edge Gateway',      qty: 450,  promise: 'Aug 18', slip: 8,  revenue: 114750 },
    { id: 'SO-10491', customer: 'Ridgeline Systems',   tier: 'Standard',  product: 'NX-640 Edge Gateway Pro',  qty: 500,  promise: 'Aug 21', slip: 8,  revenue: 250000 }
  ],

  impact: {
    totalRevenue: 4002000,
    strategicRevenue: 1819000,
    strategicAccounts: ['Helios Energy', 'TransCore Systems', 'Meridian Automation'],
    otdNoAction: 68.4,
    products: 3
  },

  /* --------------------------------------------------------------------------
     Act 3 — specialist subagents (spun from reusable skills)
  -------------------------------------------------------------------------- */
  leadAgent: { name: 'Disruption Response Lead', model: 'Opus 4.8' },

  subagents: [
    {
      id: 'supply',
      name: 'Supply Alternatives',
      model: 'Haiku 4.5',
      skills: ['alt-source-discovery', 'supplier-risk-check'],
      steps: ['Scanning qualified alternates…', 'Checking Vantek Components capacity…', 'Verifying substitute qualification…'],
      finding: 'MCU-8351 (qualified substitute, Mar 2026): 6,800 units on hand @ Penang DC. Vantek Components: 5,000 units, 9-day lead, +$0.92/unit.'
    },
    {
      id: 'inventory',
      name: 'Inventory Rebalancing',
      model: 'Haiku 4.5',
      skills: ['multi-site-netting', 'allocation-test'],
      steps: ['Netting on-hand across sites…', 'Testing safety-stock reallocation…', 'Checking coverage policies…'],
      finding: 'Proposes reallocating 3,200 units MCU-8347 from Guadalajara safety stock to cover near-term orders.'
    },
    {
      id: 'logistics',
      name: 'Expedite Options',
      model: 'Haiku 4.5',
      skills: ['expedite-pricing', 'carrier-booking'],
      steps: ['Pricing air uplift Kaohsiung → Penang…', 'Checking carrier slots…', 'Modeling transit times…'],
      finding: 'Air uplift available: 3-day transit @ $8.90/kg; two slots Thursday. Full-ASN expedite ≈ $214K.'
    }
  ],

  conflict: {
    between: ['Inventory Rebalancing', 'Supply Alternatives'],
    issue: 'Inventory proposes pulling 3,200 units of safety stock; that drops SG-900 line coverage below the 3-week policy floor.',
    resolution: 'Lead agent arbitrated: reallocation capped at 1,850 units — coverage policy is a hard constraint.'
  },

  /* How the lead agent turns the specialists' findings (ingredients) into
     candidate plans — the bridge between Act 3 and Act 4 */
  composition: [
    { opt: 'A', title: 'Substitute + targeted expedite',
      recipe: 'MCU-8351 substitute stock (6,800 @ Penang) covers 9 orders; air uplift covers the 2 strategic SG-900 orders',
      from: ['Supply finding', 'Logistics finding'] },
    { opt: 'B', title: 'Dual-source via Vantek',
      recipe: 'Vantek bridge stock (5,000 units · 9-day lead) + the 1,850 units of safety stock the lead approved in arbitration',
      from: ['Supply finding', 'Inventory finding'] },
    { opt: 'C', title: 'Full air expedite',
      recipe: 'Air-freight the entire delayed 24,000-unit ASN ($8.90/kg · ≈ $214K)',
      from: ['Logistics finding'] }
  ],

  /* --------------------------------------------------------------------------
     Act 4 — scenarios & solver results (Supply Planning solver)
  -------------------------------------------------------------------------- */
  solver: {
    name: 'Supply Planning solver',
    runtime: '3.2s',
    scenarios: 3,
    constraintsChecked: ['Capacity (Penang SMT)', 'Safety-stock policy floors', 'Qualified-substitute rules', 'Logistics budget'],
    violations: 0
  },

  scenarios: [
    {
      id: 'BASE', name: 'Baseline (no action)', otd: 68.4, revenueProtected: 0,      cost: 0,      marginImpact: -1310000, violations: 0
    },
    {
      id: 'SCN-1847-A', name: 'A · Substitute + targeted expedite', otd: 97.6, revenueProtected: 3941000, cost: 86400,  marginImpact: -86400,  violations: 0
    },
    {
      id: 'SCN-1847-B', name: 'B · Dual-source via Vantek',         otd: 93.8, revenueProtected: 3552000, cost: 132000, marginImpact: -132000, violations: 0
    },
    {
      id: 'SCN-1847-C', name: 'C · Full air expedite',              otd: 98.2, revenueProtected: 4002000, cost: 214000, marginImpact: -214000, violations: 0
    }
  ],

  scorecard: {
    title: 'Scenario comparison — DSR-1847 recovery options',
    note: 'Computed per scenario by planning solvers · baseline = no action',
    metrics: [
      { label: 'On-time delivery (affected orders)', key: 'otd',              fmt: 'pct'   },
      { label: 'Revenue protected',                  key: 'revenueProtected', fmt: 'usd'   },
      { label: 'Incremental cost',                   key: 'cost',             fmt: 'usd'   },
      { label: 'Margin impact',                      key: 'marginImpact',     fmt: 'usd'   },
      { label: 'Hard-constraint violations',         key: 'violations',       fmt: 'int'   }
    ]
  },

  /* --------------------------------------------------------------------------
     Act 5 — ranked recommendations + memory
  -------------------------------------------------------------------------- */
  memory: {
    preference: 'Maya prefers qualified part substitution over expedited freight (learned 2026-03-12 · reaffirmed 2026-05-02)',
    precedent: {
      label: 'Decision precedent',
      text: 'Mar 2026 — Astrel slipped MCU-8214 by 10 days. You substituted MCU-8218 on 7 orders: 100% OTD, $0 expedite. Approved in 4 minutes.'
    }
  },

  recommendations: [
    {
      rank: 1, scenario: 'SCN-1847-A', confidence: 92,
      title: 'Substitute MCU-8351 + targeted expedite',
      summary: 'Switch 9 orders (NX-420 / NX-640) to qualified substitute MCU-8351 from Penang stock; air-expedite the delayed ASN portion covering the 2 SG-900 strategic orders; 1 order absorbs slip within customer tolerance.',
      protects: 3941000, cost: 86400, otd: 97.6,
      tradeoffs: ['Firmware re-validation batch adds 2 days to NX-640 line start', 'Substitute unit cost +$0.85'],
      precedent: true
    },
    {
      rank: 2, scenario: 'SCN-1847-B', confidence: 84,
      title: 'Dual-source via Vantek Components',
      summary: 'Bridge with 5,000 units from Vantek (9-day lead, +$0.92/unit) while the Astrel ASN lands; reallocate 1,850 units of safety stock to nearest promises.',
      protects: 3552000, cost: 132000, otd: 93.8,
      tradeoffs: ['New-lot qualification risk on Vantek bridge', '3 standard-tier orders still slip 4–6 days']
    },
    {
      rank: 3, scenario: 'SCN-1847-C', confidence: 88,
      title: 'Full air expedite of delayed ASN',
      summary: 'Air-freight the entire 24,000-unit shipment; protects everything, at the highest cost.',
      protects: 4002000, cost: 214000, otd: 98.2,
      tradeoffs: ['Consumes 38% of Q3 logistics budget', 'Does nothing about Astrel supply fragility']
    }
  ],

  /* --------------------------------------------------------------------------
     Act 6 — approval gate & execution receipts
  -------------------------------------------------------------------------- */
  approval: {
    option: 'Option A — Substitute MCU-8351 + targeted expedite',
    gated: [
      { system: 'Planner',      icon: 'M', action: 'Commit scenario SCN-1847-A to Enterprise baseline',              risk: 'Medium' },
      { system: 'SAP S/4HANA',  icon: 'S', action: 'Revise 3 scheduled receipts · substitute MCU-8351 on 9 planned orders', risk: 'High' },
      { system: 'SAP S/4HANA',  icon: 'S', action: 'Update promise dates on 12 sales orders',                        risk: 'High' },
      { system: 'GlobalFreight',icon: 'G', action: 'Book air expedite — 2 shipments (SG-900 orders) · est. $18.7K',  risk: 'Medium' }
    ],
    auto: [
      { system: 'Salesforce',   icon: 'C', action: 'Notify account teams — 3 strategic accounts', risk: 'Low' },
      { system: 'Agent',         icon: 'W', action: 'Generate S&OP-ready impact summary',          risk: 'Low' }
    ],
    held: [
      { system: 'Outlook',      icon: 'O', action: 'Supplier follow-up email to Astrel — drafted', note: 'Requires your sign-off before sending' }
    ],
    neverDo: [
      'Cancel customer sales orders',
      'Change customer pricing',
      'Contact customers directly'
    ]
  },

  execution: [
    { id: 'x-planner', system: 'Planner',       icon: 'M', action: 'Scenario SCN-1847-A committed to Enterprise baseline', ref: 'SCN-1847-A' },
    { id: 'x-receipts',system: 'SAP S/4HANA',   icon: 'S', action: '3 scheduled receipts revised · MCU-8351 on 9 planned orders', ref: 'PO 4500128733' },
    { id: 'x-dates',   system: 'SAP S/4HANA',   icon: 'S', action: 'Promise dates updated on 12 sales orders', ref: 'Δ avg +1.8 days' },
    { id: 'x-crm',     system: 'Salesforce',    icon: 'C', action: 'Account-team tasks created — Helios, TransCore, Meridian', ref: 'TASK-88231…33' },
    { id: 'x-freight', system: 'GlobalFreight', icon: 'G', action: 'Air expedite booked — 2 shipments, Thu uplift', ref: 'GF-88213' },
    { id: 'x-sop',     system: 'Agent',          icon: 'W', action: 'S&OP impact summary generated', ref: 'DSR-1847_Impact.pptx' },
    { id: 'x-email',   system: 'Outlook',       icon: 'O', action: 'Supplier follow-up drafted — awaiting your sign-off', ref: 'draft', held: true }
  ],

  emailDraft: {
    to: 'K. Tanaka <k.tanaka@astrel-semi.com>',
    cc: 'supply-ops@northbridge-elec.com',
    subject: 'RE: MCU-8347 shipment delay — PO 4500128733 · recovery actions & requests',
    body: [
      'Kenji,',
      'Thank you for the early notice on the MCU-8347 slip. We have activated our recovery plan and adjusted downstream commitments accordingly. To support our plan, we request:',
      '1. Confirmation of the revised Aug 13 delivery for the full 24,000 units on PO 4500128733;',
      '2. Partial early release of any completed stock — we have air uplift booked Thursday (ref GF-88213) and can absorb up to 6,000 units;',
      '3. A root-cause summary of the Kaohsiung fab disruption and expected recurrence risk for Q3, for our supplier review.',
      'Please treat the partial-release request as time-critical: our booking window closes Wednesday 18:00 TST.',
      'Regards,',
      'Maya Chen · Supply Planning, Northbridge Electronics'
    ],
    footer: 'Drafted by the agent · reviewed content only — will not send without sign-off'
  },

  /* --------------------------------------------------------------------------
     Act 7 — Control Plane: audit, cost, learning, SLAs
  -------------------------------------------------------------------------- */
  audit: [
    { time: '06:53', actor: 'Agent', entry: 'Disruption DSR-1847 confirmed — 3 corroborating sources (Outlook, SAP ASN, GlobalFreight) · confidence 96%' },
    { time: '06:54', actor: 'Agent', entry: 'Impact assessment started · semantic graph traversal: MCU-8347 → 2 BOMs → 3 products → 12 sales orders' },
    { time: '08:14', actor: 'Maya', entry: 'Joined run · asked for impact assessment' },
    { time: '08:14', actor: 'Agent', entry: 'Runtime worksheet "MCU-8347 Recovery" created · sources: Planner, Salesforce, SAP' },
    { time: '08:16', actor: 'Agent', entry: 'Delegated to 3 specialist agents (reusable skills) · arbitration: safety-stock pull capped at 1,850 units (policy floor)' },
    { time: '08:18', actor: 'Agent', entry: '3 scenarios simulated via Supply Planning solver · 0 hard-constraint violations · assumption: MCU-8351 requal batch passes (same silicon rev as Mar 2026)' },
    { time: '08:19', actor: 'Agent', entry: 'Recommended Option A (confidence 92%) · precedent: Mar 2026 MCU-8214 substitution' },
    { time: '08:22', actor: 'Maya', entry: 'Approved Option A — 4 gated actions authorized', rollback: false },
    { time: '08:22', actor: 'Agent', entry: 'Writeback: SAP receipts revised · PO 4500128733', rollback: true },
    { time: '08:22', actor: 'Agent', entry: 'Writeback: promise dates updated · 12 sales orders', rollback: true },
    { time: '08:23', actor: 'Agent', entry: 'GlobalFreight expedite booked · GF-88213', rollback: true },
    { time: '08:23', actor: 'Agent', entry: 'Policy hold: supplier email awaiting sign-off · never-do list enforced (0 attempts)' }
  ],

  learning: {
    outcome: 'Outcome tracking armed: OTD on 12 affected orders, requal batch result, expedite cost vs estimate — feeds back at Aug month-end.',
    stored: 'Precedent stored: Astrel slip → substitution preferred when qualified alternate exists.'
  },

  sla: [
    { label: 'Detection → confirmed', value: '11 min' },
    { label: 'Confirmed → recommendation', value: '86 min (unattended)' },
    { label: 'Run success rate (30d)', value: '98.6%' },
    { label: 'Recommendations accepted (30d)', value: '41 of 47' }
  ],

  closing: {
    stats: [
      { label: 'Inbound email became', value: 'a governed recovery' },
      { label: 'Revenue protected',    value: '$3.94M of $4.0M' },
      { label: 'Incremental cost',     value: '$86.4K' },
      { label: 'Screens Maya built',   value: '0' }
    ]
  }
};
