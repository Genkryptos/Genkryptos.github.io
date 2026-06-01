/* global React, ReactDOM, PipelineFlow, TierSection, SupersessionDemo, BiTemporalDemo, BenchTable, RequestWalkthrough, CodeBlock, Callout, Eyebrow, k, f, s, n, c, cl, self_ */
const { useState: useStateA, useEffect: useEffectA } = React;

// =============================================================
// Hero — preview pipeline strip
// =============================================================

const HERO_PIPE = [
  { n: '01', t: 'STM.append',  d: 'user msg',       k: 'stm' },
  { n: '02', t: 'Retrieve',    d: 'hybrid → direct', k: 'all' },
  { n: '03', t: 'Responder',   d: 'LLM',            k: 'fg'  },
  { n: '04', t: 'STM.append',  d: 'assistant',      k: 'stm' },
  { n: '05', t: 'AccessLog',   d: 'queued',         k: 'bg'  },
  { n: '06', t: 'Index',       d: 'neighbours',     k: 'bg'  },
  { n: '07', t: 'Triggers',    d: 'after_turn',     k: 'bg'  },
  { n: '08', t: 'Promoter',    d: 'when fired',     k: 'bg'  },
];

function HeroPipeStrip() {
  const [active, setActive] = useStateA(0);
  useEffectA(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % HERO_PIPE.length), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hero-pipe">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--tx-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          session.process_turn() — one user turn
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--tx-3)' }}>
          {active < 4 ? <span style={{ color: 'var(--accent)' }}>● foreground</span> : <span style={{ color: 'var(--warn)' }}>● background queue</span>}
        </div>
      </div>
      <div className="hero-pipe-track">
        {HERO_PIPE.map((p, i) => (
          <div key={i} className={`hp-cell ${i === active ? 'active' : ''}`}>
            <div>
              <div className="hp-n mono">{p.n}</div>
              <div className="hp-t">{p.t}</div>
            </div>
            <div className="hp-d">{p.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================
// App root
// =============================================================

function App() {
  const [scrolled, setScrolled] = useStateA(false);
  const [activeId, setActiveId] = useStateA('');
  useEffectA(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: track which section is closest to the top of the viewport.
  useEffectA(() => {
    const ids = ['problem', 'pipeline', 'tryit', 'benchmarks', 'wiki', 'roadmap'];
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (sections.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <React.Fragment>
      <NavBar scrolled={scrolled} activeId={activeId} />
      <main>
        <Hero />
        <ProblemSection />
        <PipelineSection />
        <DataFlowSection />
        <TryItSection />
        <StageDetailSections />
        <SupersessionSection />
        <BiTemporalSection />
        <BenchmarksSection />
        <WikiSection />
        <RequestSection />
        <NotSection />
        <RoadmapSection />
        <EndingSection />
      </main>
      <Footer />
    </React.Fragment>
  );
}

// =============================================================

function NavBar({ scrolled, activeId }) {
  const links = [
    ['problem',      'Problem'],
    ['pipeline',     'Architecture'],
    ['tryit',        'Demo'],
    ['benchmarks',   'Benchmarks'],
    ['wiki',         'Design'],
    ['roadmap',      'Roadmap'],
  ];
  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <a href="#" className="nav-brand">
          <div className="mark"></div>
          Continuum
        </a>
        <div className="nav-links">
          {links.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeId === id ? 'active' : ''}
            >
              {label}
            </a>
          ))}
        </div>
        <a href="https://github.com/Genkryptos/Continuum/releases/tag/v1.0.0" target="_blank" rel="noopener" className="nav-cta mono">v1.0.0 →</a>
      </div>
    </nav>
  );
}

// =============================================================

function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid-bg" />
      <div className="hero-glow" />
      <div className="wrap hero-inner">
        <div className="hero-eyebrow">
          <span className="dot"></span>
          AI Infrastructure · 2025-Present · v1.0.0 released
        </div>
        <h1 className="h-display">
          Continuum
        </h1>
        <p className="hero-sub">
          A multi-layer agent memory manager modeled after human memory architecture: short-term, mid-term, and long-term stores for persistent, queryable, lifecycle-aware AI memory. The v1 release adds the concrete systems work: hybrid retrieval, live-row invalidation, bi-temporal queries, and a direct retrieve→answer evaluation path.
        </p>
        <div className="portfolio-tagline mono">
          <span>⬡</span> Inspired by cognitive science · built as production-grade memory infrastructure
        </div>
        <div className="stack-row">
          {['Python', 'Postgres', 'pgvector', 'BM25', 'RRF', 'RAG', 'Embeddings', 'OpenRouter'].map((tag) => (
            <span className="skill-tag" key={tag}>{tag}</span>
          ))}
        </div>
        <div className="hero-actions">
          <a href="https://github.com/Genkryptos/Continuum/blob/main/findings/reasoning_loop_2026-06.md" target="_blank" rel="noopener" className="btn btn-primary">Read the v1 report →</a>
          <a href="https://github.com/Genkryptos/Continuum" target="_blank" rel="noopener" className="btn btn-ghost mono" style={{ fontSize: 13 }}>View on GitHub</a>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="v"><span className="ac">60.8%</span></div>
            <div className="k">LongMemEval-S judged</div>
          </div>
          <div className="hero-stat">
            <div className="v"><span className="ac">+26</span><span className="dim" style={{ fontSize: 18 }}> pp</span></div>
            <div className="k">Vs May ceiling</div>
          </div>
          <div className="hero-stat">
            <div className="v">98.7<span className="dim" style={{ fontSize: 18 }}>%</span></div>
            <div className="k">Knowledge-update recall</div>
          </div>
          <div className="hero-stat">
            <div className="v">1100<span className="dim" style={{ fontSize: 18 }}>+</span></div>
            <div className="k">Tests in CI</div>
          </div>
        </div>

        <TensionCards />
      </div>
    </section>
  );
}

function TensionCards() {
  const cards = [
    {
      label: 'NOT',
      title: 'a reasoner',
      body: 'No agentic loop on the hot path. IterativeReasoner was built, A/B-tested and cut as net-negative.',
    },
    {
      label: 'NOT',
      title: 'a vector database',
      body: 'Uses pgvector under the hood, but live-row invalidation, hybrid lexical+dense retrieval and bi-temporal queries are the differentiators.',
    },
    {
      label: 'NOT',
      title: 'a managed service',
      body: 'Open-source Python framework. Self-host on your own Postgres. MIT licensed.',
    },
  ];
  return (
    <div className="tension-row">
      {cards.map((c) => (
        <div className="tension-card" key={c.title}>
          <div className="mono tension-label">{c.label}</div>
          <div className="tension-title serif"><em>{c.title}.</em></div>
          <div className="tension-body">{c.body}</div>
        </div>
      ))}
    </div>
  );
}

// =============================================================

function ProblemSection() {
  const cards = [
    {
      icon: '⚡',
      title: 'LLMs have no native memory',
      body: 'Every call starts fresh. Long-running agents lose context across turns and sessions, while replaying full history quickly hits cost and token limits.',
    },
    {
      icon: '◈',
      title: 'What Continuum does',
      body: 'Continuum routes recent turns, session summaries, and durable facts through separate memory tiers so agents can retrieve useful context without stuffing every token back into the prompt.',
      highlight: true,
    },
    {
      icon: '🔗',
      title: 'Why not just use a database?',
      body: 'A flat store can persist facts, but it does not know which facts are current, stale, historically valid, or semantically relevant to the task in front of the agent.',
    },
    {
      icon: '⚙',
      title: 'Why not just use bigger context?',
      body: 'Larger context windows are still finite, slower, and expensive. Structured retrieval lets the model see clean, ranked context instead of a long uncurated transcript.',
    },
  ];

  return (
    <section id="problem" className="section portfolio-section">
      <div className="wrap">
        <div className="section-header">
          <h2 className="section-title">The Problem</h2>
        </div>
        <div className="problem-grid">
          {cards.map((card) => (
            <div className={`problem-card ${card.highlight ? 'highlight' : ''}`} key={card.title}>
              <div className="problem-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
          <div className="problem-card human-memory">
            <div>
              <div className="problem-icon">🧠</div>
              <h3>The human memory parallel</h3>
              <p>
                Humans keep focused working memory, compress recent context, and preserve durable knowledge for semantic recall. Continuum uses the same practical split, then adds database semantics that human memory does not have: supersession, transaction time, and reproducible retrieval.
              </p>
            </div>
            <div className="memory-parallel">
              <MemoryParallel name="STM" title="Working memory" body="Hot session context · exact recent turns" color="var(--stm)" />
              <MemoryParallel name="MTM" title="Short-term memory" body="Compressed session summaries · weeks to months" color="var(--mtm)" />
              <MemoryParallel name="LTM" title="Long-term memory" body="Durable facts and entities · current plus history" color="var(--ltm)" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemoryParallel({ name, title, body, color }) {
  return (
    <div className="memory-row">
      <span className="mono" style={{ color }}>{name}</span>
      <div>
        <div>{title}</div>
        <p>{body}</p>
      </div>
    </div>
  );
}

// =============================================================

function PipelineSection() {
  return (
    <section id="pipeline" className="section">
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 60, alignItems: 'end', marginBottom: 48 }}>
          <div>
            <Eyebrow num="01">The pipeline</Eyebrow>
            <h2 className="h-1 serif" style={{ marginTop: 18 }}>
              One call.<br />Eight things <em>in order</em>.
            </h2>
          </div>
          <p className="lede">
            <code style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent)' }}>session.process_turn(msg)</code> is the only entry-point a caller ever needs. Four steps happen on the foreground path under a strict latency budget. Four more run on the background queue once the reply is already in the caller's hands.
          </p>
        </div>
        <PipelineFlow />
      </div>
    </section>
  );
}

// =============================================================

function TryItSection() {
  return (
    <section id="tryit" className="section">
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 60, alignItems: 'end', marginBottom: 40 }}>
          <div>
            <div className="section-eyebrow">
              <span className="num">◎</span>
              <span>Try it · live</span>
            </div>
            <h2 className="h-1 serif" style={{ marginTop: 18 }}>
              Stop reading.<br />
              <em>Pick a statement.</em>
            </h2>
          </div>
            <p className="lede">
            The diagram is a picture; this is the thing. Select one of the prepared statements about location, work, pets, or vehicles. A local in-browser extractor stands in for Continuum's <code className="mono" style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>FactExtractor</code>, atomic facts land in the LTM table, and contradictions stamp old rows with <code className="mono" style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--ltm)' }}>invalidated_at</code> as you go.
          </p>
        </div>
        <TryIt />
      </div>
    </section>
  );
}

