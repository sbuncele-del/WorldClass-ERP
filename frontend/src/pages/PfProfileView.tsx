/**
 * ProjectFlow PM Engine — Project Profiles (Phase 7)
 *
 * Config, not forks: applying a profile just relabels terminology, seeds
 * a starter WBS (only if the WBS is still empty), and records a couple of
 * defaults. Everything underneath still runs through the same WBS/CPM/EVA/
 * governance/closure engine built in Phases 1-6.
 *
 * Internal preview, not linked from the main nav yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', maxWidth: 1000 }}>
      <p><Link to={`/app/projects/engine-preview/${projectId}`}>← back to engine preview</Link></p>
      <h1>Project Profile</h1>
      <p style={{ color: '#4b5457' }}>Internal scaffold. Not part of the live Projects experience yet.</p>
      {error && <div style={{ background: '#f3ebda', border: '1px solid #d8dedf', borderRadius: 8, padding: 16, color: '#a5721a' }}>{error}</div>}
      {message && <div style={{ background: '#e4f0ec', border: '1px solid #d8dedf', borderRadius: 8, padding: 16, color: '#2c6e49', margin: '12px 0' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {profiles.map((p) => {
          const isCurrent = current?.id === p.id;
          return (
            <div key={p.id} style={{
              border: `1px solid ${isCurrent ? '#0c5f53' : '#d8dedf'}`, borderRadius: 8, padding: 16,
              background: isCurrent ? '#f3f8f7' : 'transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong>{p.name}</strong>
                {isCurrent && <span style={{ fontSize: 11, color: '#0c5f53', textTransform: 'uppercase' }}>Current</span>}
              </div>
              <p style={{ fontSize: 13, color: '#4b5457', minHeight: 54 }}>{p.description}</p>

              <div style={{ fontSize: 12, color: '#737c7e', marginBottom: 6 }}>Terminology sample</div>
              <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18, color: '#15191c' }}>
                <li>WBS element → <strong>{p.terminology.wbsElement}</strong></li>
                <li>Change request → <strong>{p.terminology.changeRequest}</strong></li>
                <li>Procurement item → <strong>{p.terminology.procurementItem}</strong></li>
              </ul>

              <div style={{ fontSize: 12, color: '#737c7e', margin: '8px 0 4px' }}>Starter WBS</div>
              <div style={{ fontSize: 12, color: '#15191c' }}>{p.starterWbs.join(' · ')}</div>

              {p.defaults.showCidbField && (
                <div style={{ fontSize: 11, color: '#0c5f53', marginTop: 6 }}>Surfaces CIDB grading field</div>
              )}

              <button
                disabled={isCurrent}
                onClick={() => apply(p.id)}
                style={{
                  marginTop: 12, fontSize: 12, padding: '6px 12px', cursor: isCurrent ? 'default' : 'pointer',
                  background: isCurrent ? '#e6eaeb' : '#0c5f53', color: isCurrent ? '#737c7e' : '#fff', border: 'none', borderRadius: 6,
                }}
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
