/* global React */
const { useState: useStateS, useEffect: useEffectS } = React;

// =============================================================
// Tier section — STM / MTM / LTM cards
// =============================================================

function TierSection() {
  const tiers = [
    {
      cls: 'stm',
      name: 'STM',
      tag: 'short-term · hot',
      title: 'Raw turns',
      desc: 'Exactly the messages the user typed and the agent\'s replies. Volatile in dev, durable in production via PostgresSTM.',
      stats: [
        ['tokens', '~4K'],
        ['lifetime', 'hours'],
      ],
      hint: 'High detail, low density. A single turn might be 30 tokens of \u201Cyeah, sounds good\u201D.',
    },
    {
      cls: 'mtm',
      name: 'MTM',
      tag: 'mid-term · warm',
      title: 'Session summaries',
      desc: 'LLM-generated summaries of session chunks. Episode-grained. Much higher tokens-per-MB than raw STM.',
      stats: [
        ['blocks', 'summary chunks'],
        ['lifetime', 'weeks'],
      ],
      hint: 'Medium detail, medium density. ~200 tokens compressing dozens of turns of decisions.',
    },
    {
      cls: 'ltm',
      name: 'LTM',
      tag: 'long-term · cold',
      title: 'Atomic facts + entities',
      desc: 'Extracted (subject, attribute, value) tuples with confidence, live-row invalidation and bi-temporal columns.',
      stats: [
        ['indexed by', 'pgvector + lex'],
        ['lifetime', 'indefinite'],
      ],
      hint: 'Low detail, high density. A 15-token fact answers a wide class of queries without carrying stale values forward.',
    },
  ];

  return (
    <div className="tier-row">
      {tiers.map((t) => (
        <div className={`tier-card ${t.cls}`} key={t.name}>
          <h3 className="h-3">
            {t.name}
            <span className="tier-tag mono">· {t.tag}</span>
          </h3>
          <div style={{ fontSize: 14, color: 'var(--tx-1)', marginTop: 2 }}>{t.title}</div>
          <p className="tier-desc">{t.desc}</p>
          <div className="tier-stat">
            {t.stats.map(([k, v]) => (
              <div key={k}>
                <div className="v serif">{v}</div>
                <div className="k mono">{k}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--tx-2)', fontStyle: 'italic' }}>
            {t.hint}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// Supersession interactive demo
// =============================================================

const SS_TIMELINE = [
  {
    label: 'Turn 1',
    user: '"I live in NYC and I just adopted a dog named Rex"',
    rows: [
      { id: 'a1', subject: 'user', attr: 'location', value: 'NYC',    invalidated: null,         replacedBy: null,  ts: '2026-04-02' },
      { id: 'b5', subject: 'user', attr: 'pets.dog', value: 'Rex',    invalidated: null,         replacedBy: null,  ts: '2026-04-02' },
    ],
  },
  {
    label: 'Turn 6 — user moves',
    user: '"Just moved to Boston this week"',
    rows: [
      { id: 'a1', subject: 'user', attr: 'location', value: 'NYC',    invalidated: '2026-05-18', replacedBy: 'd9..', ts: '2026-04-02' },
      { id: 'b5', subject: 'user', attr: 'pets.dog', value: 'Rex',    invalidated: null,         replacedBy: null,   ts: '2026-04-02' },
      { id: 'd9', subject: 'user', attr: 'location', value: 'Boston', invalidated: null,         replacedBy: null,   ts: '2026-05-18' },
    ],
  },
  {
    label: 'Turn 9 — retroactive fix',
    user: '"Actually I never made it to Boston — moved to Cambridge instead"',
    rows: [
      { id: 'a1', subject: 'user', attr: 'location', value: 'NYC',       invalidated: '2026-05-24', replacedBy: 'f3..', ts: '2026-04-02' },
      { id: 'b5', subject: 'user', attr: 'pets.dog', value: 'Rex',       invalidated: null,         replacedBy: null,   ts: '2026-04-02' },
      { id: 'd9', subject: 'user', attr: 'location', value: 'Boston',    invalidated: '2026-05-24', replacedBy: 'f3..', ts: '2026-05-18' },
      { id: 'f3', subject: 'user', attr: 'location', value: 'Cambridge', invalidated: null,         replacedBy: null,   ts: '2026-05-24' },
    ],
  },
];

function SupersessionDemo() {
  const [step, setStep] = useStateS(0);
  const state = SS_TIMELINE[step];

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            LTM table · live view
          </div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--tx-1)', marginTop: 4 }}>
            <span style={{ color: 'var(--tx-3)' }}>{'>'}</span> {state.user}
          </div>
        </div>
        <span className="chip chip-ltm">{state.label}</span>
      </div>

      <div className="ss-table-wrap">
        <table className="ss-table">
          <thead>
            <tr>
              <th>id</th>
              <th>subject</th>
              <th>attribute</th>
              <th>value</th>
              <th>invalidated_at</th>
              <th>replaced_by</th>
              <th>valid_from</th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((r) => (
              <tr key={r.id} className={r.invalidated ? 'superseded' : 'current'}>
                <td className="id">{r.id}</td>
                <td>{r.subject}</td>
                <td>{r.attr}</td>
                <td><span className="v">{r.value}</span></td>
                <td>{r.invalidated ? <span className="arrow">{r.invalidated}</span> : <span className="dim">NULL</span>}</td>
                <td>{r.replacedBy ? <span className="arrow">→ {r.replacedBy}</span> : <span className="dim">NULL</span>}</td>
                <td className="dim">{r.ts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ss-controls">
        <button className="btn-mini" onClick={() => setStep(0)} disabled={step === 0}>
          <span className="step">↺</span> reset
        </button>
        <button
          className="btn-mini"
          onClick={() => setStep(Math.min(SS_TIMELINE.length - 1, step + 1))}
          disabled={step === SS_TIMELINE.length - 1}
          style={step < SS_TIMELINE.length - 1 ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : null}
        >
          next turn <span className="step">→</span>
        </button>
        <div style={{ flex: 1 }} />
        <div className="mono" style={{ fontSize: 11, color: 'var(--tx-2)', alignSelf: 'center' }}>
          step {step + 1} / {SS_TIMELINE.length} ·{' '}
          <span style={{ color: 'var(--accent)' }}>
            current rows: {state.rows.filter(r => !r.invalidated).length}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Bi-temporal mini-timeline
// =============================================================

const BT_FACTS = [
  { id: 'a1', value: 'NYC',       valid: '2023-01', recorded: '2023-01', vx: 12,  rx: 12 },
  { id: 'd9', value: 'Boston',    valid: '2023-08', recorded: '2023-08', vx: 45,  rx: 45 },
  { id: 'f3', value: 'Cambridge', valid: '2023-06', recorded: '2026-05', vx: 32,  rx: 88 }, // retroactive correction
];

function BiTemporalDemo() {
  const [q, setQ] = useStateS('asof-2024');
  const queries = {
    'current':   { label: 'Where does the user live now?',                   result: { id: 'f3', value: 'Cambridge' } },
    'asof-2024': { label: 'Where did the user live as of March 2024?',       result: { id: 'f3', value: 'Cambridge' } },
    'asof-2023': { label: 'Where did the user live as of February 2023?',    result: { id: 'a1', value: 'NYC' } },
    'asof-2023-07': { label: 'Where did the user live as of July 2023?',  result: { id: 'f3', value: 'Cambridge' } },
  };
  const sel = queries[q];

  return (
    <div className="bt-frame">
      <div className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        bi-temporal timeline · ltm.location facts
      </div>

      <div className="bt-axis">
        <div className="bt-track valid">
          <span className="label">valid_from</span>
          {BT_FACTS.map((f) => (
            <React.Fragment key={'v'+f.id}>
              <div className="bt-tick" style={{ left: f.vx + '%' }} />
              <div className="bt-tick-label" style={{ left: f.vx + '%' }}>
                <span>{f.valid}</span>
                <span className="v">{f.value}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="bt-track recorded">
          <span className="label">recorded_at</span>
          {BT_FACTS.map((f) => (
            <React.Fragment key={'r'+f.id}>
              <div className={`bt-tick ${f.id === 'f3' ? 'current' : ''}`} style={{ left: f.rx + '%' }} />
              <div className="bt-tick-label" style={{ left: f.rx + '%' }}>
                <span>{f.recorded}</span>
                <span className="v">{f.value}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 30, flexWrap: 'wrap' }}>
        {Object.entries(queries).map(([id, qq]) => (
          <button
            key={id}
            className="btn-mini"
            onClick={() => setQ(id)}
            style={q === id ? { background: 'var(--bg-3)', borderColor: 'var(--ltm)', color: 'var(--tx-0)' } : null}
          >
            {qq.label}
          </button>
        ))}
      </div>

      <div className="bt-query">
        <div className="q-label">SQL</div>
        <div>
          <span style={{ color: '#ff9ed6' }}>SELECT</span> value <span style={{ color: '#ff9ed6' }}>FROM</span> ltm
          <br />
          <span style={{ color: '#ff9ed6' }}>WHERE</span> attribute = <span style={{ color: 'var(--accent)' }}>'user.location'</span>
          <br />
          {q.startsWith('asof') && (
            <>
              <span style={{ color: '#ff9ed6' }}>AND</span> valid_from {'<='} <span style={{ color: 'var(--accent)' }}>'{q === 'asof-2024' ? '2024-03-01' : q === 'asof-2023' ? '2023-02-01' : '2023-07-01'}'</span>
              <br />
            </>
          )}
          <span style={{ color: '#ff9ed6' }}>ORDER BY</span> valid_from <span style={{ color: '#ff9ed6' }}>DESC LIMIT</span> 1;
        </div>
        <div className="q-answer">→ {sel.result.value}  <span className="dim">({sel.result.id})</span></div>
      </div>
    </div>
  );
}

// =============================================================
// Benchmark table
// =============================================================

function BenchTable() {
  const items = [
    {
      title: 'LongMemEval-S',
      bench: 'findings/reasoning_loop_2026-06.md',
      us:      { count: '60.8%', label: 'judged, 500 Q' },
      them:    { count: '34.4%', label: 'May ceiling' },
      story:   <>v1 broke the May ceiling with <strong>single-shot retrieve→answer</strong>, not an agentic loop. Substring is 48.4%; the LLM judge recovers paraphrases and reports 60.8% judged.</>,
      delta: '+26 pp',
    },
    {
      title: 'Knowledge-update recall',
      bench: 'evals/longmemeval/continuum_ltm_store.py',
      us:      { count: '98.7%', label: 'LTM recall' },
      them:    { count: 'stale', label: 'append-only risk' },
      story:   <>The LongMemEval knowledge-update slice is where supersession matters: old facts are invalidated so they stop competing with current facts during retrieval. Judged accuracy on the category is 51.3%.</>,
      delta: 'v1 lever',
    },
    {
      title: 'Supersession',
      bench: 'bench/supersession_correctness.py',
      us:      { count: '50 / 50', label: 'scenarios correct' },
      them:    { count: '19 / 50', label: 'naive baseline (append-only)' },
      story:   <>The naive store returned a <strong style={{ color: 'var(--err)' }}>stale fact in 31 of 50 cases</strong>. The user said "I moved to Boston" but the lookup still answered "NYC." Continuum filters <code className="mono">invalidated_at IS NULL</code> at the storage layer; that count drops to <span style={{ color: 'var(--accent)' }}>zero</span>, by construction.</>,
      delta: '+62 pp',
    },
    {
      title: 'Bi-temporal lookups',
      bench: 'bench/bi_temporal.py',
      us:      { count: '20 / 20', label: 'queries correct' },
      them:    { count: '15 / 20', label: 'best naive baseline' },
      story:   <>The naive baseline handles point-in-time correctly (15/15) but <strong style={{ color: 'var(--err)' }}>silently drops every single retroactive correction (0/5)</strong>. Its <code className="mono">recorded_at</code> filter sees the correction as "after" the queried date and ignores it. Continuum keys on <code className="mono">valid_from</code>; gets every one.</>,
      delta: '+25 pp',
    },
    {
      title: 'Retrieval recall @ 4',
      bench: 'bench/retrieval_quality.py',
      us:      { count: '55%', label: 'composite scorer' },
      them:    { count: '55%', label: 'raw cosine' },
      story:   <>The scorer ties because the synthetic corpus has <strong style={{ color: 'var(--tx-1)' }}>near-uniform timestamps and no importance variation</strong> — its recency and importance channels have nothing to differentiate on. On a production corpus with real temporal spread the lift would surface; we report the bench corpus's verdict.</>,
      delta: 'tied',
      neutral: true,
    },
    {
      title: 'Ingest cost',
      bench: 'bench/ingest_throughput.py',
      us:      { count: '0.18 ms', label: 'p50 per turn + 6 LLM calls' },
      them:    { count: '0.001 ms', label: 'raw list append' },
      story:   <>Continuum's full path adds <strong>0.18 ms of framework overhead</strong> per turn, plus six LLM-extraction calls for entity + fact ingestion. The raw list is faster — and blind to supersession, bi-temporal, retrieval ranking, and everything else this page describes.</>,
      delta: 'framework',
      neutral: true,
    },
  ];

  return (
    <div className="bench-grid">
      {items.map((b) => (
        <div className="bench-card" key={b.title}>
          <div className="bench-card-head">
            <div>
              <div className="bench-card-title">{b.title}</div>
              <div className="bench-card-bench mono">{b.bench}</div>
            </div>
            <div className={`bench-card-delta mono ${b.neutral ? 'neutral' : ''}`}>{b.delta}</div>
          </div>

          <div className="bench-card-counts">
            <div className="bcc bcc-us">
              <div className="bcc-count serif">{b.us.count}</div>
              <div className="bcc-label mono">
                <span className="dot" style={{ background: 'var(--accent)' }} />
                Continuum · {b.us.label}
              </div>
            </div>
            <div className="bcc bcc-them">
              <div className="bcc-count serif">{b.them.count}</div>
              <div className="bcc-label mono">
                <span className="dot" style={{ background: 'var(--tx-3)' }} />
                {b.them.label}
              </div>
            </div>
          </div>

          <div className="bench-card-story">{b.story}</div>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// Architecture (request walk-through) — section 5 of the docs
// =============================================================

function RequestWalkthrough() {
  return (
    <div>
      <div className="arch-grid">
        <ArchBlock name='session.process_turn("Where do I live now?")' sub="continuum/core/session.py" desc="Entry-point. The single function the caller invokes per user turn." meta="foreground" />
        <ArchBlock name="Retriever — 7-stage pipeline" sub="continuum/retrieval/retriever.py" desc="HyDE (opt) → LTM hybrid (k1=50) → 1-hop graph expansion → composite scoring + policy boost → BGE rerank → STM recent (n=6) → MTM recent." meta="7 stages" />
        <ArchBlock name="Composite scorer" sub="continuum/scoring/scorer.py" desc="Relevance + importance + recency + confidence, weighted 0.45 / 0.25 / 0.20 / 0.10, multiplied by layer_boost[tier]." meta="τ = 168 h" />
        <ArchBlock name="Optimizer chain (nested in retrieve)" sub="continuum/optimizer/chain.py" desc="Pack into the caller's token budget. Five strategies in fixed order, short-circuits at first fit." meta="chain of 5" />
        <ArchBlock name="ContextBundle → Responder(LLM)" sub="caller-provided" desc="Compressed bundle handed to your model. Continuum returns the model's reply unchanged." meta="caller LLM" />
      </div>
    </div>
  );
}

function ArchBlock({ name, sub, desc, meta }) {
  return (
    <div className="arch-block">
      <div className="ab-name">
        {name}
        <span className="sub mono">{sub}</span>
      </div>
      <div className="ab-desc">{desc}</div>
      <div className="ab-meta">{meta}</div>
    </div>
  );
}

Object.assign(window, { TierSection, SupersessionDemo, BiTemporalDemo, BenchTable, RequestWalkthrough });