// =============================================================

function DataFlowSection() {
  return (
    <section id="dataflow" className="section">
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 60, alignItems: 'end', marginBottom: 40 }}>
          <div>
            <div className="section-eyebrow">
              <span className="num">●</span>
              <span>Data flow · animated</span>
            </div>
            <h2 className="h-1 serif" style={{ marginTop: 18 }}>
              One turn,<br />through every <em>layer.</em>
            </h2>
          </div>
          <p className="lede">
            The diagram below traces a single <code className="mono" style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>process_turn()</code> from the user message to the LLM reply, and then continues into the background queue where promotion writes new MTM blocks and LTM facts. Auto-plays — pause, step, or click any phase chip.
          </p>
        </div>
        <DataFlow />
      </div>
    </section>
  );
}

// =============================================================

function StageDetailSections() {
  return (
    <React.Fragment>
      {/* RETRIEVAL */}
      <section className="section">
        <div className="wrap">
          <div className="stage">
            <div>
              <div className="stage-meta">
                <Eyebrow num="02">Retrieval</Eyebrow>
                <span className="chip">7-stage pipeline</span>
                <span className="chip mono">defaults k1=50 · top_k=10</span>
              </div>
              <h2 className="h-1 serif">Score across<br />all three tiers.</h2>
              <p className="lede" style={{ marginTop: 22 }}>
                The retriever is the only component that touches every tier. Four signal channels are fused into one ranking by the composite scorer — the same scorer that gives the recency channel an honest decay function instead of a hack.
              </p>
              <div className="stack-md" style={{ marginTop: 32 }}>
                <ScorerBar name="Relevance"  desc="cosine(query.embedding, item.embedding)"        weight={0.45} color="var(--accent)" />
                <ScorerBar name="Importance" desc="item.importance, set at write time"             weight={0.25} color="var(--ltm)" />
                <ScorerBar name="Recency"    desc="2^(−age/τ) · (1 + log1p(access_count))"          weight={0.20} color="var(--mtm)" />
                <ScorerBar name="Confidence" desc="item.confidence — source self-rating"            weight={0.10} color="var(--stm)" />
              </div>
            </div>
            <div className="stack-md">
              <CodeBlock path="continuum/retrieval/retriever.py" lang="python">
{k('async def')} {f('retrieve')}({self_('self')}, query, budget) {'-> '} {cl('ContextBundle')}:{'\n'}
{'    '}q = {k('await')} {self_('self')}.{f('_maybe_hyde')}(query, debug)         {c('# 1. HyDE (off by default)')}{'\n'}
{'    '}pool = {k('await')} {self_('self')}.{f('_ltm_hybrid')}(q, debug)         {c('# 2. dense ⊕ sparse ⊕ RRF, k1=50')}{'\n'}
{'    '}{k('await')} {self_('self')}.{f('_graph_expand')}(pool, debug)            {c('# 3. 1-hop neighbours of top entities')}{'\n'}
{'    '}scored = {self_('self')}.{f('_score_all')}(pool, query, debug)    {c('# 4. composite + policy boost')}{'\n'}
{'    '}ltm    = {k('await')} {self_('self')}.{f('_rerank')}(query, scored, debug)  {c('# 5. BGE cross-encoder, top_k=10')}{'\n'}
{'    '}stm    = {k('await')} {self_('self')}.{f('_stm_recent')}(query)            {c('# 6. last stm_turns=6 verbatim')}{'\n'}
{'    '}mtm    = {k('await')} {self_('self')}.{f('_mtm_recent')}(query, budget)     {c('# 7. budget.mtm_reserved worth of summaries')}{'\n'}
{'    '}{k('return')} {self_('self')}.{f('_assemble')}(budget, ltm, mtm, stm, debug)</CodeBlock>
              <Callout icon="⏱" title="Cost shape">
                Hybrid LTM search dominates: HNSW · dense, BM25 · sparse, Reciprocal Rank Fusion to merge. The BGE cross-encoder (<code className="mono">BAAI/bge-reranker-v2-m3</code>) is the most expensive stage and the one that lifts precision the most.
              </Callout>
            </div>
          </div>
        </div>
      </section>

      {/* TIER OVERVIEW */}
      <section id="tiers" className="section">
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 60, alignItems: 'end', marginBottom: 48 }}>
            <div>
              <Eyebrow num="03">The three tiers</Eyebrow>
              <h2 className="h-1 serif" style={{ marginTop: 18 }}>
                Detail decreases.<br />Density <em>increases</em>.
              </h2>
            </div>
            <p className="lede">
              Routing retrieval through three stores instead of one isn't a clever trick — it's an acknowledgement that the value density of memory differs by age. Raw turns are bulky and rarely useful; extracted facts are tiny and answer most queries.
            </p>
          </div>
          <TierSection />
        </div>
      </section>

      {/* OPTIMIZER + PROMOTER side by side */}
      <section className="section">
        <div className="wrap">
          <div className="stage">
            <div>
              <div className="stage-meta">
                <Eyebrow num="04">Optimizer</Eyebrow>
                <span className="chip">chain of 5</span>
              </div>
              <h2 className="h-1 serif">Pack to a budget,<br />stop at the first fit.</h2>
              <p className="lede" style={{ marginTop: 22 }}>
                Five strategies in order, each yielding control the moment the bundle fits the caller's token budget. The expensive ones (LLM-as-summarizer, token-level llmlingua) only run when the cheap ones can't.
              </p>
              <div className="stack-sm" style={{ marginTop: 30 }}>
                <OptStrategy num="1" name="StmTrim"                desc="Keep only the last N STM turns. Cheapest possible structural cut." color="var(--stm)" />
                <OptStrategy num="2" name="MtmSummarize"           desc="Collapse old MTM summaries via an LLM (default model gpt-4o-mini). One model call per block." color="var(--mtm)" />
                <OptStrategy num="3" name="SemanticDedupe"         desc="Cosine-near duplicates removed under a similarity threshold (default 0.92)." color="var(--mtm)" />
                <OptStrategy num="4" name="LLMLinguaCompress"      desc="Token-level compression at the configured ratio (default 0.5). Lossy." color="var(--ltm)" />
                <OptStrategy num="5" name="ScoreAwareBudgetPrune"  desc="Last-resort drop of the lowest-score items until the bundle fits." color="var(--ltm)" />
              </div>
            </div>
            <div>
              <div className="stage-meta">
                <Eyebrow num="05">Promotion</Eyebrow>
                <span className="chip" style={{ color: 'var(--warn)' }}>off the foreground path</span>
              </div>
              <h2 className="h-1 serif">When STM fills,<br />Promoter <em>wakes up</em>.</h2>
              <p className="lede" style={{ marginTop: 22 }}>
                Promotion is the moment Continuum stops looking like a buffer and starts looking like infrastructure. Three things happen in series, all on the background queue.
              </p>
              <div className="stack-sm" style={{ marginTop: 30 }}>
                <PromoteStep n="1" title="Summarise the chunk" body="One LLM call. Produces a SummaryBlock written to MTM with the chunk's [from, to] turn-range as provenance." />
                <PromoteStep n="2" title="Extract atomic facts + entities" body="FactExtractor + EntityExtractor walk the summary. Each fact is a (subject, attribute, value, confidence) row. Each entity gets type, aliases and a canonical key." />
                <PromoteStep n="3" title="Detect contradictions, invalidate stale rows" body="For each new fact, look up existing LTM rows with the same (subject, attribute). If one contradicts the new fact, close the old row's live window with invalidated_at. In production the contradiction check is an LLM call inside Promoter; the supersession benchmark exercises the same idea with a rule-based detector and scores 100% (50/50) by construction once non-current rows are filtered out." />
              </div>
            </div>
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

