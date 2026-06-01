/* global React */
const { useState: useStateT } = React;

// =============================================================
// TryIt — interactive fact extraction + supersession demo.
// User selects a sentence; the local extractor creates atomic facts; the
// LTM table grows in real time. If a new fact contradicts an
// existing (subject, attribute) row, the old one is stamped with
// invalidated_at and the new row becomes the current value.
// =============================================================

const SAMPLE_PROMPTS = [
  'I live in NYC and just adopted a dog named Rex.',
  'I just moved to Boston for a new job at Stripe.',
  "Actually I never made it to Boston — moved to Cambridge instead.",
  'I sold my old Tesla and bought a Rivian last weekend.',
];

function TryIt() {
  const [selectedPrompt, setSelectedPrompt] = useStateT(SAMPLE_PROMPTS[0]);
  const [facts, setFacts] = useStateT([]);
  const [loading, setLoading] = useStateT(false);
  const [error, setError] = useStateT(null);
  const [lastDelta, setLastDelta] = useStateT(null);

  const newId = () => Math.random().toString(36).slice(2, 6);

  async function process() {
    const txt = selectedPrompt.trim();
    if (!txt || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (!window.ContinuumTryIt?.extractFacts) {
        throw new Error('Local extractor did not load. Refresh this page and try again.');
      }
      const extracted = await window.ContinuumTryIt.extractFacts(txt, null);

      const now = new Date().toISOString().slice(0, 10);
      const delta = { added: [], invalidated: [] };

      setFacts((prev) => {
        let updated = [...prev];
        for (const f of extracted) {
          if (!f || !f.subject || !f.attribute || f.value === undefined) continue;
          const newRow = {
            id: newId(),
            subject: String(f.subject),
            attribute: String(f.attribute),
            value: String(f.value),
            confidence: typeof f.confidence === 'number' ? f.confidence : 0.85,
            invalidated_at: null,
            replaced_by: null,
            recorded_at: now,
          };
          // Contradiction detection: same (subject, attribute), value differs, not yet invalidated.
          const existing = updated.find(
            (x) =>
              x.subject === newRow.subject &&
              x.attribute === newRow.attribute &&
              !x.invalidated_at &&
              x.value.toLowerCase() !== newRow.value.toLowerCase(),
          );
          if (existing) {
            updated = updated.map((x) =>
              x.id === existing.id ? { ...x, invalidated_at: now, replaced_by: newRow.id } : x,
            );
            delta.invalidated.push(existing.id);
          }
          updated.push(newRow);
          delta.added.push(newRow.id);
        }
        return updated;
      });

      setLastDelta(delta);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFacts([]);
    setLastDelta(null);
    setError(null);
  }

  const current = facts.filter((f) => !f.invalidated_at);
  const invalidatedCount = facts.length - current.length;

  return (
    <div className="tryit">
      <div className="tryit-grid">
        {/* INPUT COLUMN */}
        <div className="tryit-left">
          <div className="mono tryit-eyebrow">
            <span className="dot" />
            <span>session.process_turn() · live</span>
          </div>
          <h3 className="h-3 tryit-h">Select a statement.</h3>
          <p className="tryit-sub">
            Pick one of the prepared statements below. A local <code className="mono">FactExtractor</code> parses it in-browser, atomic facts land in the LTM table on the right, and contradictions stamp older rows with <code className="mono">invalidated_at</code>.
          </p>

          <div className="tryit-samples tryit-samples-main">
            <div className="mono tryit-cap">choose one</div>
            {SAMPLE_PROMPTS.map((p, index) => {
              const selected = selectedPrompt === p;
              return (
                <button
                  key={p}
                  type="button"
                  className={`tryit-sample mono ${selected ? 'selected' : ''}`}
                  onClick={() => setSelectedPrompt(p)}
                  disabled={loading}
                  aria-pressed={selected}
                >
                  <span className={selected ? 'tryit-choice-mark' : 'dim'}>{selected ? '✓' : `0${index + 1}`}</span> {p}
                </button>
              );
            })}
          </div>

          <div className="tryit-actions">
            <button
              className="btn btn-primary"
              onClick={process}
              disabled={!selectedPrompt.trim() || loading}
              style={{ padding: '10px 16px', fontSize: 13 }}
            >
              {loading ? (
                <>
                  <span className="tryit-spinner" /> extracting…
                </>
              ) : (
                <>↵ process selected</>
              )}
            </button>
            <button className="btn btn-ghost" onClick={reset} disabled={loading || facts.length === 0} style={{ padding: '10px 14px', fontSize: 13 }}>
              ↺ clear LTM
            </button>
          </div>

          {error && (
            <div className="tryit-error mono">
              ✕ {error}
            </div>
          )}
        </div>

        {/* LTM TABLE COLUMN */}
        <div className="tryit-right">
          <div className="tryit-table-head">
            <div>
              <div className="mono tryit-eyebrow" style={{ marginBottom: 4 }}>
                <span className="chip chip-ltm" style={{ padding: '2px 8px', fontSize: 10 }}>LTM</span>
                <span style={{ color: 'var(--tx-2)' }}>live · in-browser simulation</span>
              </div>
              <div className="tryit-table-stats mono">
                {current.length} current{invalidatedCount > 0 && (
                  <>
                    {' · '}
                    <span style={{ color: 'var(--tx-3)' }}>{invalidatedCount} invalidated</span>
                  </>
                )}
                {facts.length === 0 && <span style={{ color: 'var(--tx-3)' }}>empty</span>}
              </div>
            </div>
          </div>

          <div className="tryit-table-wrap">
            {facts.length === 0 ? (
              <div className="tryit-empty mono">
                <div>WHERE invalidated_at IS NULL</div>
                <div className="dim" style={{ marginTop: 6 }}>{'\u2014 no rows yet \u2014'}</div>
              </div>
            ) : (
              <table className="tryit-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>subject</th>
                    <th>attribute</th>
                    <th>value</th>
                    <th>invalidated_at</th>
                    <th>replaced_by</th>
                    <th>conf</th>
                  </tr>
                </thead>
                <tbody>
                  {facts.map((f) => {
                    const isNew = lastDelta?.added.includes(f.id);
                    const justInvalidated = lastDelta?.invalidated.includes(f.id);
                    const stale = !!f.invalidated_at;
                    return (
                      <tr
                        key={f.id}
                        className={[
                          stale ? 'stale' : 'current',
                          isNew ? 'flash-in' : '',
                          justInvalidated ? 'flash-out' : '',
                        ].join(' ')}
                      >
                        <td className="id">{f.id}</td>
                        <td>{f.subject}</td>
                        <td>{f.attribute}</td>
                        <td><span className="v">{f.value}</span></td>
                        <td>
                          {f.invalidated_at ? (
                            <span className="arrow">{f.invalidated_at}</span>
                          ) : (
                            <span className="dim">NULL</span>
                          )}
                        </td>
                        <td>{f.replaced_by ? <span className="arrow">→ {f.replaced_by}</span> : <span className="dim">NULL</span>}</td>
                        <td className="dim">{f.confidence.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="tryit-foot mono">
        <span className="dim">running locally · </span>
        <code>in-browser extractor</code>
        <span className="dim"> using the </span>
        <code>continuum.extraction.fact_extractor</code>
        <span className="dim"> shape · invalidation is set client-side here, by the same rule the </span>
        <code>Promoter</code>
        <span className="dim"> applies in production.</span>
      </div>
    </div>
  );
}

window.TryIt = TryIt;
