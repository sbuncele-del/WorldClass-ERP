/**
 * FlowSpace — Earned Value & Change Control
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
const QUADRANT_STYLE: Record<EvaSnapshot['healthQuadrant'], { bg: string; fg: string }> = {
  ahead_under: { bg: '#EEF6F3', fg: '#1B5E52' },
  behind_under: { bg: '#FBF3E4', fg: '#8A6416' },
  ahead_over: { bg: '#FBF3E4', fg: '#8A6416' },
  behind_over: { bg: '#FBECEB', fg: '#7A4A45' },
};
const CHANGE_STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  logged: { bg: '#FBF3E4', fg: '#8A6416' },
  approved: { bg: '#EEF6F3', fg: '#1B5E52' },
  rejected: { bg: '#FBECEB', fg: '#7A4A45' },
  implemented: { bg: '#EEF3EE', fg: '#3A6B4F' },
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
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 28 }}>

      {error && (
        <div style={{ background: '#FBF3E4', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: 16, color: '#8A6416' }}>
          {error}
        </div>
      )}

      {snapshot && (
        <>
          <section>
            <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Status as of {new Date(snapshot.statusDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Tile label="BCWS" value={`R${snapshot.bcws.toFixed(0)}`} />
              <Tile label="BCWP (Earned Value)" value={`R${snapshot.bcwp.toFixed(0)}`} />
              <Tile label="ACWP" value={`R${snapshot.acwp.toFixed(0)}`} />
              <Tile label="Cost Variance" value={`R${snapshot.cv.toFixed(0)}`} flag={!snapshot.cvWithinThreshold} />
              <Tile label="Schedule Variance" value={`R${snapshot.sv.toFixed(0)}`} flag={!snapshot.svWithinThreshold} />
              <Tile label="CPI" value={snapshot.cpi != null ? snapshot.cpi.toFixed(2) : '—'} />
              <Tile label="SPI" value={snapshot.spi != null ? snapshot.spi.toFixed(2) : '—'} />
            </div>
            <div style={{
              marginTop: 12, padding: '6px 14px', display: 'inline-block', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: QUADRANT_STYLE[snapshot.healthQuadrant].bg, color: QUADRANT_STYLE[snapshot.healthQuadrant].fg,
            }}>
              {QUADRANT_LABEL[snapshot.healthQuadrant]}
            </div>
          </section>

          {curve.length > 0 && (
            <section>
              <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>S-curve</p>
              <div className="fs-card" style={{ padding: 20 }}>
                <svg width="100%" height={180} viewBox="0 0 600 180" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#BCD9D2" strokeWidth={2} points={toPoints('bcws')} />
                  <polyline fill="none" stroke="#1B5E52" strokeWidth={2} points={toPoints('bcwp')} />
                  <polyline fill="none" stroke="#B04A43" strokeWidth={2} strokeDasharray="5 3" points={toPoints('acwp')} />
                </svg>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--fs-slate)', marginTop: 10 }}>
                  <span><i style={swatch('#BCD9D2')} /> BCWS (planned)</span>
                  <span><i style={swatch('#1B5E52')} /> BCWP (earned)</span>
                  <span><i style={swatch('#B04A43')} /> ACWP (actual)</span>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Record progress</p>
        <div className="fs-card" style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="fs-input" value={progressActivityId} onChange={(e) => setProgressActivityId(e.target.value)}>
            <option value="">Activity…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input className="fs-input" value={percentComplete} onChange={(e) => setPercentComplete(e.target.value)} placeholder="% complete" style={{ width: 110 }} />
          <input className="fs-input" value={actualCost} onChange={(e) => setActualCost(e.target.value)} placeholder="Actual cost (R)" style={{ width: 150 }} />
          <button className="fs-btn fs-btn-primary" onClick={recordProgress}>Record</button>
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 4 }}>Change control</p>
        <p style={{ fontSize: 12, color: 'var(--fs-slate)', marginTop: 0, marginBottom: 10 }}>Log → Screen → Approve → Update plan / distribute / track (one step, on implement)</p>

        <div className="fs-card" style={{ overflow: 'hidden', marginBottom: 12 }}>
          {changes.length === 0 && <p style={{ color: 'var(--fs-slate)', fontSize: 13, padding: '18px 14px', margin: 0 }}>No change requests yet.</p>}
          {changes.map((c) => {
            const s = CHANGE_STATUS_STYLE[c.status] || CHANGE_STATUS_STYLE.logged;
            return (
              <div key={c.id} className="fs-listrow">
                <span style={{ fontFamily: 'var(--fs-font-mono)', fontSize: 12, color: 'var(--fs-teal)' }}>CR-{c.change_number}</span>
                <span style={{ flex: 1, fontSize: 14 }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--fs-slate)', fontSize: 12 }}>[{c.source}]</span> {c.description}
                  {parseFloat(c.schedule_impact_days) !== 0 && <em style={{ color: 'var(--fs-slate)' }}> · {c.schedule_impact_days}d</em>}
                  {parseFloat(c.budget_impact) !== 0 && <em style={{ color: 'var(--fs-slate)' }}> · R{c.budget_impact}</em>}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.fg }}>{c.status}</span>
                {c.status === 'logged' && (
                  <>
                    <button className="fs-btn fs-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => decide(c.id, true)}>Approve</button>
                    <button className="fs-btn fs-btn-secondary" style={{ padding: '4px 10px', fontSize: 12, color: '#B04A43' }} onClick={() => decide(c.id, false)}>Reject</button>
                  </>
                )}
                {c.status === 'approved' && <button className="fs-btn fs-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => implement(c.id)}>Implement</button>}
              </div>
            );
          })}
        </div>

        <div className="fs-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="fs-input" value={changeSource} onChange={(e) => setChangeSource(e.target.value)}>
              <option value="scope">Scope</option>
              <option value="schedule">Schedule</option>
              <option value="budget">Budget</option>
            </select>
            <input className="fs-input" value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} placeholder="Description" style={{ flex: 1, minWidth: 200 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <select className="fs-input" value={changeActivityId} onChange={(e) => setChangeActivityId(e.target.value)}>
              <option value="">Affected activity (optional)…</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input className="fs-input" value={changeScheduleImpact} onChange={(e) => setChangeScheduleImpact(e.target.value)} placeholder="Schedule impact (days)" style={{ width: 190 }} />
            <input className="fs-input" value={changeBudgetImpact} onChange={(e) => setChangeBudgetImpact(e.target.value)} placeholder="Budget impact (R)" style={{ width: 170 }} />
            <button className="fs-btn fs-btn-primary" onClick={logChange}>Log change</button>
          </div>
        </div>
      </section>
    </div>
  );
};

const Tile = ({ label, value, flag }: { label: string; value: string; flag?: boolean }) => (
  <div className="fs-card" style={{ padding: '10px 16px', minWidth: 120, borderColor: flag ? '#B04A43' : undefined }}>
    <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 18, fontFamily: 'var(--fs-font-mono)', color: flag ? '#B04A43' : 'var(--fs-ink)' }}>{value}</div>
  </div>
);

const swatch = (color: string): React.CSSProperties => ({ display: 'inline-block', width: 20, height: 3, background: color, marginRight: 4, verticalAlign: 'middle' });

export default PfEvaView;