function ScorerBar({ name, desc, weight, color }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 64px', gap: 18, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3 }}>
        <div style={{ width: (weight * 100) + '%', height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <div className="mono" style={{ fontSize: 13, textAlign: 'right', color: 'var(--tx-0)' }}>{weight.toFixed(2)}</div>
    </div>
  );
}

function OptStrategy({ num, name, desc, color }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 14, padding: '14px 16px', background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div className="mono" style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{num}</div>
      <div>
        <div className="mono" style={{ fontSize: 13, color: 'var(--tx-0)' }}>{name}</div>
        <div style={{ fontSize: 13, color: 'var(--tx-2)', marginTop: 4 }}>{desc}</div>
      </div>
    </div>
  );
}

function PromoteStep({ n, title, body }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 16, padding: '16px 18px', background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div className="serif" style={{ fontSize: 26, color: 'var(--accent)', lineHeight: 1 }}>{n}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--tx-2)', marginTop: 6, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );
}

// =============================================================

function SupersessionSection() {
  return (
    <section id="supersession" className="section" style={{ background: 'linear-gradient(180deg, transparent, rgba(164,140,255,0.025))' }}>
      <div className="wrap">
        <div className="stage">
          <div>
            <div className="stage-meta">
              <Eyebrow num="06">Supersession</Eyebrow>
              <span className="chip chip-ltm">schema-level</span>
            </div>
            <h2 className="h-1 serif">
              When facts<br />change, <em>edges move.</em>
            </h2>
            <p className="lede" style={{ marginTop: 22 }}>
              Every LTM row carries transaction-time state. <code style={{ background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4, color: 'var(--ltm)' }}>invalidated_at TIMESTAMPTZ NULL</code> is the hot-path live guard: NULL means "this fact is current"; a timestamp means the row is historical.
            </p>
            <p className="lede" style={{ marginTop: 14 }}>
              At read-time the retriever adds one clause —{' '}
              <code style={{ background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4 }}>WHERE invalidated_at IS NULL</code>
              {' '}— and gets correct-by-construction "what is current" queries. The same table still serves audit and history reads when that clause is dropped.
            </p>
            <Callout icon="◆" title="Why not just delete?" >
              Two reasons. <strong style={{ display: 'inline' }}>Audit:</strong> "When did the user move?" needs the old row. <strong style={{ display: 'inline' }}>Retroactive correction:</strong> if the user later says "actually I never moved to Boston — I moved to Cambridge," you need the Boston row still there to re-target the edge.
            </Callout>
          </div>
          <SupersessionDemo />
        </div>
      </div>
    </section>
  );
}

