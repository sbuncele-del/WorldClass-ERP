/**
 * FlowSpace PM Engine — internal preview shell (Phase 0)
 *
 * Not linked from any nav. Exists to prove the engine's routes/lifecycle
 * plumbing work end-to-end before Phase 1+ build real screens here.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const PHASE_LABEL: Record<string, string> = {
  define: 'Define', develop: 'Develop', plan: 'Plan', execute: 'Execute',
  monitor_control: 'Monitor & Control', close: 'Close',
};

const PfEnginePreview = () => {
  const { projectId } = useParams();
  const [phase, setPhase] = useState<string | null>(null);
  const [nextPhases, setNextPhases] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;
    setError(null);
    apiFetch(`/api/projects/engine/${projectId}/lifecycle`)
      .then((res) => { setPhase(res.data.phase); setNextPhases(res.data.nextPhases); })
      .catch((err) => setError(err.message));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const attemptTransition = async (toPhase: string) => {
    setGateMessage(null);
    try {
      await apiFetch(`/api/projects/engine/${projectId}/lifecycle/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toPhase }),
      });
      load();
    } catch (err: any) {
      // Gate rejections (409) and validation errors both surface here -
      // this is the one place a user can actually see "why can't I close?".
      setGateMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif' }}>
      {projectId && <p><Link to="/app/projects/list">← back to projects</Link></p>}
      <h1>FlowSpace PM Engine — Preview</h1>
      <p>Internal scaffold. Not part of the live Projects experience yet.</p>
      {!projectId && <p>Pass a project id: <code>/app/projects/engine-preview/:projectId</code></p>}
      {projectId && !phase && !error && <p>Loading lifecycle phase…</p>}
      {phase && <p>Lifecycle phase: <strong>{PHASE_LABEL[phase] || phase}</strong></p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {projectId && phase && (
        <div style={{ margin: '16px 0' }}>
          <div style={{ fontSize: 13, color: '#737c7e', marginBottom: 6 }}>Transition to:</div>
          {nextPhases.length === 0 && <span style={{ fontSize: 13, color: '#737c7e' }}>No further transitions from this phase.</span>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {nextPhases.map((p) => (
              <button key={p} onClick={() => attemptTransition(p)} style={{ fontSize: 13, padding: '6px 12px', cursor: 'pointer' }}>
                {PHASE_LABEL[p] || p}
              </button>
            ))}
          </div>
          {gateMessage && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f3ebda', border: '1px solid #d8dedf', borderRadius: 6, color: '#a5721a', fontSize: 13, maxWidth: 500 }}>
              {gateMessage}
            </div>
          )}
        </div>
      )}

      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/wbs`}>Open WBS builder →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/schedule`}>Open Schedule (Gantt/Network) →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/resources`}>Open Resources, Cost & Baseline →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/eva`}>Open Earned Value & Change Control →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/governance`}>Open Governance Registers →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/closure`}>Open Reviews & Closure →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/profile`}>Open Project Profile →</Link></p>}
    </div>
  );
};

export default PfEnginePreview;
