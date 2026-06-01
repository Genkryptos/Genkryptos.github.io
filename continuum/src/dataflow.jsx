/* global React */
const { useState: useStateD, useEffect: useEffectD, useRef: useRefD, useMemo: useMemoD } = React;

// =============================================================
// DataFlow — animated SVG visualisation of one turn through
// the full pipeline + background promotion.
//
// Motion is rAF-driven: particles follow the actual bezier curves
// of their edges, with easing and spawn/land scaling. Active edges
// draw a moving "comet head" along their path via CSS dashoffset.
// =============================================================

const NODE = {
  user:        { x: 140, y: 80,  w: 130, h: 56, label: 'USER',       sub: '"Where do I live?"' },
  retriever:   { x: 430, y: 80,  w: 200, h: 56, label: 'Retriever',  sub: '7 stages + optimizer' },
  responder:   { x: 720, y: 80,  w: 150, h: 56, label: 'Responder',  sub: 'caller LLM' },
  reply:       { x: 920, y: 80,  w: 130, h: 56, label: 'REPLY',      sub: '"Cambridge"' },

  stm:         { x: 140, y: 260, w: 200, h: 88, label: 'STM',  sub: 'raw turns · 4 096 tok', cls: 'stm' },
  mtm:         { x: 430, y: 260, w: 200, h: 88, label: 'MTM',  sub: 'summary blocks',         cls: 'mtm' },
  ltm:         { x: 740, y: 260, w: 240, h: 88, label: 'LTM',  sub: 'facts · invalidated_at · valid_from', cls: 'ltm' },

  promoter:    { x: 430, y: 440, w: 220, h: 56, label: 'Promoter', sub: 'summarise · extract · supersede' },
};

// ---------- maths: bezier path + easing ----------

function computePath(fromId, toId) {
  const a = NODE[fromId];
  const b = NODE[toId];
  const dx = b.x - a.x;
  const p0 = { x: a.x, y: a.y };
  const p2 = { x: b.x, y: b.y };
  // Control point biased away from straight line for a subtle curve.
  const p1 = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2 - Math.abs(dx) * 0.06 - 18,
  };
  return { p0, p1, p2 };
}

function bezier(t, p0, p1, p2) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function bezierD({ p0, p1, p2 }) {
  return `M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`;
}

function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

// Smooth s-curve — gentle out, gentle in. Pro motion language.
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Tiny overshoot on landing — gives the dot weight.
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ---------- phase script ----------

