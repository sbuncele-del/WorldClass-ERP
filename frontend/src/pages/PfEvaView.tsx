/**
 * ProjectFlow PM Engine — Earned Value & Change Control (Phase 4)
 *
 * Internal preview, not linked from the main nav yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface EvaSnapshot {
  statusDate: string;
  bcws: number; bcwp: number; acwp: number;
  cv: number; sv: number;
  cpi: number | null; spi: number | null;
  cvWithinThreshold: boolean; svWithinThreshold: boolean;
  healthQuadrant: 'ahead_under' | 'behind_under' | 'ahead_over' | 'behind_over';
}

interface CurvePoint { date: string; bcws: number; bcwp: number; acwp: number; }

interface Activity { id: string; name: string; }

interface ChangeRequest {
  id: string;
  change_number: number;
  source: string;
  description: string;
  schedule_impact_days: string;
  budget_impact: string;
  status: string;
}

const QUADRANT_LABEL: Record<EvaSnapshot['healthQuadrant'], string> = {
  ahead_under: 'Ahead & under budget',
  behind_under: 'Behind but under budget',
  ahead_over: 'Ahead but overspent',
  behind_over: 'Behind & overspent',
};
const QUADRANT_COLOR: Record<EvaSnapshot['healthQuadrant'], string> = {
  ahead_under: '#2c6e49',
  behind_under: '#b57a16',
  ahead_over: '#b57a16',
  behind_over: '#a23b27',
};

const PfEvaView = () => {
  const { projectId } = useParams();
  const [snapshot, setSnapshot] = useState<EvaSnapshot | null>(null);
  const [curve, setCurve] = useState<CurvePoint[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [progressActivityId, setProgressActivityId] = useState('');
  const [percentComplete, setPercentComplete] = useState('');
  const [actualCost, setActualCost] = useState('');

  const [changeSource, setChangeSource] = useState('scope');
  const [changeDescription, setChangeDescription] = useState('');
  const [changeScheduleImpact, setChangeScheduleImpact] = useState('');
  const [changeBudgetImpact, setChangeBudgetImpact] = useState('');
  const [changeActivityId, setChangeActivityId] = useState('');

  const load = useCallback(() => {
    if (!projectId) return;
    setError(null);
    Promise.all([
      apiFetch(`/api/projects/engine/${projectId}/eva`),
      apiFetch(`/api/projects/engine/${projectId}/eva/curve`),
      apiFetch(`/api/projects/engine/${projectId}/schedule`),
      apiFetch(`/api/projects/engine/${projectId}/changes`),
    ])
      .then(([snapRes, curveRes, scheduleRes, changesRes]) => {
        setSnapshot(snapRes.data);
        setCurve(curveRes.data);
        setActivities(scheduleRes.data.activities.map((a: any) => ({ id: a.id, name: a.name })));
        setChanges(changesRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const recordProgress = async () => {
    if (!progressActivityId || percentComplete === '' || actualCost === '') return;
    await apiFetch(`/api/projects/engine/${projectId}/activities/${progressActivityId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentComplete: parseFloat(percentComplete), actualCost: parseFloat(actualCost) }),
    });
    setPercentComplete('');
    setActualCost('');
    load();
  };

  const logChange = async () => {
    if (!changeDescription.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: changeSource,
        description: changeDescription.trim(),
        scheduleImpactDays: parseFloat(changeScheduleImpact) || 0,
        budgetImpact: parseFloat(changeBudgetImpact) || 0,
        affectedActivityId: changeActivityId || null,
      }),
    });
    setChangeDescription('');
    setChangeScheduleImpact('');
    setChangeBudgetImpact('');
    load();
  };

  const decide = async (changeId: string, approve: boolean) => {
    await apiFetch(`/api/projects/engine/${projectId}/changes/${changeId}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve }),
    });
    load();
  };

  const implement = async (changeId: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/changes/${changeId}/implement`, { method: 'POST' });
    load();
  };

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;
  if (loading) return <div style={{ padding: 48 }}>Loading…</div>;

  const maxCurve = curve.length ? Math.max(...curve.flatMap((p) => [p.bcws, p.bcwp, p.acwp])) : 0;
  const toPoints = (key: 'bcws' | 'bcwp' | 'acwp') =>
    curve.map((p, i) => `${(i / Math.max(curve.length - 1, 1)) * 600},${160 - (p[key] / (maxCurve || 1)) * 150}`).join(' ');

  return (
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', maxWidth: 1000 }}>
      <p><Link to={`/app/projects/engine-preview/${projectId}`}>← back to engine preview</Link></p>
      <h1>Earned Value &amp; Change Control</h1>
      <p style={{ color: '#4b5457' }}>Internal scaffold. Not part of the live Projects experience yet.</p>

      {error && (
        <div style={{ background: '#f3ebda', border: '1px solid #d8dedf', borderRadius: 8, padding: 16, color: '#a5721a' }}>
          {error}
        </div>
      )}

      {snapshot && (
        <>
          <section style={{ margin: '24px 0' }}>
            <h3>Status as of {snapshot.statusDate}</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Tile label="BCWS" value={`R${snapshot.bcws.toFixed(0)}`} />
              <Tile label="BCWP (Earned Value)" value={`R${snapshot.bcwp.toFixed(0)}`} />
              <Tile label="ACWP" value={`R${snapshot.acwp.toFixed(0)}`} />
              <Tile label="Cost Variance (CV)" value={`R${snapshot.cv.toFixed(0)}`} flag={!snapshot.cvWithinThreshold} />
              <Tile label="Schedule Variance (SV)" value={`R${snapshot.sv.toFixed(0)}`} flag={!snapshot.svWithinThreshold} />
              <Tile label="CPI" value={snapshot.cpi != null ? snapshot.cpi.toFixed(2) : '—'} />
              <Tile label="SPI" value={snapshot.spi != null ? snapshot.spi.toFixed(2) : '—'} />
            </div>
            <div style={{ marginTop: 12, padding: '8px 16px', display: 'inline-block', borderRadius: 6, background: QUADRANT_COLOR[snapshot.healthQuadrant], color: '#fff', fontSize: 14 }}>
              {QUADRANT_LABEL[snapshot.healthQuadrant]}
            </div>
          </section>

          {curve.length > 0 && (
            <section style={{ margin: '24px 0', border: '1px solid #d8dedf', borderRadius: 8, padding: 16 }}>
              <h3>S-curve</h3>
              <svg width="100%" height={180} viewBox="0 0 600 180" preserveAspectRatio="none">
                <polyline fill="none" stroke="#9fb0ae" strokeWidth={2} points={toPoints('bcws')} />
                <polyline fill="none" stroke="#0c5f53" strokeWidth={2} points={toPoints('bcwp')} />
                <polyline fill="none" stroke="#a23b27" strokeWidth={2} strokeDasharray="5 3" points={toPoints('acwp')} />
              </svg>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#4b5457' }}>
                <span><i style={swatch('#9fb0ae')} /> BCWS (planned)</span>
                <span><i style={swatch('#0c5f53')} /> BCWP (earned)</span>
                <span><i style={swatch('#a23b27')} /> ACWP (actual)</span>
              </div>
            </section>
          )}
        </>
      )}

      <section style={{ margin: '24px 0' }}>
        <h3>Record progress</h3>
        <div style={row}>
          <select value={progressActivityId} onChange={(e) => setProgressActivityId(e.target.value)} style={{ padding: 4 }}>
            <option value="">Activity…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input value={percentComplete} onChange={(e) => setPercentComplete(e.target.value)} placeholder="% complete" style={{ width: 100, padding: 6 }} />
          <input value={actualCost} onChange={(e) => setActualCost(e.target.value)} placeholder="Actual cost (R)" style={{ width: 140, padding: 6 }} />
          <button style={btn} onClick={recordProgress}>Record</button>
        </div>
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Change control</h3>
        <p style={{ fontSize: 13, color: '#737c7e' }}>1 Log → 2 Screen → 3 Approve → 4-6 Update plan / distribute / track (one step, on implement)</p>

        {changes.map((c) => (
          <div key={c.id} style={{ ...row, borderBottom: '1px solid #e6eaeb', padding: '8px 0' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#0c5f53' }}>CR-{c.change_number}</span>
            <span style={{ flex: 1 }}>
              [{c.source}] {c.description}
              {parseFloat(c.schedule_impact_days) !== 0 && <em> · {c.schedule_impact_days}d</em>}
              {parseFloat(c.budget_impact) !== 0 && <em> · R{c.budget_impact}</em>}
            </span>
            <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#4b5457' }}>{c.status}</span>
            {c.status === 'logged' && (
              <>
                <button style={btn} onClick={() => decide(c.id, true)}>Approve</button>
                <button style={{ ...btn, color: '#a23b27' }} onClick={() => decide(c.id, false)}>Reject</button>
              </>
            )}
            {c.status === 'approved' && <button style={btn} onClick={() => implement(c.id)}>Implement</button>}
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          <div style={row}>
            <select value={changeSource} onChange={(e) => setChangeSource(e.target.value)} style={{ padding: 4 }}>
              <option value="scope">Scope</option>
              <option value="schedule">Schedule</option>
              <option value="budget">Budget</option>
            </select>
            <input value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} placeholder="Description" style={{ flex: 1, padding: 6 }} />
          </div>
          <div style={{ ...row, marginTop: 8 }}>
            <select value={changeActivityId} onChange={(e) => setChangeActivityId(e.target.value)} style={{ padding: 4 }}>
              <option value="">Affected activity (optional)…</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input value={changeScheduleImpact} onChange={(e) => setChangeScheduleImpact(e.target.value)} placeholder="Schedule impact (days)" style={{ width: 180, padding: 6 }} />
            <input value={changeBudgetImpact} onChange={(e) => setChangeBudgetImpact(e.target.value)} placeholder="Budget impact (R)" style={{ width: 160, padding: 6 }} />
            <button style={btn} onClick={logChange}>Log change</button>
          </div>
        </div>
      </section>
    </div>
  );
};

const Tile = ({ label, value, flag }: { label: string; value: string; flag?: boolean }) => (
  <div style={{ border: `1px solid ${flag ? '#a23b27' : '#d8dedf'}`, borderRadius: 8, padding: '10px 16px', minWidth: 120 }}>
    <div style={{ fontSize: 11, color: '#737c7e', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 18, color: flag ? '#a23b27' : '#15191c' }}>{value}</div>
  </div>
);

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const btn: React.CSSProperties = { fontSize: 12, padding: '4px 10px', cursor: 'pointer' };
const swatch = (color: string): React.CSSProperties => ({ display: 'inline-block', width: 20, height: 3, background: color, marginRight: 4, verticalAlign: 'middle' });

export default PfEvaView;
