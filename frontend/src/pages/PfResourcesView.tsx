/**
 * ProjectFlow PM Engine — Resources, cost, and baseline (Phase 3)
 *
 * Internal preview, not linked from the main nav yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', maxWidth: 1000 }}>
      <p><Link to={`/app/projects/engine-preview/${projectId}`}>← back to engine preview</Link></p>
      <h1>Resources, Cost &amp; Baseline</h1>
      <p style={{ color: '#4b5457' }}>Internal scaffold. Not part of the live Projects experience yet.</p>

      <section style={{ margin: '24px 0' }}>
        <h3>Resources</h3>
        {resources.map((r) => (
          <div key={r.id} style={row}>
            <span style={{ flex: 1 }}>{r.name}</span>
            <span style={{ color: '#4b5457', fontSize: 13 }}>R{r.cost_per_hour}/hr · productivity {r.productivity_factor}</span>
            <button style={btn} onClick={() => deleteResource(r.id)}>×</button>
          </div>
        ))}
        <div style={{ ...row, marginTop: 8 }}>
          <input value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} placeholder="Name (e.g. Site crew)" style={{ flex: 1, padding: 6 }} />
          <input value={newResourceRate} onChange={(e) => setNewResourceRate(e.target.value)} placeholder="R/hour" style={{ width: 100, padding: 6 }} />
          <button style={btn} onClick={createResource}>+ Add resource</button>
        </div>
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Assign resources to activities</h3>
        <div style={{ ...row, marginTop: 8 }}>
          <select value={assignActivityId} onChange={(e) => setAssignActivityId(e.target.value)} style={{ padding: 4 }}>
            <option value="">Activity…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={assignResourceId} onChange={(e) => setAssignResourceId(e.target.value)} style={{ padding: 4 }}>
            <option value="">Resource…</option>
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input value={assignHours} onChange={(e) => setAssignHours(e.target.value)} placeholder="Planned hours" style={{ width: 120, padding: 6 }} />
          <button style={btn} onClick={assign}>+ Assign</button>
        </div>
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Cost roll-up — total: R{totalCost.toFixed(2)}</h3>
        {costByActivity.filter((c) => c.assignments.length > 0).map((c) => (
          <div key={c.activityId} style={{ marginBottom: 8 }}>
            <div style={row}>
              <strong style={{ flex: 1 }}>{nameOf(c.activityId)}</strong>
              <span>R{c.cost.toFixed(2)}</span>
            </div>
            {c.assignments.map((a) => (
              <div key={a.id} style={{ ...row, marginLeft: 20, fontSize: 13, color: '#4b5457' }}>
                <span style={{ flex: 1 }}>{a.resource_name} — {a.planned_hours}h</span>
                <button style={btn} onClick={() => unassign(a.id)}>×</button>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Baseline</h3>
        {baseline ? (
          <>
            <p>Version {baseline.version} · frozen {new Date(baseline.frozen_at).toLocaleString()} · total cost R{parseFloat(baseline.total_cost).toFixed(2)}</p>
            {baseline.bcws.length > 0 && (
              <div style={{ border: '1px solid #d8dedf', borderRadius: 8, padding: 16 }}>
                <svg width="100%" height={160} viewBox={`0 0 ${baseline.bcws.length * 8} 160`} preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#0c5f53"
                    strokeWidth={2}
                    points={baseline.bcws.map((p, i) => `${i * 8},${160 - (p.cumulativeCost / (maxCumulative || 1)) * 150}`).join(' ')}
                  />
                </svg>
                <p style={{ fontSize: 12, color: '#737c7e' }}>BCWS — cumulative planned cost (R{maxCumulative.toFixed(0)} at completion)</p>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: '#4b5457' }}>No baseline set yet.</p>
        )}
        <button style={btn} onClick={freezeBaseline}>Freeze new baseline</button>
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Time / cost trade-off (what-if)</h3>
        <div style={row}>
          <select value={simActivityId} onChange={(e) => setSimActivityId(e.target.value)} style={{ padding: 4 }}>
            <option value="">Activity…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input value={simDuration} onChange={(e) => setSimDuration(e.target.value)} placeholder="Hypothetical duration (days)" style={{ width: 200, padding: 6 }} />
          <button style={btn} onClick={runSimulation}>Simulate</button>
        </div>
        {simResult && <p style={{ marginTop: 8 }}>{simResult}</p>}
      </section>
    </div>
  );
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
};

const btn: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 10px',
  cursor: 'pointer',
};

export default PfResourcesView;