// =============================================================

function BiTemporalSection() {
  return (
    <section id="bitemporal" className="section">
      <div className="wrap">
        <div className="stage">
          <div>
            <div className="stage-meta">
              <Eyebrow num="07">Bi-temporal</Eyebrow>
              <span className="chip chip-ltm">schema-level</span>
            </div>
            <h2 className="h-1 serif">
              Real-world time<br />and <em>system</em> time.
            </h2>
            <p className="lede" style={{ marginTop: 22 }}>
              Two timestamp columns on every LTM row.
              <code style={{ background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4, color: 'var(--mtm)', marginLeft: 6 }}>valid_from</code> is the point in real-world time when the fact became true.
              <code style={{ background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4, color: 'var(--ltm)', marginLeft: 6 }}>recorded_at</code> is when Continuum learned about it.
            </p>
            <p className="lede" style={{ marginTop: 14 }}>
              They usually match — facts are recorded right after they become true — but the system stays correct when they diverge: point-in-time queries, retroactive corrections, late-arriving evidence.
            </p>

            <div className="cols-2" style={{ marginTop: 28 }}>
              <div className="card card-pad" style={{ padding: 22 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--mtm)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Point-in-time</div>
                <div style={{ fontSize: 14, color: 'var(--tx-1)', marginTop: 8, lineHeight: 1.55 }}>
                  "Where did the user live in March 2024?" filters on <code className="mono" style={{ color: 'var(--tx-0)' }}>valid_from ≤ 2024-03</code>.
                </div>
              </div>
              <div className="card card-pad" style={{ padding: 22 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ltm)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Retroactive</div>
                <div style={{ fontSize: 14, color: 'var(--tx-1)', marginTop: 8, lineHeight: 1.55 }}>
                  Corrections set <code className="mono" style={{ color: 'var(--tx-0)' }}>valid_from</code> to the historical date but <code className="mono" style={{ color: 'var(--tx-0)' }}>recorded_at</code> to today.
                </div>
              </div>
            </div>
          </div>
          <BiTemporalDemo />
        </div>
      </div>
    </section>
  );
}

// =============================================================

function BenchmarksSection() {
  return (
    <section id="benchmarks" className="section">
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 60, alignItems: 'end', marginBottom: 40 }}>
          <div>
            <Eyebrow num="08">Benchmarks</Eyebrow>
            <h2 className="h-1 serif" style={{ marginTop: 18 }}>
              V1 changed<br />the headline.
            </h2>
          </div>
          <p className="lede">
            The publishable v1 story is LongMemEval-S <strong style={{ color: 'var(--tx-0)' }}>60.8% judged</strong> on 500 questions, plus the memory-operation benchmarks that prove the schema.{' '}
            <code className="mono" style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 4 }}>make bench-all</code> reproduces the local memory table; <code className="mono" style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 4 }}>make repro-everything</code> reproduces the v1 headline with an OpenRouter key.
          </p>
        </div>
        <BenchTable />

        <div className="cols-3" style={{ marginTop: 36 }}>
          <Callout icon="✓" title="Honest about scoring">
            Substring accuracy is 48.4%; the LLM judge raises it to 60.8% by catching correct paraphrases. Both numbers are reported.
          </Callout>
          <Callout icon="▽" title="Honest about architecture">
            The IterativeReasoner stayed in-tree as a tested negative result. Direct retrieve→answer is the v1 winner.
          </Callout>
          <Callout icon="◷" title="Honest gaps">
            Temporal-reasoning is still 41.4%, LOCOMO vs Mem0 is preliminary, and OpenRouter cost accounting is not wired yet.
          </Callout>
        </div>
      </div>
    </section>
  );
}

