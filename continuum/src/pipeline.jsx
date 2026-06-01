/* global React */
const { useState: useStateP } = React;

// =============================================================
// Pipeline overview — interactive process_turn walkthrough
// =============================================================

const FG_STEPS = [
  {
    id: 'stm-append-user',
    n: '01',
    name: '_append_to_stm(user_message)',
    call: 'continuum/core/session.py',
    latency: 'O(1)',
    tier: 'stm',
  },
  {
    id: 'retrieve',
    n: '02',
    name: '_retrieve(user_message, budget)',
    call: 'continuum/retrieval/retriever.py',
    latency: '7-stage',
    tier: 'all',
  },
  {
    id: 'respond',
    n: '03',
    name: 'responder(user_message, context)',
    call: 'caller-injected (default stub)',
    latency: 'LLM',
    tier: 'fg',
  },
  {
    id: 'stm-append-asst',
    n: '04',
    name: '_append_to_stm(reply, role="assistant")',
    call: 'continuum/core/session.py',
    latency: 'O(1)',
    tier: 'stm',
  },
];

const BG_STEPS = [
  {
    id: 'access',
    n: '05',
    name: '_log_access(user, reply, ctx)',
    call: 'continuum/core/session.py',
    latency: 'queued',
    tier: 'bg',
  },
  {
    id: 'index',
    n: '06',
    name: '_incremental_index(ctx)',
    call: 'continuum/core/session.py',
    latency: 'queued',
    tier: 'bg',
  },
  {
    id: 'triggers',
    n: '07',
    name: 'TriggerManager.after_turn(entities)',
    call: 'continuum/promotion/triggers.py',
    latency: 'queued',
    tier: 'bg',
  },
  {
    id: 'promote',
    n: '08',
    name: 'Promoter.promote(scope)  ·  if fired',
    call: 'continuum/promotion/promoter.py',
    latency: 'queued',
    tier: 'bg',
  },
];

const STAGE_DETAIL = {
  'stm-append-user': {
    title: 'Persist the raw turn to STM',
    desc: 'STM is the only tier that sees the user\'s exact words. Every other tier holds derivatives. The append is retried under the session\'s tenacity policy and swallows on persistent failure — the turn continues degraded rather than crashing.',
    kv: [
      ['Source',        <code>continuum/core/session.py::_append_to_stm</code>],
      ['Default impl',  <code>InMemorySTM</code>, ' (PostgresSTM available)'],
      ['Wrapped in',    <code>MemoryItem</code>, ' with session_id, agent_id, user_id, role'],
      ['Failure mode',  'Logged, swallowed. Turn proceeds.'],
    ],
  },
  'retrieve': {
    title: 'Run the full 7-stage retrieval pipeline',
    desc: 'Every collaborator is duck-typed and optional. A missing or failing stage degrades to a no-op — retrieve() never raises into the hot path. ContinuumSession can then apply the optimizer to the returned bundle before the responder sees it.',
  },
  'respond': {
    title: 'Hand the bundle to your LLM',
    desc: 'The Responder protocol is one method: async respond(user_message, context) -> str. Default is a deterministic stub. The framework is not opinionated about your model choice.',
  },
  'stm-append-asst': {
    title: 'Close the turn',
    desc: 'STM now carries both sides. process_turn returns to the caller here — the remaining work is enqueued on BackgroundQueue via schedule_nowait.',
  },
  'access': {
    title: 'Log access (best-effort)',
    desc: 'Records session_id, query length, reply length, retrieved item count. Feeds the recency channel of the composite scorer.',
  },
  'index': {
    title: 'Refresh neighbours for hot LTM items',
    desc: 'For each LTM item in the bundle, ltm.neighbors(item.id, depth=1) is called so the graph index stays warm. Skipped silently on failure.',
  },
  'triggers': {
    title: 'Two cheap checks, one queued promotion if fired',
    desc: 'TriggerManager.after_turn runs the new-entity and block-accumulation checks. An in-flight guard collapses bursts so a chatty session can\'t stack promotion jobs.',
  },
  'promote': {
    title: 'Promoter: summarise, extract, invalidate',
    desc: 'Runs only if a trigger fired. Three substeps: summarise the chunk into an MTM block, extract atomic facts + entities into LTM, then walk new facts and stamp invalidated_at on contradicted older rows.',
  },
};