const PHASES = [
  {
    label: '01 · STM append (user)',
    note: 'session._append_to_stm(user_message) — foreground, retried',
    edges: [['user', 'stm']],
    particles: [{ from: 'user', to: 'stm', color: 'var(--stm)' }],
    highlight: ['user', 'stm'],
    band: 'fg',
    counters: [{ x: NODE.stm.x + 60, y: NODE.stm.y - 30, text: '+1 turn', cls: 'stm-color' }],
  },
  {
    label: '02a · LTM hybrid + graph expand',
    note: 'dense ⊕ sparse ⊕ RRF, k1=50 → 1-hop neighbours, graph_expand_n=10',
    edges: [['ltm', 'retriever']],
    particles: [
      { from: 'ltm', to: 'retriever', color: 'var(--ltm)' },
      { from: 'ltm', to: 'retriever', color: 'var(--ltm)', delay: 180, size: 3 },
      { from: 'ltm', to: 'retriever', color: 'var(--ltm)', delay: 340, size: 3 },
      { from: 'ltm', to: 'retriever', color: 'var(--ltm)', delay: 500, size: 2 },
    ],
    highlight: ['ltm', 'retriever'],
    band: 'fg',
    counters: [{ x: NODE.ltm.x - 80, y: NODE.ltm.y - 30, text: 'k1 = 50 → top 10', cls: 'ltm-color' }],
  },
  {
    label: '02b · MTM recent + STM tail',
    note: 'budget.mtm_reserved worth of summaries · stm_turns = 6 verbatim',
    edges: [['mtm', 'retriever'], ['stm', 'retriever']],
    particles: [
      { from: 'mtm', to: 'retriever', color: 'var(--mtm)' },
      { from: 'mtm', to: 'retriever', color: 'var(--mtm)', delay: 220, size: 3 },
      { from: 'stm', to: 'retriever', color: 'var(--stm)', delay: 120 },
      { from: 'stm', to: 'retriever', color: 'var(--stm)', delay: 360, size: 3 },
    ],
    highlight: ['mtm', 'stm', 'retriever'],
    band: 'fg',
    counters: [
      { x: NODE.mtm.x + 60, y: NODE.mtm.y - 30, text: 'top 5', cls: 'mtm-color' },
      { x: NODE.stm.x + 60, y: NODE.stm.y - 30, text: '6 turns', cls: 'stm-color' },
    ],
  },
  {
    label: '02c · Composite scoring + BGE rerank',
    note: '0.45·rel + 0.25·imp + 0.20·rec + 0.10·conf  ×  layer_boost[tier]',
    edges: [],
    particles: [],            // no travel — show internal "thinking" pulse instead
    pulseNode: 'retriever',
    highlight: ['retriever'],
    band: 'fg',
    counters: [{ x: NODE.retriever.x + 80, y: NODE.retriever.y - 30, text: 'rerank → 10', cls: '' }],
  },
  {
    label: '03 · Responder (your LLM)',
    note: 'caller-injected. ContextBundle → reply string',
    edges: [['retriever', 'responder']],
    particles: [{ from: 'retriever', to: 'responder', color: 'var(--accent)', size: 5 }],
    highlight: ['retriever', 'responder'],
    band: 'fg',
  },
  {
    label: '04 · Reply emitted + STM append (assistant)',
    note: 'process_turn returns here. Foreground path done.',
    edges: [['responder', 'reply'], ['responder', 'stm']],
    particles: [
      { from: 'responder', to: 'reply', color: 'var(--accent)' },
      { from: 'responder', to: 'stm',   color: 'var(--stm)', delay: 180 },
    ],
    highlight: ['responder', 'reply', 'stm'],
    band: 'fg',
  },
  {
    label: '05 · TriggerManager.after_turn (queued)',
    note: 'new_entity or block_accumulation ≥ 20 → schedule promotion',
    edges: [['stm', 'promoter']],
    particles: [{ from: 'stm', to: 'promoter', color: 'var(--warn)' }],
    highlight: ['stm', 'promoter'],
    band: 'bg',
    counters: [{ x: NODE.promoter.x + 90, y: NODE.promoter.y - 30, text: 'block_threshold ≥ 20', cls: 'bg-color' }],
  },
  {
    label: '06 · Promoter — summarise',
    note: 'LLM summarises STM chunk into an MTM SummaryBlock',
    edges: [['promoter', 'mtm']],
    particles: [{ from: 'promoter', to: 'mtm', color: 'var(--mtm)' }],
    highlight: ['promoter', 'mtm'],
    band: 'bg',
    counters: [{ x: NODE.mtm.x + 60, y: NODE.mtm.y - 30, text: '+1 block', cls: 'mtm-color' }],
  },
  {
    label: '07 · Promoter — extract facts + supersede',
    note: 'atomic facts → LTM; stamp invalidated_at on contradicted older rows',
    edges: [['promoter', 'ltm']],
    particles: [
      { from: 'promoter', to: 'ltm', color: 'var(--ltm)' },
      { from: 'promoter', to: 'ltm', color: 'var(--ltm)', delay: 180, size: 3 },
      { from: 'promoter', to: 'ltm', color: 'var(--ltm)', delay: 340, size: 3 },
    ],
    highlight: ['promoter', 'ltm'],
    band: 'bg',
    showSupersede: true,
    counters: [{ x: NODE.ltm.x - 70, y: NODE.ltm.y - 30, text: '+3 facts · 1 invalidated', cls: 'ltm-color' }],
  },
];

const PHASE_DURATION = 2300;  // ms each phase holds

const TRAVEL_DUR = 1250;      // particle travel duration in ms
const SPAWN_FRAC = 0.10;      // 0–0.10 of travel = spawn-in scale
const LAND_FRAC  = 0.82;      // 0.82–1.0 = land/dissolve scale

// All edges that exist in the graph (drawn faint when inactive).
const STATIC_EDGES = [
  ['user', 'retriever'], ['retriever', 'responder'], ['responder', 'reply'], ['responder', 'stm'],
  ['stm', 'retriever'], ['mtm', 'retriever'], ['ltm', 'retriever'],
  ['stm', 'promoter'], ['promoter', 'mtm'], ['promoter', 'ltm'],
];