// =============================================================

function WikiSection() {
  return (
    <section id="wiki" className="section" style={{ background: 'linear-gradient(180deg, transparent, rgba(90,221,199,0.025))' }}>
      <div className="wrap">
        <div className="stage">
          <div>
            <div className="stage-meta">
              <Eyebrow num="09">V1 lessons</Eyebrow>
              <span className="chip chip-mtm">direct mode won</span>
              <span className="chip mono">IterativeReasoner cut</span>
            </div>
            <h2 className="h-1 serif">
              The loop was built.<br />
              <em>Then removed.</em>
            </h2>
            <p className="lede" style={{ marginTop: 22 }}>
              The May report predicted the 32-34% ceiling would need agentic iterative reasoning. v1 built that loop, tested it, and cut it. The shipped result is deliberately simpler: retrieve the right context once, then let a strong answerer answer.
            </p>
            <p className="lede" style={{ marginTop: 14 }}>
              The negative result remains useful. <code className="mono" style={{ color: 'var(--tx-1)' }}>continuum/reasoning/iterative_reasoner.py</code> is still in-tree, tested, and documented, but the public v1 pipeline does not depend on it.
            </p>

            <div className="cols-2" style={{ marginTop: 28 }}>
              <div className="card card-pad" style={{ padding: 20 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--mtm)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Direct answer mode</div>
                <div style={{ fontSize: 13.5, color: 'var(--tx-1)', marginTop: 8, lineHeight: 1.55 }}>
                  <code className="mono">--reasoner direct</code> hands raw retrieved turns to the answerer in one call. This is the v1 winner.
                </div>
              </div>
              <div className="card card-pad" style={{ padding: 20 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--mtm)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hybrid retrieval</div>
                <div style={{ fontSize: 13.5, color: 'var(--tx-1)', marginTop: 8, lineHeight: 1.55 }}>
                  BM25 + cosine + Reciprocal Rank Fusion, with session-aware ranking, lifted retrieval coverage without adding agentic control flow.
                </div>
              </div>
              <div className="card card-pad" style={{ padding: 20 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--mtm)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>LLM judge</div>
                <div style={{ fontSize: 13.5, color: 'var(--tx-1)', marginTop: 8, lineHeight: 1.55 }}>
                  Substring scoring under-counted paraphrases by 12.4 points. v1 reports judged and substring numbers side by side.
                </div>
              </div>
              <div className="card card-pad" style={{ padding: 20 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--mtm)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>V1.1 frontier</div>
                <div style={{ fontSize: 13.5, color: 'var(--tx-1)', marginTop: 8, lineHeight: 1.55 }}>
                  Temporal arithmetic and multi-session aggregation remain model-reasoning limits. The next lever is narrow, structured temporal help.
                </div>
              </div>
            </div>
          </div>

          <div className="stack-md">
            <div className="card">
              <div className="card-h">
                <div className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ITERATIVE_REASONER · retained negative result
                </div>
                <span className="chip mono">≤ 6 LLM calls</span>
              </div>
              <div style={{ padding: '20px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.65, color: 'var(--tx-1)' }}>
                <div style={{ color: 'var(--tx-3)' }}># A/B result, paraphrased</div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ color: 'var(--mtm)' }}>direct</span>
                  <div style={{ color: 'var(--tx-2)', paddingLeft: 16, marginTop: 4 }}>single-session-user ≈ 88% · multi-session 16%</div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <span style={{ color: 'var(--mtm)' }}>iterative</span>
                  <div style={{ color: 'var(--tx-2)', paddingLeft: 16, marginTop: 4, lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--accent)' }}>(A)</span> decompose → retrieve per sub-question<br />
                    <span style={{ color: 'var(--accent)' }}>(B)</span> verify claims → compose answer<br />
                    <span style={{ color: 'var(--accent)' }}>(C)</span> lost to direct retrieval on both slices<br />
                    <span style={{ color: 'var(--accent)' }}>(D)</span> kept as tested documentation, not v1 architecture
                  </div>
                </div>
              </div>
            </div>

            <Callout icon="◷" title="What broke the ceiling">
              A stronger answerer, cleaner direct retrieval, session-aware ranking, fixed context truncation, and LTM supersession. Not an agentic reasoning loop.
            </Callout>

            <Callout icon="◆" title="Why it's still in the repo">
              Negative results are architecture. Keeping the loop tested prevents the project from re-learning the same lesson in v1.1.
            </Callout>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================

function RequestSection() {
  return (
    <section className="section">
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 60, alignItems: 'end', marginBottom: 40 }}>
          <div>
            <Eyebrow num="10">A request, end-to-end</Eyebrow>
            <h2 className="h-1 serif" style={{ marginTop: 18 }}>
              <em>"Where do I live now?"</em>
            </h2>
          </div>
          <p className="lede">
            One user turn through a healthy Continuum deployment. Every box below is a swappable component behind a Protocol — the defaults are what the benchmarks use.
          </p>
        </div>
        <RequestWalkthrough />
      </div>
    </section>
  );
}

// =============================================================

function NotSection() {
  const rows = [
    {
      q: 'Continuum is not a vector database.',
      a: 'It uses pgvector under the hood, but vector similarity is one signal of four. The supersession and bi-temporal semantics are what pgvector alone cannot give you.',
    },
    {
      q: 'Continuum is not a reasoner.',
      a: 'No agentic loop or chain-of-thought orchestration on the v1 hot path. Use LangGraph, AutoGen or your own loop on top. Continuum is what they should plug into for memory.',
    },
    {
      q: 'Continuum is not a managed service.',
      a: 'It is an open-source Python framework. Self-host on your own Postgres. Deploy scripts, observability and multi-tenant hardening are still future production-readiness work.',
    },
    {
      q: '"Free" supersession?',
      a: 'No. The benchmark measures the schema\'s ability to surface the current fact once a contradiction is detected. The detector itself runs through an LLM at promotion time and has its own quality axis.',
    },
  ];

  return (
    <section className="section">
      <div className="wrap-tight">
        <Eyebrow num="11">Honest scope</Eyebrow>
        <h2 className="h-1 serif" style={{ marginTop: 18, marginBottom: 40 }}>
          What Continuum is <em>not</em>.
        </h2>
        <div>
          {rows.map((r, i) => (
            <div className="faq-row" key={i}>
              <h4>{r.q}</h4>
              <p>{r.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================

function RoadmapSection() {
  const shipped = [
    'STM / MTM / LTM three-tier hierarchy',
    'Hybrid BM25 + cosine retrieval with Reciprocal Rank Fusion',
    'Live-row invalidation for current facts',
    'Bi-temporal valid-time and transaction-time queries',
    'Policy engine, optimizer chain, demo, benchmarks and CI gates',
  ];
  const next = [
    'Temporal-reasoning improvements for date arithmetic and counting',
    'Clean full LOCOMO / Mem0 head-to-head before publishing competitive claims',
    'OpenRouter cost accounting in result JSON',
    'Production hardening: deploy scripts, observability and multi-tenant testing',
  ];

  return (
    <section id="roadmap" className="section portfolio-section">
      <div className="wrap">
        <div className="section-header">
          <h2 className="section-title">Roadmap</h2>
        </div>
        <div className="roadmap-grid">
          <RoadmapCard status="✓ v1.0.0 · Shipped" title="Core memory infrastructure" items={shipped} done />
          <RoadmapCard status="⟳ v1.1 · Next" title="Evaluation and production frontier" items={next} />
        </div>
      </div>
    </section>
  );
}

function RoadmapCard({ status, title, items, done }) {
  return (
    <div className={`roadmap-card ${done ? 'done' : ''}`}>
      <div className="roadmap-status mono">{status}</div>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}><span>{done ? '✓' : '◐'}</span>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================

function EndingSection() {
  const [copiedKey, setCopiedKey] = useStateA('');
  const copy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1400);
  };
  const commands = [
    ['clone', 'git clone https://github.com/Genkryptos/Continuum && cd Continuum'],
    ['install', 'pip install -e .'],
    ['demo',   'make demo-chat        # 60-second scripted walkthrough'],
    ['bench',  'make bench-all        # the four benchmarks, ~60 s, no infra'],
    ['repro',  'OPENROUTER_API_KEY=... make repro-everything        # v1 headline run'],
  ];
  const citation = `Continuum: production-grade memory infrastructure for AI agents.
https://github.com/Genkryptos/Continuum, 2026.`;

  return (
    <section id="start" className="section ending-section">
      <div className="wrap-tight">
        <Eyebrow num="12">Start here</Eyebrow>
        <h2 className="h-1 serif" style={{ marginTop: 18, marginBottom: 14 }}>
          Five commands.<br />
          <em>That's the whole on-ramp.</em>
        </h2>
        <p className="lede" style={{ marginBottom: 36, maxWidth: 600 }}>
          No Postgres needed for the demo or the four local memory-operation benchmarks. An OpenRouter key is only required if you want to reproduce the v1 LongMemEval-S headline.
        </p>

        <div className="ending-shell">
          {commands.map(([key, cmd]) => (
            <div key={key} className="ending-cmd">
              <span className="prompt mono">$</span>
              <code className="mono">{cmd}</code>
              <button
                className="ending-copy mono"
                onClick={() => copy(key, cmd.replace(/\s+#.*$/, ''))}
              >
                {copiedKey === key ? '✓ copied' : 'copy'}
              </button>
            </div>
          ))}
        </div>

        <div className="ending-actions">
          <a href="https://github.com/Genkryptos/Continuum" target="_blank" rel="noopener" className="btn btn-primary">
            ★ Star on GitHub →
          </a>
          <a href="https://github.com/Genkryptos/Continuum/blob/main/README.md" target="_blank" rel="noopener" className="btn btn-ghost mono" style={{ fontSize: 13 }}>
            README
          </a>
          <a href="https://github.com/Genkryptos/Continuum/tree/main/docs" target="_blank" rel="noopener" className="btn btn-ghost mono" style={{ fontSize: 13 }}>
            docs/
          </a>
          <a href="https://github.com/Genkryptos/Continuum/blob/main/findings/reasoning_loop_2026-06.md" target="_blank" rel="noopener" className="btn btn-ghost mono" style={{ fontSize: 13 }}>
            v1 findings
          </a>
        </div>

        <div className="ending-citation">
          <div className="mono ending-citation-cap">cite</div>
          <pre className="mono">{citation}</pre>
          <button className="ending-copy mono ending-citation-copy" onClick={() => copy('cite', citation)}>
            {copiedKey === 'cite' ? '✓ copied' : 'copy'}
          </button>
        </div>
      </div>
    </section>
  );
}

// =============================================================

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <a href="#" className="nav-brand" style={{ fontSize: 16 }}>
              <div className="mark"></div>
              Continuum
            </a>
            <p style={{ marginTop: 14, fontSize: 13, color: 'var(--tx-2)', maxWidth: 320, lineHeight: 1.6 }}>
              Production-grade memory infrastructure for AI agents. Tiered storage, live-row invalidation, bi-temporal queries.
            </p>
            <div className="mono" style={{ marginTop: 18, fontSize: 11, color: 'var(--tx-3)' }}>
              MIT · Python 3.11+
            </div>
          </div>
          <div>
            <h4>Docs</h4>
            <ul>
              <li><a href="https://github.com/Genkryptos/Continuum/blob/main/docs/quickstart.md" target="_blank" rel="noopener">Quickstart</a></li>
              <li><a href="https://github.com/Genkryptos/Continuum/blob/main/docs/architecture.md" target="_blank" rel="noopener">Architecture</a></li>
              <li><a href="https://github.com/Genkryptos/Continuum/blob/main/docs/config.md" target="_blank" rel="noopener">Config reference</a></li>
              <li><a href="https://github.com/Genkryptos/Continuum/blob/main/docs/operations.md" target="_blank" rel="noopener">Operations</a></li>
            </ul>
          </div>
          <div>
            <h4>Benchmarks</h4>
            <ul>
              <li><a href="#benchmarks">LongMemEval-S</a></li>
              <li><a href="#supersession">Supersession</a></li>
              <li><a href="#bitemporal">Bi-temporal</a></li>
              <li><a href="#pipeline">Hybrid retrieval</a></li>
            </ul>
          </div>
          <div>
            <h4>Code</h4>
            <ul>
              <li><a href="https://github.com/Genkryptos/Continuum" target="_blank" rel="noopener">GitHub</a></li>
              <li><a href="https://github.com/Genkryptos/Continuum/issues" target="_blank" rel="noopener">Issues</a></li>
              <li><a href="https://github.com/Genkryptos/Continuum/commits/main" target="_blank" rel="noopener">Commits</a></li>
              <li><a href="https://github.com/Genkryptos/Continuum/blob/main/LICENSE" target="_blank" rel="noopener">License</a></li>
            </ul>
          </div>
        </div>
        <div className="signoff">
          <span>© 2026 Continuum · open source</span>
          <span>$ make demo-chat &nbsp;<span style={{ color: 'var(--accent)' }}>↗</span></span>
        </div>
      </div>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