function PipelineFlow() {
  const [active, setActive] = useStateP('retrieve');
  const all = [...FG_STEPS, ...BG_STEPS];
  const activeStep = all.find(s => s.id === active);
  const detail = STAGE_DETAIL[active];

  return (
    <div className="pipeline">
      <div className="pipeline-head">
        <div>
          <h3 className="h-3">process_turn(user_msg) — four foreground, four queued</h3>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 8, maxWidth: 540 }}>
            From <code>continuum/core/session.py</code>. Retrieval and optimisation are a single nested step. The reply returns to the caller after step 04; the four background jobs run on the shared <code>BackgroundQueue</code>.
          </p>
        </div>
        <div className="pipeline-toggle" aria-label="path">
          <button className="on">foreground · 4</button>
          <button className="on">background · 4</button>
        </div>
      </div>

      <div>
        {FG_STEPS.map((step) => (
          <PipelineRow
            key={step.id}
            step={step}
            active={active === step.id}
            onClick={() => setActive(step.id)}
          />
        ))}

        <div className="pl-bg-banner">
          ── background queue · response already returned to caller ──
        </div>

        {BG_STEPS.map((step) => (
          <PipelineRow
            key={step.id}
            step={step}
            active={active === step.id}
            onClick={() => setActive(step.id)}
          />
        ))}
      </div>

      {detail && (
        <div style={{ marginTop: 30, padding: '24px 28px', borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx-3)', marginBottom: 8 }}>
              Step {activeStep.n} · {activeStep.tier === 'bg' ? 'background' : 'foreground'}
            </div>
            <h4 className="h-3" style={{ marginBottom: 14 }}>{detail.title}</h4>
            <p style={{ color: 'var(--tx-1)', fontSize: 14, lineHeight: 1.6 }}>{detail.desc}</p>
            {detail.kv && (
              <dl className="stage-kv" style={{ marginTop: 22 }}>
                {detail.kv.map(([key, ...val], i) => (
                  <React.Fragment key={i}>
                    <dt>{key}</dt>
                    <dd>{val}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
          </div>
          <div>
            <PipelineDetailExtra id={active} />
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineRow({ step, active, onClick }) {
  return (
    <div className={`pl-row ${active ? 'active' : ''}`}>
      <div className="pl-time">
        <div className="step-num mono">{step.n}</div>
        <div className="pl-line" />
      </div>
      <div>
        <div className="pl-card" onClick={onClick}>
          <div>
            <div className="pl-head">
              <div className="pl-name">{step.name}</div>
              {step.tier === 'stm' && <span className="chip chip-stm">STM</span>}
              {step.tier === 'all' && <span className="chip">3 tiers</span>}
              {step.tier === 'bg' && <span className="chip" style={{ color: 'var(--warn)' }}>queued</span>}
            </div>
            <div className="pl-call mono">{step.call}</div>
          </div>
          <div className="pl-latency mono">
            <div className="v">{step.latency}</div>
            <div>p50</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Per-step inline detail (code snippet, diagram, etc).
function PipelineDetailExtra({ id }) {
  if (id === 'retrieve') {
    const stages = [
      ['HyDE rewrite',       'optional · off by default', 'config.hyde_enabled'],
      ['LTM hybrid search',  'dense ⊕ sparse ⊕ RRF',     'k1 = 50'],
      ['Graph expansion',    '1-hop neighbours of top entity hits', 'graph_expand_n = 10'],
      ['Composite scoring',  '4-channel + policy filter + boost', 'tau_hours = 168'],
      ['BGE rerank',         'cross-encoder second pass',  'bge-reranker-v2-m3'],
      ['STM + MTM recent',   'raw tail + summaries within budget', '6 turns · top 5'],
      ['Assemble bundle',    'ContextBundle + tier breakdown', 'LTM → MTM → STM'],
    ];
    return (
      <div className="stack-sm">
        <div className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          context assembly stages (in order)
        </div>
        {stages.map(([name, desc, cfg], i) => (
          <div key={name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
            <span className="mono" style={{ color: 'var(--tx-3)', fontSize: 11 }}>{String(i+1)}</span>
            <div>
              <div className="mono" style={{ fontSize: 12.5, color: 'var(--tx-0)' }}>{name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--tx-2)', marginTop: 2 }}>{desc}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--mtm)' }}>{cfg}</span>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'triggers') {
    return (
      <div className="stack-sm">
        <div className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          TriggerManager · four conditions, one queued promotion
        </div>
        {[
          ['new_entity',         'turn mentions an entity absent from LTM',  'on_new_entity = True'],
          ['block_accumulation', '≥ N unprocessed MTM blocks',               'block_threshold = 20'],
          ['periodic',           'background sweep on a fixed cadence',       'every 6 h'],
          ['force_now()',        'manual session.checkpoint() (awaited)',     'sync, bypasses queue'],
        ].map(([cls, cond, cfg]) => (
          <div key={cls} style={{ padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <div className="mono" style={{ fontSize: 12.5, color: 'var(--tx-0)' }}>{cls}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--mtm)' }}>{cfg}</div>
            </div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-2)', marginTop: 4 }}>{cond}</div>
          </div>
        ))}
        <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,184,92,0.04)', border: '1px dashed rgba(245,184,92,0.25)', fontSize: 11.5, color: 'var(--warn)', fontFamily: "'JetBrains Mono', monospace" }}>
          IdleStmFlush is a separate watcher — flushes partial STM after a configurable idle gap.
        </div>
      </div>
    );
  }
  if (id === 'respond') {
    return (
      <CodeBlock path="continuum/core/protocols.py" lang="python">
        <span>{k('class')} {cl('Responder')}({cl('Protocol')}):</span>{'\n'}
        <span>    {k('async def')} {f('respond')}(</span>{'\n'}
        <span>        {self_('self')},</span>{'\n'}
        <span>        user_msg: {cl('str')},</span>{'\n'}
        <span>        context:  {cl('ContextBundle')},</span>{'\n'}
        <span>    ) {'-> '} {cl('str')}: ...</span>{'\n'}
        <span></span>{'\n'}
        <span>{c('# Plug in OpenAI…')}</span>{'\n'}
        <span>{k('class')} {cl('OpenAIResponder')}:</span>{'\n'}
        <span>    {k('async def')} {f('respond')}({self_('self')}, msg, ctx):</span>{'\n'}
        <span>        {k('return')} (</span>{'\n'}
        <span>            {k('await')} client.chat.completions.{f('create')}(</span>{'\n'}
        <span>                model={s('"gpt-4o"')},</span>{'\n'}
        <span>                messages=ctx.{f('as_messages')}(msg),</span>{'\n'}
        <span>            )</span>{'\n'}
        <span>        ).choices[{n('0')}].message.content</span>
      </CodeBlock>
    );
  }
  if (id === 'index') {
    return (
      <CodeBlock path="continuum/stores/postgres/ltm.py" lang="sql">
        <span>{c('-- migration 002: pgvector + HNSW index')}</span>{'\n'}
        <span>{k('CREATE INDEX')} ltm_emb_hnsw {k('ON')} ltm</span>{'\n'}
        <span>  {k('USING')} hnsw (embedding vector_cosine_ops)</span>{'\n'}
        <span>  {k('WITH')} (m = {n('16')}, ef_construction = {n('64')});</span>{'\n'}
        <span></span>{'\n'}
        <span>{c('-- partial: skip invalidated rows entirely')}</span>{'\n'}
        <span>{k('CREATE INDEX')} memory_nodes_live_kind_created_idx</span>{'\n'}
        <span>  {k('ON')} memory_nodes (kind, created_at {k('DESC')})</span>{'\n'}
        <span>  {k('WHERE')} invalidated_at {k('IS NULL')};</span>
      </CodeBlock>
    );
  }
  if (id === 'access') {
    return (
      <CodeBlock path="continuum/scoring/scorer.py" lang="python">
        <span>{c('# half-life decay — 14 days default')}</span>{'\n'}
        <span>{k('def')} {f('decay')}(age_sec: {cl('float')}) {'-> '} {cl('float')}:</span>{'\n'}
        <span>    {k('return')} math.{f('exp')}(-age_sec / HALF_LIFE)</span>{'\n'}
        <span></span>{'\n'}
        <span>{k('def')} {f('record')}({self_('self')}, ids: {cl('list')}[{cl('str')}]):</span>{'\n'}
        <span>    {k('for')} fact_id {k('in')} ids:</span>{'\n'}
        <span>        {self_('self')}.hits[fact_id] += {n('1')}</span>{'\n'}
        <span>        {self_('self')}.last_touched[fact_id] = time.{f('time')}()</span>
      </CodeBlock>
    );
  }
  if (id === 'promote') {
    return (
      <CodeBlock path="continuum/promotion/promoter.py" lang="python">
        <span>{c('# Runs only when a trigger fires.')}</span>{'\n'}
        <span>{k('async def')} {f('promote')}({self_('self')}, scope={k('None')}):</span>{'\n'}
        <span>    {c('# 1. summarise the STM chunk -> MTM block')}</span>{'\n'}
        <span>    block = {k('await')} {self_('self')}.summarizer.{f('run')}(chunk)</span>{'\n'}
        <span>    {k('await')} {self_('self')}.mtm.{f('write')}(block)</span>{'\n'}
        <span></span>{'\n'}
        <span>    {c('# 2. extract atomic facts + entities')}</span>{'\n'}
        <span>    facts    = {k('await')} {self_('self')}.fact_extractor.{f('run')}(block)</span>{'\n'}
        <span>    entities = {k('await')} {self_('self')}.entity_extractor.{f('run')}(block)</span>{'\n'}
        <span></span>{'\n'}
        <span>    {c('# 3. invalidate contradicted older rows')}</span>{'\n'}
        <span>    {k('for')} new {k('in')} facts:</span>{'\n'}
        <span>        existing = {k('await')} {self_('self')}.ltm.{f('find_same')}(</span>{'\n'}
        <span>            new.subject, new.attribute, current_only={k('True')},</span>{'\n'}
        <span>        )</span>{'\n'}
        <span>        {k('if')} existing {k('and')} {self_('self')}.contradicts(existing, new):</span>{'\n'}
        <span>            {k('await')} {self_('self')}.ltm.{f('invalidate')}(existing.id, now())</span>{'\n'}
        <span>        {k('await')} {self_('self')}.ltm.{f('write')}(new)</span>
      </CodeBlock>
    );
  }
  // STM cards
  return (
    <CodeBlock path="continuum/stores/stm/in_memory.py" lang="python">
      <span>{k('class')} {cl('InMemorySTM')}:</span>{'\n'}
      <span>    {k('def')} {f('append')}({self_('self')}, role, content):</span>{'\n'}
      <span>        tokens = {self_('self')}.tokenizer.{f('count')}(content)</span>{'\n'}
      <span>        turn = {cl('Turn')}(role, content, tokens, recorded_at=now())</span>{'\n'}
      <span>        {k('with')} {self_('self')}.lock:</span>{'\n'}
      <span>            {self_('self')}.buf.{f('append')}(turn)</span>{'\n'}
      <span>            {self_('self')}.tokens += tokens</span>{'\n'}
      <span>            {k('if')} {self_('self')}.tokens {'>'} {self_('self')}.budget * {n('0.85')}:</span>{'\n'}
      <span>                {self_('self')}.triggers.{f('arm')}({s('"stm_overflow"')})</span>
    </CodeBlock>
  );
}

window.PipelineFlow = PipelineFlow;