// =============================================================
// WorldState — derived from current phase + completed-cycles
// counter. Lets the diagram show actual *accumulation* across
// loops: STM filling and dumping, MTM blocks stacking, LTM
// facts gridding up with supersession greying.
// =============================================================

function getWorldState(phase, cycle) {
  // STM oscillates within each cycle: fills as turns append,
  // drops on promotion (phase 7+).
  let stmFill;
  if (phase === 0)        stmFill = 0.42;
  else if (phase < 5)     stmFill = 0.58 + phase * 0.03;
  else if (phase === 5)   stmFill = 0.78;
  else if (phase === 6)   stmFill = 0.82;
  else                    stmFill = 0.34;   // post-promotion
  // Add tiny long-run growth so STM also "learns" it lives in a long session
  stmFill = Math.min(0.95, stmFill + Math.min(0.1, cycle * 0.012));

  const mtmBlocks      = Math.min(cycle, 8);
  const ltmFacts       = Math.min(cycle * 3, 24);
  const invalidatedFacts = Math.min(Math.floor(cycle / 2), 6);

  return { stmFill, mtmBlocks, ltmFacts, invalidatedFacts };
}

function TierIndicator({ tier, world }) {
  const n = NODE[tier];
  if (!n) return null;
  const padX = 12;
  const innerW = n.w - padX * 2;
  const innerY = n.h - 22; // above bottom edge

  if (tier === 'stm') {
    return (
      <g transform={`translate(${padX} ${innerY})`} className="df-tier-ind">
        <text x={0} y={-4} className="df-tier-cap mono">tokens</text>
        <text x={innerW} y={-4} textAnchor="end" className="df-tier-cap mono">
          {Math.round(world.stmFill * 4096).toLocaleString()} / 4096
        </text>
        <rect width={innerW} height={3} rx={1.5} fill="rgba(255,255,255,0.07)" />
        <rect
          width={innerW * world.stmFill}
          height={3}
          rx={1.5}
          fill="var(--stm)"
          style={{ transition: 'width 700ms cubic-bezier(.4,0,.2,1)' }}
        />
      </g>
    );
  }
  if (tier === 'mtm') {
    const visible = Math.min(world.mtmBlocks, 5);
    return (
      <g transform={`translate(${padX} ${innerY - 10})`} className="df-tier-ind">
        <text x={0} y={-4} className="df-tier-cap mono">blocks</text>
        <text x={innerW} y={-4} textAnchor="end" className="df-tier-cap mono">{world.mtmBlocks}</text>
        {Array.from({ length: visible }).map((_, i) => (
          <rect
            key={i}
            x={0}
            y={i * 4}
            width={innerW * (0.55 + i * 0.07)}
            height={2}
            rx={1}
            fill="var(--mtm)"
            opacity={0.35 + i * 0.12}
            style={{ transition: 'opacity 400ms ease' }}
          />
        ))}
      </g>
    );
  }
  if (tier === 'ltm') {
    const total = Math.min(world.ltmFacts, 24);
    const cols = 12;
    const sq = 5;
    const gap = 2;
    return (
      <g transform={`translate(${padX} ${innerY - 10})`} className="df-tier-ind">
        <text x={0} y={-4} className="df-tier-cap mono">facts</text>
        <text x={innerW} y={-4} textAnchor="end" className="df-tier-cap mono">
          {world.ltmFacts}
          {world.invalidatedFacts > 0 && (
            <tspan opacity={0.5}>  ·  {world.invalidatedFacts} invalidated</tspan>
          )}
        </text>
        {Array.from({ length: total }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const isSuperseded = i < world.invalidatedFacts;
          return (
            <rect
              key={i}
              x={col * (sq + gap)}
              y={row * (sq + gap)}
              width={sq}
              height={sq}
              rx={1}
              fill={isSuperseded ? 'rgba(255,255,255,0.18)' : 'var(--ltm)'}
              opacity={isSuperseded ? 0.5 : 0.85}
              className="df-fact"
              style={{ animationDelay: `${i * 30}ms` }}
            />
          );
        })}
      </g>
    );
  }
  return null;
}

// =============================================================
// AmbientField — a layer of slowly drifting dots that keeps the
// canvas feeling alive between phase transitions. Self-contained
// rAF so it doesn't trigger DataFlow re-renders.
// =============================================================

