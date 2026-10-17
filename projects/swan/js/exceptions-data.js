/* ============================================================================
   SWAN Exception Management Demo — WORLD STATE
   Persona: Arjun, supply planner. Monday morning, the plan has just run.
   Same Northbridge Electronics world as the other two demos.
   Edit this file to change names, numbers, and story facts.
   ============================================================================ */

const XDATA = {

  meta: {
    subtitle: 'Exception Management',
    persona: 'Arjun Mehta',
    personaRole: 'Supply Planner',
    clockStart: 'Mon · 07:02',
    planRun: 'Enterprise plan run completed 06:58 · full net-change',
    dailyTaskBudget: 1000,
    tasksAtOpen: 118
  },

  connectors: [
    { id: 'planner',   name: 'Planning Model', kind: 'Planning',    sync: 'live',       icon: 'M' },
    { id: 'erp',       name: 'SAP S/4HANA',            kind: 'ERP',        sync: 'live · CDC', icon: 'S' },
    { id: 'crm',       name: 'Salesforce',             kind: 'CRM',        sync: '9 min ago',  icon: 'C' },
    { id: 'outlook',   name: 'Outlook',                kind: 'Email',      sync: '3 min ago',  icon: 'O' },
    { id: 'logistics', name: 'GlobalFreight',          kind: 'Logistics',  sync: '5 min ago',  icon: 'G' },
    { id: 'risk',      name: 'Risk Intelligence',      kind: 'Signals',    sync: '7 min ago',  icon: 'R' }
  ],

  /* --------------------------------------------------------------------------
     Act 1 — the wall of exceptions, read the instant the run finished
  -------------------------------------------------------------------------- */
  totals: { exceptions: 812, cleared: 760, rootIssues: 14, staged: 6, review: 8 },

  exceptionTypes: [
    ['Past-due orders', 291],
    ['Projected shortages', 214],
    ['Capacity overloads', 118],
    ['Late supply', 96],
    ['Safety-stock breaches', 58],
    ['Constraint violations', 35]
  ],

  /* Where the 812 went — one linear pass, no double-counting:
     187 + 80 + 545 = 812 (the ledger accounts for everything);
     inside the 545: 493 symptoms (cleared with their root) + 52 headline
     exceptions (they ARE the 14 issue cards). Cleared = 187 + 80 + 493 = 760. */
  clearing: [
    { n: 187, label: 'Already fixed — by this very plan run',
      text: 'Last week’s exceptions that the new run re-netted away. The agent verified each one is genuinely closed, and logged it. Nothing to do.' },
    { n: 80,  label: 'Too small to matter — below the materiality floor',
      text: 'Real, but under the $25K impact floor Arjun configured. Retired with an audit trace; they resurface automatically if they grow.' },
    { n: 545, label: 'The real signal — facets of just 14 underlying problems',
      text: 'The semantic graph traces cause and effect: one supplier slip → a shortage → dozens of late orders. 493 of these are knock-on symptoms — cleared, because they resolve the moment their root is fixed. The other 52 are the headline exceptions, and they become the 14 issue cards below.' }
  ],

  /* --------------------------------------------------------------------------
     Act 2 — clustering: the 14 root issues (top 5 shown; counts = primaries +
     symptoms tagged to each root; top 5 = 468, remaining 9 issues = 77)
  -------------------------------------------------------------------------- */
  clusters: [
    { id: 'RI-01', name: 'Astrel MCU-8347 delay ripple',        detail: '186 exceptions · 3 products · 18 orders', revenue: 1200000 },
    { id: 'RI-02', name: 'Penang SMT overload — week 29',        detail: '104 exceptions · 1 site · 11 orders',     revenue: 940000 },
    { id: 'RI-03', name: 'NX-640 shortage — EMEA',               detail: '88 exceptions · 2 DCs · 9 orders',        revenue: 710000 },
    { id: 'RI-04', name: 'Lane degradation RTM → LYS',           detail: '52 exceptions · 5 shipments',             revenue: 520000 },
    { id: 'RI-05', name: 'Vantek PO 4500129102 past-due 6 days', detail: '38 exceptions · 2 products',              revenue: 430000 }
  ],
  clustersMore: '+ 9 more root issues covering the remaining 77 exceptions · all ranked by revenue & service impact (account value from Salesforce)',

  /* --------------------------------------------------------------------------
     Act 3 — investigation: lead splits 14 issues → 3 workstreams (6 + 4 + 4);
     each issue gets its own runtime worksheet (ws increments sum to 14)
  -------------------------------------------------------------------------- */
  delegation: 'The lead agent splits the 14 root issues into 3 workstreams and assigns each to a specialist. For every issue, the specialist builds a runtime investigation worksheet and digs in: what changed, what’s driving it, what’s downstream.',

  investigators: [
    {
      name: 'Supply Investigator', model: 'Haiku 4.5', count: 6,
      assigned: 'RI-01 · RI-04 · RI-05 · RI-07 + 2 minor',
      skills: ['root-cause-trace', 'supplier-history'],
      steps: [
        { text: 'RI-01 Astrel ripple — tracing what changed through 2 BOMs…', ws: 2 },
        { text: 'RI-05 Vantek PO — no ASN on file: checking acknowledgment history…', ws: 2 },
        { text: 'RI-04 lane SLA + RI-07 sourcing gap + 2 minor…', ws: 2 }
      ],
      finding: '2 of my 6 issues share one root: the Astrel MCU-8347 slip. Vantek past-due is unacknowledged — no ASN yet.',
      minor: '2 minor issues: late-supply acknowledgments already confirmed by the suppliers — cleared on verification.',
      detail: [
        { id: 'RI-01', name: 'Astrel MCU-8347 delay ripple', revenue: '$1.2M',
          changed: 'Astrel ASN 8000234571 (PO 4500128733) moved Jul 30 → Aug 13 — a 14-day slip on 24,000 units of MCU-8347.',
          driving: 'MCU-8347 feeds 2 BOMs → 3 products (NX-420, NX-640, SG-900). No qualified stock at Penang beyond W29.',
          downstream: '18 sales orders slip 8–14 days across 3 products — $1.2M revenue, incl. Helios Energy & TransCore (strategic).',
          note: 'Candidates handed to the solver: substitute MCU-8351 (qualified Mar 2026) · Vantek bridge stock · expedite.' },
        { id: 'RI-05', name: 'Vantek PO 4500129102 past-due', revenue: '$430K',
          changed: 'Due Jul 10 — 6 days past due. No ASN, no acknowledgment, no response to the automated reminder.',
          driving: 'Pattern match (supplier-history skill): the same silence preceded the Astrel slip in March.',
          downstream: '2 products constrained from W30; $430K at risk if this slips 10+ days.' },
        { id: 'RI-04', name: 'Lane degradation RTM → LYS', revenue: '$520K',
          changed: 'Carrier on-time on this lane fell to 61% over 3 weeks (SLA: 95%).',
          driving: 'Carrier capacity reassigned to a larger account — Risk Intelligence note, Jul 12.',
          downstream: '5 shipments ride the lane this week; $520K of orders are promise-dated against them.' },
        { id: 'RI-07', name: 'SG-900 single-source exposure', revenue: '$310K',
          changed: 'Risk watch elevated the supplier’s region twice this month (typhoon path).',
          driving: 'The SG-900 controller uses a single-sourced part — no qualified alternate on file.',
          downstream: 'No orders hit yet; exposure ≈ $310K per quarter if the region disrupts.' }
      ]
    },
    {
      name: 'Capacity Investigator', model: 'Haiku 4.5', count: 4,
      assigned: 'RI-02 + 3 minor overloads',
      skills: ['load-analysis', 'shift-modeling'],
      steps: [
        { text: 'RI-02 Penang SMT — profiling load W28–W31…', ws: 1 },
        { text: 'RI-02 — finding movable orders & weekend-shift headroom…', ws: 1 },
        { text: '3 minor overloads — checked: self-resolving in W30…', ws: 2 }
      ],
      finding: 'W29 overload is 112% — 3 orders movable to W30 without service impact; weekend shift covers the rest.',
      minor: '3 minor overloads (W30–W31, under 4% each): confirmed self-resolving as the surge passes — no action needed.',
      detail: [
        { id: 'RI-02', name: 'Penang SMT overload — week 29', revenue: '$940K',
          changed: 'The net-change run pulled 6 EMEA surge orders into W29 — load jumped from 96% to 112% overnight.',
          driving: 'Load by week: W28 96% · W29 112% · W30 84% · W31 79%. The overload is exactly one week wide.',
          downstream: '11 orders at risk of slipping; $940K. 3 of them carry 6+ days of customer buffer — they can move.',
          note: 'Candidates handed to the solver: move 3 buffered orders to W30 · add one weekend shift · offload to Guadalajara.' }
      ]
    },
    {
      name: 'Demand/Allocation Investigator', model: 'Haiku 4.5', count: 4,
      assigned: 'RI-03 · RI-06 · RI-08 + 1 minor',
      skills: ['allocation-test', 'forecast-diff'],
      steps: [
        { text: 'RI-03 NX-640 EMEA — netting regions, checking APAC buffer…', ws: 2 },
        { text: 'RI-06 — diffing channel override vs POS actuals…', ws: 1 },
        { text: 'RI-08 cancellation — preparing impact summary + 1 minor…', ws: 1 }
      ],
      finding: 'APAC buffer can cover the EMEA shortage at 96% service; the channel forecast override conflicts with POS actuals.',
      minor: '1 minor issue: a stale allocation lock — root-caused to a batch-job overlap and already cleared.',
      detail: [
        { id: 'RI-03', name: 'NX-640 shortage — EMEA', revenue: '$710K',
          changed: 'EMEA DC coverage dropped below target after the W29 surge orders committed.',
          driving: 'NX-640 demand up 18% in EMEA; meanwhile the APAC buffer sits 31% above its floor through W32.',
          downstream: '9 orders / $710K; without action, EMEA service falls to 89% in W30.',
          note: 'Candidates handed to the solver: re-allocate 640 units from APAC · re-allocate 400 + partial expedite.' },
        { id: 'RI-06', name: 'Forecast override conflict — EMEA channel', revenue: '$340K',
          changed: 'Channel override is 22% above POS actuals — the 4th consecutive week it has missed high.',
          driving: 'The override was entered ahead of a promo that was later postponed; the statistical + POS blend tracks actuals.',
          downstream: '$340K of projected excess inventory by W33 if the override stands.' },
        { id: 'RI-08', name: 'SO-10502 — customer cancellation request', revenue: '$290K',
          changed: 'Osprey Telecom requested cancellation of SO-10502 ($290K) through the account team.',
          driving: 'Never-do policy: order cancellation is never automated. Impact summary prepared — no action taken.',
          downstream: 'If Arjun cancels in ERP: the freed supply partially covers RI-03; no penalty under contract terms.' }
      ]
    }
  ],

  /* --------------------------------------------------------------------------
     Act 4 — resolve: 14 issues → 41 candidates → 29 survive → 14 recommendations
  -------------------------------------------------------------------------- */
  solver: {
    candidates: 41,
    survived: 29,
    recommendations: 14,
    intro: 'For each investigated issue, the specialists propose candidate fixes — pull-ins, re-allocations, alternate sourcing, expedites. 41 candidates across the 14 issues, roughly 3 per issue. None of them is a recommendation yet.',
    rejectedNote: '12 candidates rejected in simulation — each fixed its own issue but broke something else: a capacity limit, a safety-stock floor, or a budget. They never reach Arjun.',
    survivorsNote: 'Of the 29 that pass: the best option per issue becomes the recommendation — the runners-up appear as the “alternatives” in Arjun’s briefing.',
    example: 'Example — RI-01 Astrel ripple: 4 candidates → 1 rejected (spot buy breaks the Q3 budget) → 3 survive → “pull-in + substitute” recommended; the other 2 become the alternatives on that card.',
    constraints: ['Capacity (3 sites)', 'Safety-stock floors', 'Qualified-substitute rules', 'Logistics & expedite budgets']
  },

  /* --------------------------------------------------------------------------
     Act 5 — the briefing Arjun opens
  -------------------------------------------------------------------------- */
  memory: 'Sorted the queue by revenue at risk and lead with pull-ins over spot buys — 9 of your last 11 approvals preferred it. Grouped Astrel items first; you always work supplier issues top-down.',

  staged: [
    { text: 'Re-netted 187 date/qty syncs to ERP after supplier ASN confirmations', revenue: 'no revenue impact' },
    { text: 'Acknowledged 3 past-due POs with confirmed new dates — plan aligned', revenue: '$118K protected' },
    { text: 'Rebalanced safety stock at 4 DCs — floors restored, no expedites', revenue: '$380K protected' },
    { text: 'Cleared 22 phantom shortages from a stale allocation lock (root: batch job overlap)', revenue: 'noise removed' },
    { text: 'Accepted 9 low-impact date slips within customer tolerance windows', revenue: '$74K · within policy' },
    { text: 'Retired 80 exceptions below your $25K materiality floor', revenue: 'below floor' }
  ],

  /* the 8 that need Arjun — #3 is the one he adjusts; #8 is the never-do hold */
  review: [
    {
      id: 'RI-01', title: 'Astrel MCU-8347 ripple — 18 late orders', sub: '3 products · Helios, TransCore + 8 others',
      revenue: 1200000, confidence: 91,
      reco: 'Pull in Vantek bridge stock (2,100 units) + substitute MCU-8351 on 6 orders',
      why: 'Same root as March: supplier slip with a qualified substitute available. Substitution clears 6 orders at zero expedite; Vantek pull-in covers the rest 4 days early.',
      precedent: 'matches your playbook — Mar 2026 substitution, 100% OTD',
      alts: [{ label: 'Recommended: pull-in + substitute · $38K', sel: true }, { label: 'Alt: full expedite · $96K' }, { label: 'Alt: reschedule 18 orders · $0, −2.1 OTD pts' }]
    },
    {
      id: 'RI-02', title: 'Penang SMT overload — week 29 at 112%', sub: '11 orders · 1 site',
      revenue: 940000, confidence: 88,
      reco: 'Move 3 flexible orders to W30 + add one weekend shift',
      why: 'The 3 moved orders have 6+ days of customer buffer; weekend shift absorbs the remaining 7% overload. Solver confirms no downstream capacity ripple.',
      alts: [{ label: 'Recommended: move + shift · $19K', sel: true }, { label: 'Alt: offload to Guadalajara · $44K + 9 days' }]
    },
    {
      id: 'RI-03', title: 'NX-640 shortage — EMEA DCs', sub: '9 orders · 2 DCs',
      revenue: 710000, confidence: 86,
      reco: 'Re-allocate 640 units from APAC buffer (96% service both regions)',
      why: 'APAC buffer sits 31% above floor through W32. Re-allocation clears EMEA with no purchase; solver holds both regions above target.',
      alts: [{ label: 'Recommended: re-allocate · $8K freight', sel: true }, { label: 'Alt: re-allocate 400 + partial expedite · $26K, 99% EMEA service' }]
    },
    {
      id: 'RI-04', title: 'Lane degradation RTM → LYS', sub: '5 shipments · carrier SLA breach',
      revenue: 520000, confidence: 90,
      reco: 'Reroute 5 shipments via alternate carrier — transit +0.5 days',
      why: 'Current carrier at 61% on-time for 3 weeks. Alternate carrier holds 94% on this lane with capacity confirmed.',
      alts: [{ label: 'Recommended: reroute · $11K', sel: true }, { label: 'Alt: stay + add buffer to promises · $0, −1.4 OTD pts' }]
    },
    {
      id: 'RI-05', title: 'Vantek PO past-due 6 days — unacknowledged', sub: '2 products · no ASN on file',
      revenue: 430000, confidence: 84,
      reco: 'Expedite request + supplier escalation email (drafted, awaiting sign-off)',
      why: 'No ASN and no acknowledgment is the risk pattern that preceded the March slip. Draft asks for confirmation in 24h and offers split delivery.',
      alts: [{ label: 'Recommended: expedite + escalate', sel: true }, { label: 'Alt: trigger alt-source now · $52K premium' }]
    },
    {
      id: 'RI-06', title: 'Forecast override conflict — EMEA channel', sub: 'NX-420 · override 22% above POS actuals',
      revenue: 340000, confidence: 82,
      reco: 'Revert to statistical + POS blend; flag override author in S&OP notes',
      why: 'Channel override has missed 4 consecutive weeks high. Blend reduces projected excess by $340K without touching firm orders.',
      alts: [{ label: 'Recommended: revert to blend', sel: true }, { label: 'Alt: keep override, add review task' }]
    },
    {
      id: 'RI-07', title: 'SG-900 component dual-sourcing gap', sub: 'single-sourced part flagged by risk watch',
      revenue: 310000, confidence: 80,
      reco: 'Open qualification for second source (Corvid Micro) — no plan change yet',
      why: 'Risk watch elevated the supplier region twice this month. Qualification now avoids a forced spot buy later; zero cost until PO stage.',
      alts: [{ label: 'Recommended: open qualification', sel: true }, { label: 'Alt: defer to next quarterly review' }]
    },
    {
      id: 'RI-08', title: 'SO-10502 — customer requested cancellation', sub: 'Osprey Telecom · $290K · never-do list',
      revenue: 290000, confidence: null, held: true,
      reco: 'HELD — cancelling a customer order is on the never-do list; requires your explicit action in ERP',
      why: 'SWAN prepared the impact summary (freed supply covers RI-03 partially) but will not execute or recommend automation for order cancellation.',
      alts: []
    }
  ],

  adjust: { item: 'RI-03', altIndex: 1, note: 'Arjun prefers 99% EMEA service on strategic accounts this quarter' },

  /* --------------------------------------------------------------------------
     Act 6 — execution
  -------------------------------------------------------------------------- */
  execution: [
    { system: 'Planner',       icon: 'M', action: '7 resolution scenarios committed to Enterprise plan', ref: 'XMG-0715-01…07' },
    { system: 'SAP S/4HANA',   icon: 'S', action: 'Revised dates & quantities on 41 orders · 2 transfer orders', ref: 'Δ 41 orders' },
    { system: 'SAP S/4HANA',   icon: 'S', action: 'Expedite request created on Vantek PO 4500129102', ref: 'PO 4500129102' },
    { system: 'GlobalFreight', icon: 'G', action: '5 shipments rebooked to alternate carrier', ref: 'GF-91188' },
    { system: 'Salesforce',    icon: 'C', action: 'Account teams notified — 6 affected strategic/key accounts', ref: 'TASK-91240…45' },
    { system: 'Outlook',       icon: 'O', action: 'Vantek escalation email — awaiting your sign-off', ref: 'draft', held: true },
    { system: 'SWAN',          icon: 'W', action: 'SO-10502 cancellation — held for explicit human action (never-do)', ref: 'policy', held: true }
  ],

  autoNote: '6 staged resolutions auto-applied within your autonomy level (low-risk, ≤$25K, no strategic accounts). The 7 you approved executed on sign-off.',

  /* --------------------------------------------------------------------------
     Act 7 — govern & learn
  -------------------------------------------------------------------------- */
  audit: [
    { time: '06:58', actor: 'SWAN', entry: 'Plan run detected complete — began reading 812 exceptions (plan, ERP, supplier signals via MCP)' },
    { time: '07:03', actor: 'SWAN', entry: 'Clustered 812 exceptions → 14 root issues via semantic graph · 493 symptom links traced' },
    { time: '07:04', actor: 'SWAN', entry: 'Ranked by revenue & service impact — account value from Salesforce' },
    { time: '07:11', actor: 'SWAN', entry: '14 investigation worksheets created at runtime · 3 specialists from reusable skills' },
    { time: '07:19', actor: 'SWAN', entry: '41 candidate resolutions simulated (planning solver) · 29 survived hard constraints', rollback: false },
    { time: '07:21', actor: 'SWAN', entry: '6 low-risk resolutions staged & auto-applied within autonomy level', rollback: true },
    { time: '07:22', actor: 'SWAN', entry: 'Briefing prepared: 760 cleared · 6 staged · 8 for review — queued for Arjun' },
    { time: '08:07', actor: 'Arjun', entry: 'Adjusted RI-03: re-allocate 400 + partial expedite (99% EMEA service)' },
    { time: '08:08', actor: 'Arjun', entry: 'Approved 7 of 8 — SO-10502 cancellation retained for manual ERP action' },
    { time: '08:08', actor: 'SWAN', entry: 'Executed 5 writebacks across Planner, SAP, GlobalFreight, Salesforce', rollback: true },
    { time: '08:09', actor: 'SWAN', entry: 'Outcome tracking armed on all 14 root issues · results feed the learning loop at month-end' }
  ],

  learning: [
    { k: 'Pull-in recommendations accepted (90d)', v: '89% — auto-apply proposal pending your OK' },
    { k: 'Phantom-shortage pattern (batch overlap)', v: 'learned · now auto-cleared' },
    { k: 'Exceptions per run, trailing 8 Mondays', v: '1,040 → 812 (−22%)' }
  ],

  budget: { runTasks: 68, estCost: 33.86 },

  sla: [
    { label: 'Run complete → briefing ready', value: '24 min (unattended)' },
    { label: 'Exceptions cleared before review', value: '93.6%' },
    { label: 'Recommendation acceptance (30d)', value: '87%' }
  ],

  closing: {
    stats: [
      { label: 'exceptions this run', value: '812' },
      { label: 'cleared before Arjun sat down', value: '760' },
      { label: 'decisions that needed a human', value: '8' },
      { label: 'time to cleared queue', value: '08:09 Mon' }
    ],
    takeaway: 'Exception management: from a Monday-long grind to <span>a reviewed, governed, mostly-cleared queue before the first meeting.</span>'
  }
};
