/**
 * FlowSpace — Resources, Cost & Baseline
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface Resource {
  id: string;
  name: string;
  cost_per_hour: string;
  productivity_factor: string;
}

interface Activity {
  id: string;
  name: string;
}

interface CostRow {
  activityId: string;
  cost: number;
  assignments: { id: string; resource_name: string; planned_hours: string }[];
}

interface BaselineData {
  id: string;
  version: number;
  total_cost: string;
  frozen_at: string;
  bcws: { date: string; dailyCost: number; cumulativeCost: number }[];
}

const PfResourcesView = () => {
  const { projectId } = useParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [costByActivity, setCostByActivity] = useState<CostRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceRate, setNewResourceRate] = useState('');
  const [assignActivityId, setAssignActivityId] = useState('');
  const [assignResourceId, setAssignResourceId] = useState('');
  const [assignHours, setAssignHours] = useState('');

  const [simActivityId, setSimActivityId] = useState('');
  const [simDuration, setSimDuration] = useState('');
  const [simResult, setSimResult] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;
    Promise.all([
      apiFetch('/api/projects/engine/resources'),
      apiFetch(`/api/projects/engine/${projectId}/schedule`),
      apiFetch(`/api/projects/engine/${projectId}/cost-summary`),
      apiFetch(`/api/projects/engine/${projectId}/baseline`),
    ])
      .then(([resRes, scheduleRes, costRes, baselineRes]) => {
        setResources(resRes.data);
        setActivities(scheduleRes.data.activities.map((a: any) => ({ id: a.id, name: a.name })));
        setCostByActivity(costRes.data.byActivity);
        setTotalCost(costRes.data.totalCost);
        setBaseline(baselineRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const createResource = async () => {
    if (!newResourceName.trim()) return;
    await apiFetch('/api/projects/engine/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newResourceName.trim(), costPerHour: parseFloat(newResourceRate) || 0 }),
    });
    setNewResourceName('');
    setNewResourceRate('');
    load();
  };

  const deleteResource = async (id: string) => {
    if (!window.confirm('Delete this resource?')) return;
    await apiFetch(`/api/projects/engine/resources/${id}`, { method: 'DELETE' });
    load();
  };

  const assign = async () => {
    if (!assignActivityId || !assignResourceId || !assignHours) return;
    await apiFetch(`/api/projects/engine/${projectId}/activities/${assignActivityId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: assignResourceId, plannedHours: parseFloat(assignHours) }),
    });
    setAssignHours('');
    load();
  };

  const unassign = async (assignmentId: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/assignments/${assignmentId}`, { method: 'DELETE' });
    load();
  };

  const freezeBaseline = async () => {
    try {
      await apiFetch(`/api/projects/engine/${projectId}/baseline`, { method: 'POST' });
      load();
    } catch (err: any) {
      window.alert(err.message);
    }
  };

  const runSimulation = async () => {
    if (!simActivityId || !simDuration) return;
    const res = await apiFetch(`/api/projects/engine/${projectId}/activities/${simActivityId}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypotheticalDurationDays: parseFloat(simDuration) }),
    });
    const { currentProjectDurationDays, simulatedProjectDurationDays, deltaDays } = res.data;
    setSimResult(
      `Current: ${currentProjectDurationDays}d → Simulated: ${simulatedProjectDurationDays}d ` +
      `(${deltaDays > 0 ? '+' : ''}${deltaDays}d)`
    );
  };

  const nameOf = (id: string) => activities.find((a) => a.id === id)?.name || id;

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;
  if (loading) return <div style={{ padding: 48 }}>Loading…</div>;
  if (error) return <div style={{ padding: 48, color: 'crimson' }}>Error: {error}</div>;

  const maxCumulative = baseline?.bcws.length ? Math.max(...baseline.bcws.map((p) => p.cumulativeCost)) : 0;

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 28 }}>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Resources</p>
        <div className="fs-card" style={{ overflow: 'hidden' }}>
          {resources.length === 0 && <p style={{ color: 'var(--fs-slate)', fontSize: 13, padding: '18px 14px', margin: 0 }}>No resources yet.</p>}
          {resources.map((r) => (
            <div key={r.id} className="fs-listrow">
              <span style={{ flex: 1, fontSize: 14 }}>{r.name}</span>
              <span style={{ color: 'var(--fs-slate)', fontSize: 12, fontFamily: 'var(--fs-font-mono)' }}>R{r.cost_per_hour}/hr · ×{r.productivity_factor}</span>
              <button className="fs-icon-btn" onClick={() => deleteResource(r.id)}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input className="fs-input" value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} placeholder="Name (e.g. Site crew)" style={{ flex: 1 }} />
          <input className="fs-input" value={newResourceRate} onChange={(e) => setNewResourceRate(e.target.value)} placeholder="R / hour" style={{ width: 110 }} />
          <button className="fs-btn fs-btn-primary" onClick={createResource}>+ Add</button>
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Assign resources to activities</p>
        <div className="fs-card" style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="fs-input" value={assignActivityId} onChange={(e) => setAssignActivityId(e.target.value)}>
            <option value="">Activity…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="fs-input" value={assignResourceId} onChange={(e) => setAssignResourceId(e.target.value)}>
            <option value="">Resource…</option>
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input className="fs-input" value={assignHours} onChange={(e) => setAssignHours(e.target.value)} placeholder="Planned hours" style={{ width: 130 }} />
          <button className="fs-btn fs-btn-primary" onClick={assign}>+ Assign</button>
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <p className="fs-page-eyebrow" style={{ margin: 0 }}>Cost roll-up</p>
          <span style={{ fontFamily: 'var(--fs-font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--fs-teal)' }}>R{totalCost.toFixed(2)}</span>
        </div>
        <div className="fs-card" style={{ overflow: 'hidden' }}>
          {costByActivity.filter((c) => c.assignments.length > 0).length === 0 && (
            <p style={{ color: 'var(--fs-slate)', fontSize: 13, padding: '18px 14px', margin: 0 }}>No costed activities yet.</p>
          )}
          {costByActivity.filter((c) => c.assignments.length > 0).map((c) => (
            <div key={c.activityId}>
              <div className="fs-listrow" style={{ fontWeight: 600 }}>
                <span style={{ flex: 1 }}>{nameOf(c.activityId)}</span>
                <span style={{ fontFamily: 'var(--fs-font-mono)' }}>R{c.cost.toFixed(2)}</span>
              </div>
              {c.assignments.map((a) => (
                <div key={a.id} className="fs-listrow" style={{ paddingLeft: 28, fontSize: 13, color: 'var(--fs-slate)', background: 'var(--fs-cream)' }}>
                  <span style={{ flex: 1 }}>{a.resource_name} — {a.planned_hours}h</span>
                  <button className="fs-icon-btn" onClick={() => unassign(a.id)}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Baseline</p>
        <div className="fs-card" style={{ padding: 20 }}>
          {baseline ? (
            <>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fs-slate)' }}>
                Version {baseline.version} · frozen {new Date(baseline.frozen_at).toLocaleString()} · total cost <strong style={{ color: 'var(--fs-ink)' }}>R{parseFloat(baseline.total_cost).toFixed(2)}</strong>
              </p>
              {baseline.bcws.length > 0 && (
                <>
                  <svg width="100%" height={140} viewBox={`0 0 ${baseline.bcws.length * 8} 140`} preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#1B5E52"
                      strokeWidth={2}
                      points={baseline.bcws.map((p, i) => `${i * 8},${140 - (p.cumulativeCost / (maxCumulative || 1)) * 130}`).join(' ')}
                    />
                  </svg>
                  <p style={{ fontSize: 12, color: 'var(--fs-slate)', margin: '8px 0 0' }}>BCWS — cumulative planned cost (R{maxCumulative.toFixed(0)} at completion)</p>
                </>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--fs-slate)', fontSize: 13, margin: '0 0 14px' }}>No baseline set yet.</p>
          )}
          <button className="fs-btn fs-btn-secondary" onClick={freezeBaseline}>Freeze new baseline</button>
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Time / cost trade-off (what-if)</p>
        <div className="fs-card" style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="fs-input" value={simActivityId} onChange={(e) => setSimActivityId(e.target.value)}>
            <option value="">Activity…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input className="fs-input" value={simDuration} onChange={(e) => setSimDuration(e.target.value)} placeholder="Hypothetical duration (days)" style={{ width: 210 }} />
          <button className="fs-btn fs-btn-primary" onClick={runSimulation}>Simulate</button>
        </div>
        {simResult && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--fs-ink)' }}>{simResult}</p>}
      </section>
    </div>
  );
};

export default PfResourcesView;