const AMBIENT_COUNT = 8;

function AmbientField() {
  const groupRef = useRefD(null);
  const dotsRef = useRefD([]);

  useEffectD(() => {
    // Seed dots with random initial positions, velocities and phases.
    dotsRef.current = Array.from({ length: AMBIENT_COUNT }, () => ({
      x: Math.random() * 1040,
      y: Math.random() * 540,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf;
    const tick = () => {
      const els = groupRef.current?.children;
      if (!els) { raf = requestAnimationFrame(tick); return; }
      const t = performance.now() / 1000;
      for (let i = 0; i < dotsRef.current.length; i++) {
        const d = dotsRef.current[i];
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = 1040;
        if (d.x > 1040) d.x = 0;
        if (d.y < 0) d.y = 540;
        if (d.y > 540) d.y = 0;
        // soft breathing opacity
        const op = 0.05 + 0.10 * (0.5 + 0.5 * Math.sin(t * 0.55 + d.phase));
        const el = els[i];
        el.setAttribute('cx', d.x);
        el.setAttribute('cy', d.y);
        el.setAttribute('opacity', op);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const colorFor = (h) => h === 'stm' ? 'var(--stm)'
                       : h === 'mtm' ? 'var(--mtm)'
                       : h === 'ltm' ? 'var(--ltm)' : 'var(--accent)';

  return (
    <g ref={groupRef} style={{ pointerEvents: 'none' }}>
      {Array.from({ length: AMBIENT_COUNT }, (_, i) => (
        <circle
          key={i}
          cx={0}
          cy={0}
          r={1}
          fill={colorFor(['stm','mtm','ltm','accent'][i % 4])}
          opacity={0}
          style={{ mixBlendMode: 'screen' }}
        />
      ))}
    </g>
  );
}

// =============================================================
// Particle — rAF-driven, follows the bezier curve of its edge.
// =============================================================

function Particle({ from, to, color, delay = 0, size = 5 }) {
  const groupRef = useRefD(null);
  const path = useMemoD(() => computePath(from, to), [from, to]);

  useEffectD(() => {
    const start = performance.now() + delay;
    let raf;
    const tick = (now) => {
      const t = clamp01((now - start) / TRAVEL_DUR);
      const tMotion = easeInOutCubic(t);
      const pos = bezier(tMotion, path.p0, path.p1, path.p2);

      // Spawn → land scale curve. Overshoots a hair on land for "weight".
      let scale;
      if (t < SPAWN_FRAC) {
        scale = easeOutBack(t / SPAWN_FRAC) * 1.05;
      } else if (t > LAND_FRAC) {
        const k = (t - LAND_FRAC) / (1 - LAND_FRAC);
        scale = (1 - k) * 1.05;
      } else {
        scale = 1.05;
      }
      const opacity = t < SPAWN_FRAC
        ? t / SPAWN_FRAC
        : (t > LAND_FRAC ? (1 - (t - LAND_FRAC) / (1 - LAND_FRAC)) : 1);

      if (groupRef.current) {
        groupRef.current.setAttribute(
          'transform',
          `translate(${pos.x} ${pos.y}) scale(${scale})`,
        );
        groupRef.current.setAttribute('opacity', opacity);
      }

      if (t >= 1) {
        if (groupRef.current) {
          groupRef.current.setAttribute('opacity', '0');
          groupRef.current.setAttribute(
            'transform',
            `translate(${path.p2.x} ${path.p2.y}) scale(0)`,
          );
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    // Two-frame pre-roll so the initial transform is committed before motion.
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(tick); });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <g ref={groupRef} className="df-particle" style={{ color, willChange: 'transform, opacity' }} opacity={0}>
      <circle className="df-particle-halo" r={size * 2.1} fill={color} />
      <circle className="df-particle-core" r={size} fill={color} />
    </g>
  );
}

// =============================================================
// Node — with optional breathing idle and a small active pin.
// =============================================================

function Node({ id, active, dim, pulsing, world }) {
  const n = NODE[id];
  const cx = n.x;
  const cy = n.y;
  const fillCls = n.cls
    ? `df-node df-${n.cls}` + (active ? ' active' : '') + (dim ? ' dim' : '')
    : 'df-node' + (active ? ' active' : '') + (dim ? ' dim' : '');

  const pulseColor = n.cls === 'stm' ? 'var(--stm)'
                   : n.cls === 'mtm' ? 'var(--mtm)'
                   : n.cls === 'ltm' ? 'var(--ltm)'
                   : 'var(--accent)';

  return (
    <g
      className={`df-node-group ${active ? 'is-active' : ''}`}
      transform={`translate(${cx - n.w / 2} ${cy - n.h / 2})`}
    >
      <rect
        className={fillCls}
        width={n.w}
        height={n.h}
        rx={10}
      />
      {active && (
        <circle
          cx={14}
          cy={14}
          r={4}
          fill={pulseColor}
          className="df-active-pin"
          style={{ pointerEvents: 'none', color: pulseColor }}
        />
      )}
      {pulsing && (
        <g className="df-thinking" style={{ pointerEvents: 'none' }}>
          <circle cx={n.w / 2 - 9} cy={n.h / 2 + 10} r="2.7" fill="var(--accent)" />
          <circle cx={n.w / 2} cy={n.h / 2 + 10} r="2.7" fill="var(--accent)" />
          <circle cx={n.w / 2 + 9} cy={n.h / 2 + 10} r="2.7" fill="var(--accent)" />
        </g>
      )}
      <text x={n.w / 2} y={22} className="df-node-label" textAnchor="middle">{n.label}</text>
      <text x={n.w / 2} y={40} className="df-node-sub"   textAnchor="middle">{n.sub}</text>
      {world && n.cls && <TierIndicator tier={id} world={world} />}
    </g>
  );
}

// =============================================================
// Edge — faint static guide + "comet" highlight when active.
// Cross-fades the highlight in/out via an opacity transition.
// =============================================================

function Edge({ from, to, active, band }) {
  const path = useMemoD(() => computePath(from, to), [from, to]);
  const d = bezierD(path);
  return (
    <g>
      {/* faint static line */}
      <path d={d} className="df-edge-bg" fill="none" vectorEffect="non-scaling-stroke" />
      {/* active highlight — always rendered, opacity-faded for smoothness */}
      <path
        d={d}
        className={`df-edge-flow ${band === 'bg' ? 'bg' : 'fg'} ${active ? 'on' : ''}`}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

// =============================================================
// DataFlow — composition.
// =============================================================

function DataFlow() {
  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [phase, setPhase] = useStateD(0);
  const [playing, setPlaying] = useStateD(!prefersReduced);
  const [cycle, setCycle] = useStateD(0);
  const prevPhaseRef = useRefD(0);

  useEffectD(() => {
    if (!playing) return;
    const t = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASE_DURATION);
    return () => clearTimeout(t);
  }, [phase, playing]);

  // Detect a full loop wrap (PHASES.length-1 -> 0) and bump cycle.
  useEffectD(() => {
    if (prevPhaseRef.current === PHASES.length - 1 && phase === 0) {
      setCycle((c) => c + 1);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  const current = PHASES[phase];
  const activeEdges = new Set(current.edges.map(([a, b]) => `${a}-${b}`));
  const highlightSet = new Set(current.highlight);
  const allNodes = ['user', 'retriever', 'responder', 'reply', 'stm', 'mtm', 'ltm', 'promoter'];
  const world = getWorldState(phase, cycle);

  return (
    <div className="dataflow">
      <div className="df-head">
        <div>
          <div className="mono df-phase-num">
            phase {String(phase + 1).padStart(2, '0')} / {String(PHASES.length).padStart(2, '0')}
            <span className={`df-band ${current.band}`}>
              {current.band === 'fg' ? '● foreground' : '● background queue'}
            </span>
            <span className="df-cycle mono">cycle {String(cycle + 1).padStart(2, '0')}</span>
          </div>
          <div className="df-phase-label">
            {/* Letter-stagger fade-in. key={phase} re-mounts so the animation re-fires. */}
            <span key={phase} className="df-phase-text">
              {current.label.split('').map((ch, i) => (
                <span key={i} style={{ animationDelay: `${i * 14}ms` }}>{ch === ' ' ? '\u00a0' : ch}</span>
              ))}
            </span>
          </div>
          <div className="df-phase-note mono">{current.note}</div>
        </div>
        <div className="df-controls">
          <button className="btn-mini" onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ pause' : '▶ play'}
          </button>
          <button className="btn-mini" onClick={() => setPhase((p) => (p - 1 + PHASES.length) % PHASES.length)}>‹ prev</button>
          <button className="btn-mini" onClick={() => setPhase((p) => (p + 1) % PHASES.length)}>next ›</button>
          <button className="btn-mini" onClick={() => { setPhase(0); setCycle(0); }}>↺ reset</button>
        </div>
      </div>

      <div className={`df-stage band-${current.band}`}>
        <svg viewBox="0 0 1040 540" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision">
          <defs>
            {/* radial vignette mask — focuses attention on active band */}
            <radialGradient id="df-vignette-fg" cx="0.5" cy="0.18" r="0.85">
              <stop offset="0%" stopColor="rgba(197,243,92,0.05)" />
              <stop offset="100%" stopColor="rgba(197,243,92,0)" />
            </radialGradient>
            <radialGradient id="df-vignette-bg" cx="0.5" cy="0.85" r="0.85">
              <stop offset="0%" stopColor="rgba(245,184,92,0.05)" />
              <stop offset="100%" stopColor="rgba(245,184,92,0)" />
            </radialGradient>
          </defs>

          {/* Ambient vignette that swaps when band changes */}
          <rect
            width="1040"
            height="540"
            fill={current.band === 'fg' ? 'url(#df-vignette-fg)' : 'url(#df-vignette-bg)'}
            style={{ transition: 'fill 600ms ease' }}
          />

          <text x={16} y={28}  className="df-band-label mono">FOREGROUND  ·  process_turn()</text>
          <text x={16} y={418} className="df-band-label mono">BACKGROUND  ·  BackgroundQueue</text>

          <line x1={0} x2={1040} y1={200} y2={200} className="df-divider" />
          <line x1={0} x2={1040} y1={380} y2={380} className="df-divider" />

          {/* Ambient drifting dots so the canvas never sits still */}
          <AmbientField />

          {/* Edges */}
          {STATIC_EDGES.map(([a, b]) => (
            <Edge
              key={`s-${a}-${b}`}
              from={a}
              to={b}
              active={activeEdges.has(`${a}-${b}`)}
              band={current.band}
            />
          ))}

          {/* Moving flow sits behind solid nodes. */}
          <g key={`particles-${phase}`}>
            {current.particles.map((p, i) => (
              <Particle key={i} {...p} />
            ))}
          </g>

          {/* Nodes */}
          {allNodes.map((id) => (
            <Node
              key={id}
              id={id}
              active={highlightSet.has(id)}
              dim={!highlightSet.has(id)}
              pulsing={current.pulseNode === id}
              world={world}
            />
          ))}

          {/* Counters stay above the solid boxes. */}
          <g key={`counters-${phase}`}>
            {current.counters && current.counters.map((c, i) => (
              <text
                key={`c-${i}`}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                className={`df-counter ${c.cls}`}
                style={{ animationDelay: '400ms' }}
              >
                {c.text}
              </text>
            ))}
          </g>

          {/* Supersession illustration on phase 07 */}
          {current.showSupersede && (
            <g
              className="df-ss-fade-in"
              transform={`translate(${NODE.ltm.x - NODE.ltm.w / 2 + 14} ${NODE.ltm.y + NODE.ltm.h / 2 + 14})`}
            >
              <text x={0} y={0} className="df-ltm-row mono">
                a1 · location · <tspan style={{ textDecoration: 'line-through' }}>Boston</tspan>
              </text>
              <text x={20} y={16} className="df-ltm-row mono" fill="var(--ltm)">
                invalidated_at = 2026-05-24
              </text>
              <text x={0} y={32} className="df-ltm-row mono" fill="var(--accent)">
                f3 · location · Cambridge  <tspan opacity="0.5">(NULL)</tspan>
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="df-progress">
        <div
          key={`${phase}-${playing}`}
          className={`df-progress-fill ${!playing ? 'paused' : ''}`}
          style={{ animationDuration: `${PHASE_DURATION}ms` }}
        />
      </div>

      <div className="df-stepstrip">
        {PHASES.map((p, i) => (
          <button
            key={i}
            className={`df-step ${i === phase ? 'on' : ''} ${PHASES[i].band === 'bg' ? 'bg' : 'fg'}`}
            onClick={() => { setPhase(i); setPlaying(false); }}
            title={p.label}
          >
            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

window.DataFlow = DataFlow;
