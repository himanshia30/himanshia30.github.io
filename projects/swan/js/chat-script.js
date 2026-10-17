/* ============================================================================
   SWAN Demo — CONVERSATION SCRIPT
   Edit this file to change the chat narrative, reasoning steps, and beats.
   Text supports **bold**; blank line = new paragraph.
   ============================================================================ */

const SCRIPT = {

  /* Scripted user messages (typing is keystroke-independent: any keys the
     player steps produce these, character by character). */
  questions: {
    q1: 'How bad is this?',
    q2: 'What are our options?',
    q3: 'Why not just expedite everything?'
  },

  /* --------------------------------------------------------------------------
     Beats — the guided state machine. Triggers:
       'advance' : the player's Next step (or the designated click target)
       'input'   : scripted chat message typed and sent by the player
       'auto'    : runs immediately after the previous beat completes
  -------------------------------------------------------------------------- */
  beats: [
    { id: 0,  view: 'console',   action: 'opening',    trigger: 'start'   },
    { id: 1,  view: 'console',   action: 'signal',     trigger: 'advance', signal: 'sig-outlook'   },
    { id: 2,  view: 'console',   action: 'signal',     trigger: 'advance', signal: 'sig-erp'       },
    { id: 3,  view: 'console',   action: 'signal',     trigger: 'advance', signal: 'sig-logistics' },
    { id: 4,  view: 'console',   action: 'fuse',       trigger: 'advance' },
    { id: 5,  view: 'workspace', action: 'agentTurn',  trigger: 'advance', turn: 'briefing', clickTarget: 'disruption card' },
    { id: 6,  view: 'workspace', action: 'userInput',  trigger: 'input',   question: 'q1' },
    { id: 7,  view: 'workspace', action: 'agentTurn',  trigger: 'auto',    turn: 'impact' },
    { id: 8,  view: 'workspace', action: 'userInput',  trigger: 'input',   question: 'q2' },
    { id: 9,  view: 'workspace', action: 'agentTurn',  trigger: 'auto',    turn: 'orchestration' },
    { id: 10, view: 'workspace', action: 'agentTurn',  trigger: 'advance', turn: 'solver' },
    { id: 11, view: 'workspace', action: 'agentTurn',  trigger: 'advance', turn: 'recommend' },
    { id: 12, view: 'workspace', action: 'userInput',  trigger: 'input',   question: 'q3' },
    { id: 13, view: 'workspace', action: 'agentTurn',  trigger: 'auto',    turn: 'explain' },
    { id: 14, view: 'workspace', action: 'approval',   trigger: 'advance', clickTarget: 'Proceed with Option A' },
    { id: 15, view: 'workspace', action: 'execution',  trigger: 'advance', clickTarget: 'Approve & execute' },
    { id: 16, view: 'workspace', action: 'agentTurn',  trigger: 'advance', turn: 'wrapup' },
    { id: 17, view: 'workspace', action: 'controlPlane', trigger: 'advance', clickTarget: 'View in Control Plane' }
  ],

  /* --------------------------------------------------------------------------
     Agent turns: reasoning steps (rendered with spinners + logged to the
     activity trace) followed by streamed text and cards.
  -------------------------------------------------------------------------- */
  turns: {

    briefing: {
      steps: [
        { tool: 'swan.load_context', system: 'SWAN', label: 'Resuming run context · memory: 2 relevant items', ms: 90 }
      ],
      text: 'Good morning, Maya. While you were out I confirmed a supply disruption: **Astrel Semiconductor has slipped MCU-8347 by 14 days** (PO 4500128733 · 24,000 units).\n\nI verified it across **three independent sources** — the supplier email, the matching ASN change in SAP, and the freight ETA slip — before flagging it. Confidence: **96%**.\n\nI’ve started assessing impact. **No plan data has been changed.**',
      cards: []
    },

    impact: {
      steps: [
        { tool: 'planner.trace_dependencies', system: 'Planner',    label: 'Walking semantic graph: MCU-8347 → 2 BOMs → 3 products → sales orders', ms: 340 },
        { tool: 'planner.query',              system: 'Planner',    label: 'Netting on-hand, in-transit and safety stock across 3 sites',            ms: 180 },
        { tool: 'crm.get_accounts',           system: 'Salesforce', label: 'Enriching 12 affected customers with tier and account owner',            ms: 410 },
        { tool: 'planner.create_worksheet',   system: 'Planner',    label: 'Composing runtime worksheet “MCU-8347 Recovery”',              ms: 220 }
      ],
      text: 'Significant, but recoverable. The slip touches **12 open sales orders worth $4.0M** across 3 products — and **$1.82M of it sits with your 3 strategic accounts** (Helios Energy, TransCore, Meridian Automation).\n\nWithout action, on-time delivery on the affected orders drops to **68.4%**.\n\nNobody had a worksheet for this, so I built one — every affected order with promise dates, projected slip, and revenue at risk, enriched from Salesforce:',
      cards: ['blastRadius']
    },

    orchestration: {
      steps: [
        { tool: 'swan.decompose_goal', system: 'SWAN', label: 'Decomposing goal: protect revenue & OTD within cost policy → 3 workstreams', ms: 120 },
        { tool: 'swan.spawn_agents',   system: 'SWAN', label: 'Spinning up 3 specialists from reusable skills · model: Haiku 4.5 (auto)',   ms: 150 }
      ],
      text: 'Working this as **three parallel workstreams** — alternates, inventory, and logistics. Each specialist is assembled from reusable skills, not hand-built. **Their job is to find what’s possible in their lane — not to decide.** I’ll compose the recovery plan from what they bring back:',
      cards: ['orchestration']
    },

    solver: {
      steps: [
        { tool: 'swan.compose_options',    system: 'SWAN',    label: 'Assembling the 3 findings into candidate plans A · B · C',            ms: 900 },
        { tool: 'planner.create_scenario', system: 'Planner', label: 'One simulation scenario per candidate · children of Enterprise baseline', ms: 260 },
        { tool: 'planner.run_solver',      system: 'Planner', label: 'Supply Planning solver · testing all 3 candidates',           ms: 3200 },
        { tool: 'swan.validate',           system: 'SWAN',    label: 'Self-check vs hard constraints: capacity, policy floors, logistics budget', ms: 180 }
      ],
      text: 'My specialists found the **ingredients** — what’s possible in each lane. I composed those into **three candidate plans**, each built from named findings.\n\nBut proposing isn’t proving. Whether a plan actually holds — against capacity, safety-stock floors, and every other commitment in your plan — is **deterministic math, not judgment**. So each candidate went into its own scenario and through the **Supply Planning solver**. **Zero violations across all three:**',
      cards: ['compose', 'solver']
    },

    recommend: {
      steps: [
        { tool: 'swan.rank_options', system: 'SWAN', label: 'Ranking by revenue protected, cost, risk — weighted by your preferences', ms: 140 },
        { tool: 'swan.recall',       system: 'SWAN', label: 'Memory: substitution preferred over expedite · precedent Mar 2026',       ms: 60 }
      ],
      text: 'Three viable recoveries, ranked. I’m leading with **substitution** — last time Astrel slipped (March), you substituted and hit **100% OTD with zero expedite spend**. Same playbook applies:',
      cards: ['options']
    },

    explain: {
      steps: [
        { tool: 'planner.compare_scenarios', system: 'Planner', label: 'Comparing SCN-1847-A vs SCN-1847-C on cost, margin, budget draw', ms: 210 }
      ],
      text: 'Fair challenge. Full expedite protects slightly more revenue — **$4.0M vs $3.94M** — but costs **2.5× more** ($214K vs $86.4K), consumes **38% of your Q3 logistics budget**, and does nothing about the underlying Astrel fragility.\n\nMy key assumptions on Option A: **air capacity holds through Thursday**, and the **MCU-8351 requal batch passes** — it’s the same silicon rev we validated in March. If either breaks, expedite remains available as a fallback; I’d re-simulate before committing anything.',
      cards: []
    },

    wrapup: {
      steps: [
        { tool: 'swan.log_decisions', system: 'SWAN', label: 'Writing decision record · arming outcome tracking for Aug month-end', ms: 130 }
      ],
      text: 'Done. **6 actions executed across 4 systems**, 1 held for your sign-off (the Astrel email). The recovery plan is live in the planning model and the account teams are briefed.\n\nI’ll keep watching the requal batch and hold Vantek as fallback — if anything drifts, you’ll hear from me first. The full decision record is in the Control Plane:',
      cards: ['controlPlaneLink']
    }
  }
};
