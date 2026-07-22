/**
 * FlowSpace — Project Profile
 *
 * Config, not forks: applying a profile just relabels terminology, seeds
 * a starter WBS (only if the WBS is still empty), and records a couple of
 * defaults. Everything underneath still runs through the same WBS/CPM/EVA/
 * governance/closure engine.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface Profile {
  id: string;
  name: string;
  description: string;
  terminology: Record<string, string>;
  starterWbs: string[];
  defaults: { productivityFactor: number; showCidbField: boolean };
}

const PfProfileView = () => {
  const { projectId } = useParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [current, setCurrent] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;
    setError(null);
    Promise.all([
      apiFetch(`/api/projects/engine/profiles`),
      apiFetch(`/api/projects/engine/${projectId}/profile`),
    ])
      .then(([p, c]) => { setProfiles(p.data); setCurrent(c.data); })
      .catch((err) => setError(err.message));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const apply = async (profileId: string) => {
    setMessage(null);
    const res = await apiFetch(`/api/projects/engine/${projectId}/profile`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId }),
    });
    setMessage(res.data.seeded ? 'Profile applied — starter WBS seeded (WBS was empty).' : 'Profile applied — WBS already had content, left untouched.');
    load();
  };

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;

  return (
    <div style={{ maxWidth: 1000 }}>
      {error && <div style={{ background: '#FBF3E4', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: 16, color: '#8A6416' }}>{error}</div>}
      {message && <div style={{ background: '#EEF6F3', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: 16, color: '#1B5E52', margin: '12px 0' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
        {profiles.map((p) => {
          const isCurrent = current?.id === p.id;
          return (
            <div key={p.id} className="fs-card" style={{
              padding: 18, borderColor: isCurrent ? 'var(--fs-teal)' : undefined,
              background: isCurrent ? 'var(--fs-teal-wash)' : '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong style={{ fontSize: 15, fontFamily: 'var(--fs-font-serif)' }}>{p.name}</strong>
                {isCurrent && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fs-teal)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Current</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--fs-slate)', minHeight: 54, lineHeight: 1.5 }}>{p.description}</p>

              <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 6 }}>Terminology sample</div>
              <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18, color: 'var(--fs-ink)', lineHeight: 1.7 }}>
                <li>WBS element → <strong>{p.terminology.wbsElement}</strong></li>
                <li>Change request → <strong>{p.terminology.changeRequest}</strong></li>
                <li>Procurement item → <strong>{p.terminology.procurementItem}</strong></li>
              </ul>

              <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '10px 0 4px' }}>Starter WBS</div>
              <div style={{ fontSize: 12, color: 'var(--fs-ink)' }}>{p.starterWbs.join(' · ')}</div>

              {p.defaults.showCidbField && (
                <div style={{ fontSize: 11, color: 'var(--fs-teal)', marginTop: 8 }}>Surfaces CIDB grading field</div>
              )}

              <button
                disabled={isCurrent}
                onClick={() => apply(p.id)}
                className={isCurrent ? 'fs-btn' : 'fs-btn fs-btn-primary'}
                style={{ marginTop: 14, padding: '7px 14px', fontSize: 13, ...(isCurrent ? { background: 'var(--fs-line)', color: 'var(--fs-slate)', cursor: 'default' } : {}) }}
              >
                {isCurrent ? 'Applied' : 'Apply profile'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PfProfileView;
