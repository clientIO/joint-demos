export interface Preset {
    readonly id: string;
    readonly name: string;
    readonly source: string;
}

export const PRESETS: readonly Preset[] = [
    {
        id: 'order',
        name: 'Order checkout',
        source: `flowchart TD
    start([Customer places order]) --> validate{Payment valid?}
    validate -->|Yes| reserve[Reserve inventory]
    validate -->|No| notify[/Show payment error/]
    notify --> retry{Retry?}
    retry -->|Yes| validate
    retry -->|No| cancelled((Cancelled))
    reserve --> pack[[Pack the order]]
    pack --> store[(Write to warehouse DB)]
    store --> ship[Ship to customer]
    ship --> done((Done))
`,
    },
    {
        id: 'release',
        name: 'Release pipeline (LR)',
        source: `flowchart LR
    commit([Commit pushed]) --> build[Build]
    build --> unit{Unit tests}
    unit -->|pass| e2e{E2E tests}
    unit -->|fail| report[/Report failure/]
    e2e -->|pass| stage[Deploy to staging]
    e2e -->|fail| report
    stage --> approve{{Manual approval}}
    approve --> prod[Deploy to production]
    prod --> done((Released))
    report -.-> commit
`,
    },
    {
        id: 'shapes',
        name: 'All node shapes',
        source: `flowchart TD
    go@{ shape: sm-circ, label: "Start" } --> rect[Rectangle]
    go --> junction@{ shape: f-circ, label: "Junction" }
    go --> card@{ shape: card, label: "Card" }
    go --> fork@{ shape: fork, label: "Fork / join" }
    go --> doc@{ shape: doc, label: "Document" }
    go --> das@{ shape: h-cyl, label: "Direct access storage" }

    rect --> rounded(Rounded) --> stadium([Stadium]) --> sub[[Subroutine]]
    rect --> rhombus{Rhombus} --> hex{{Hexagon}} --> asym>Asymmetric]
    rect --> para[/Parallelogram/] --> paraAlt[\\Parallelogram alt\\] --> trap[/Trapezoid\\] --> trapAlt[\\Trapezoid alt/]
    rounded --> db[(Database)] --> circle((Circle)) --> dbl(((Double circle)))

    junction --> summary@{ shape: cross-circ, label: "Summary" } --> halt@{ shape: fr-circ, label: "Stop" }
    junction --> leanL@{ shape: lean-l, label: "Parallelogram (left)" } --> priority@{ shape: trap-b, label: "Priority" } --> manualOp@{ shape: trap-t, label: "Manual operation" }
    junction --> oddOne@{ shape: odd, label: "Odd" } --> note@{ shape: text, label: "Text block" }

    card --> lined@{ shape: lin-rect, label: "Lined process" } --> stacked@{ shape: st-rect, label: "Stacked process" } --> tagged@{ shape: tag-rect, label: "Tagged process" }
    card --> divided@{ shape: div-rect, label: "Divided process" } --> internal@{ shape: win-pane, label: "Internal storage" }
    card --> manualIn@{ shape: sl-rect, label: "Manual input" } --> stored@{ shape: bow-rect, label: "Stored data" }

    fork --> collate@{ shape: hourglass, label: "Collate" } --> comLink@{ shape: bolt, label: "Com link" }
    fork --> extract@{ shape: tri, label: "Extract" } --> manualFile@{ shape: flip-tri, label: "Manual file" }
    fork --> loopLimit@{ shape: notch-pent, label: "Loop limit" } --> tape@{ shape: flag, label: "Paper tape" } --> delay@{ shape: delay, label: "Delay" }

    doc --> docs@{ shape: docs, label: "Documents" } --> linedDoc@{ shape: lin-doc, label: "Lined document" } --> taggedDoc@{ shape: tag-doc, label: "Tagged document" }
    doc --> comment@{ shape: brace, label: "Comment" } --> commentR@{ shape: brace-r, label: "Comment (right)" } --> commentBoth@{ shape: braces, label: "Comment (both)" }

    das --> disk@{ shape: lin-cyl, label: "Disk storage" } --> display@{ shape: curv-trap, label: "Display" }
`,
    },
    {
        id: 'v11-shapes',
        name: 'Extended shapes (@{ shape })',
        source: `flowchart TD
    a@{ shape: sm-circ, label: "Start" } --> b@{ shape: card, label: "Read request" }
    b --> c@{ shape: manual-input, label: "Operator input" }
    c --> d@{ shape: div-rect, label: "Validate payload" }
    d --> e@{ shape: docs, label: "Audit trail" }
    d --> f@{ shape: delay, label: "Debounce" }
    f --> g@{ shape: das, label: "Queue" }
    g --> h@{ shape: disk, label: "Cold storage" }
    d --> i@{ shape: display, label: "Dashboard" }
    i --> j@{ shape: fork, label: "Fan out" }
    j --> k@{ shape: doc, label: "Invoice" }
    j --> l@{ shape: tag-doc, label: "Receipt" }
    k --> m@{ shape: stop, label: "Stop" }
    l --> m
`,
    },
    {
        id: 'subgraphs',
        name: 'Subgraphs and animation',
        source: `flowchart LR
    subgraph intake [Intake]
        request([Request]) --> triage{Urgent?}
    end
    subgraph work [Fulfilment]
        prep[Prepare] --> qa[[Quality check]]
    end
    triage e1@-->|yes| prep
    e1@{ animate: true }
    triage -.->|no| backlog[(Backlog)]
    backlog e2@--> prep
    e2@{ animation: slow }
    qa --> done((Shipped))
    click request "https://docs.jointjs.com" "JointJS docs"
`,
    },
    {
        id: 'edges',
        name: 'Edge and arrow styles',
        source: `flowchart TD
    a[Solid arrow] --> b[Target]
    c[Open link] --- d[Target]
    e[Dotted] -.-> f[Target]
    g[Thick] ==> h[Target]
    i[Circle head] --o j[Target]
    k[Cross head] --x l[Target]
    m[Both ends] <--> n[Target]
    o[Labelled] -->|with a label| p[Target]
    q[Longer rank] ----> r[Target]
`,
    },
    {
        id: 'styles',
        name: 'Styled nodes',
        source: `flowchart TD
    classDef pending fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef done fill:#dcfce7,stroke:#16a34a,color:#14532d

    intake([Ticket raised]) --> triage{Severity?}
    triage -->|high| page[Page on-call]
    triage -->|low| queue[Add to backlog]
    page --> fix[Ship a fix]
    queue --> fix
    fix --> closed((Closed))

    class page,fix pending
    class closed done
    style intake fill:#ddffee,stroke:#0f766e,stroke-width:3px
`,
    },
    {
        id: 'state',
        name: 'State machine (BT)',
        source: `flowchart BT
    idle([Idle]) --> loading[Loading]
    loading --> ok{HTTP 200?}
    ok -->|yes| ready[Ready]
    ok -->|no| failed[/Failed/]
    failed -.->|retry| loading
    ready --> idle
`,
    },
];

export const DEFAULT_PRESET = PRESETS[0];
