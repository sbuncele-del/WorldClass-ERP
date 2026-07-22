/**
 * Project Workspace — Overview tab.
 *
 * Lifecycle transition control lives here (not in the persistent header,
 * to keep that clean) - shows what phases are legally next and surfaces
 * gate rejection reasons inline (e.g. "needs a baseline first").
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const PHASE_LABEL: Record<string, string> = {
  define: 'Define', develop: 'Develop', plan: 'Plan', execute: 'Execute',
  monitor_control: 'Monitor & Control', close: 'Close',
};

const PfOverviewTab = () => {
  const { projectId } = useParams();
  const [nextPhases, setNextPhases] = useState<string[]>([]);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;
    setError(null);
    apiFetch(`/api/projects/engine/${projectId}/lifecycle`)
      .then((res) => setNextPhases(res.data.nextPhases))
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
      setGateMessage(err.message);
    }
  };

  if (error) return <p style={{ color: '#7A4A45' }}>{error}</p>;

  return (
    <div>
      <div className="fs-card" style={{ padding: 24 }}>
        <p className="fs-page-eyebrow" style={{ marginBottom: 12 }}>Lifecycle</p>
        {nextPhases.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--fs-slate)', margin: 0 }}>No further transitions from this phase.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {nextPhases.map((p) => (
              <button key={p} className="fs-btn fs-btn-secondary" onClick={() => attemptTransition(p)}>
                Move to {PHASE_LABEL[p] || p}
              </button>
            ))}
          </div>
        )}
        {gateMessage && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#FBF3E4', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', color: '#8A6416', fontSize: 13 }}>
            {gateMessage}
          </div>
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--fs-slate)', marginTop: 20 }}>
        Use the tabs above to build the scope, schedule, resources, and governance for this project.
      </p>
    </div>
  );
};

export default PfOverviewTab;
