/**
 * FlowSpace PM Engine — Schedule view: Gantt + Network (Phase 2)
 *
 * Internal preview, not linked from the main nav yet. Same dataset,
 * two lenses — exactly the "toggle is a view preference, never a data fork"
 * principle from the architecture brief.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface ScheduledActivity {
  id: string;
  name: string;
  duration_days: string;
  early_start: string | null;
  early_finish: string | null;
  late_start: string | null;
  late_finish: string | null;
  total_float: string | null;
  is_critical: boolean;
}

interface Dependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
}

const dayOffset = (dateStr: string | null, baseTime: number): number =>
  dateStr ? Math.round((new Date(dateStr).getTime() - baseTime) / (1000 * 60 * 60 * 24)) : 0;

const PfScheduleView = () => {
  const { projectId } = useParams();
  const [activities, setActivities] = useState<ScheduledActivity[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [projectDurationDays, setProjectDurationDays] = useState(0);
  const [view, setView] = useState<'gantt' | 'network'>('gantt');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');

  const load = useCallback(() => {
    if (!projectId) return;
    apiFetch(`/api/projects/engine/${projectId}/schedule`)
      .then((res) => {
        setActivities(res.data.activities);
        setDependencies(res.data.dependencies);
        setProjectDurationDays(res.data.projectDurationDays);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const editDuration = async (activity: ScheduledActivity) => {
    const value = window.prompt(`Duration for "${activity.name}" (days):`, activity.duration_days);
    if (value == null) return;
    const durationDays = parseFloat(value);
    if (Number.isNaN(durationDays) || durationDays <= 0) return;
    await apiFetch(`/api/projects/engine/${projectId}/activities/${activity.id}/duration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationDays }),
    });
    load();
  };

  const addDependency = async () => {
    if (!predecessorId || !successorId || predecessorId === successorId) return;
    try {
      await apiFetch(`/api/projects/engine/${projectId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predecessorId, successorId }),
      });
      setPredecessorId('');
      setSuccessorId('');
      load();
    } catch (err: any) {
      window.alert(err.message);
    }
  };

  const removeDependency = async (dependencyId: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/dependencies/${dependencyId}`, { method: 'DELETE' });
    load();
  };

  const baseTime = useMemo(() => {
    const starts = activities.map((a) => (a.early_start ? new Date(a.early_start).getTime() : null)).filter((t): t is number => t !== null);
    return starts.length > 0 ? Math.min(...starts) : Date.now();
  }, [activities]);

  const nameOf = (id: string) => activities.find((a) => a.id === id)?.name || id;

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;
  if (loading) return <div style={{ padding: 48 }}>Loading schedule…</div>;
  if (error) return <div style={{ padding: 48, color: 'crimson' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: 1000 }}>
      <p style={{ color: '#4b5457' }}>
        Project duration: <strong>{projectDurationDays} days</strong>.
        Critical path in teal — click a bar/node to edit duration.
      </p>

      {activities.length === 0 && <p>No activities yet — add some in the <Link to={`/app/projects/engine-preview/${projectId}/wbs`}>WBS builder</Link> first.</p>}

      {activities.length > 0 && (
        <>
          <div style={{ margin: '16px 0' }}>
            <button style={tab(view === 'gantt')} onClick={() => setView('gantt')}>Gantt</button>
            <button style={tab(view === 'network')} onClick={() => setView('network')}>Network</button>
          </div>

          {view === 'gantt' ? (
            <div style={{ marginBottom: 32 }}>
              {activities.map((a) => {
                const es = dayOffset(a.early_start, baseTime);
                const ef = dayOffset(a.early_finish, baseTime);
                const lf = dayOffset(a.late_finish, baseTime);
                const scale = 24; // px per day
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 180, fontSize: 13, paddingRight: 8, textAlign: 'right' }}>{a.name}</div>
                    <div style={{ position: 'relative', height: 22, flex: 1 }}>
                      <div
                        onClick={() => editDuration(a)}
                        title={`ES ${es} EF ${ef} float ${a.total_float}`}
                        style={{
                          position: 'absolute',
                          left: es * scale,
                          width: Math.max((ef - es) * scale, 4),
                          height: 18,
                          background: a.is_critical ? '#0c5f53' : '#9fb0ae',
                          borderRadius: 3,
                          cursor: 'pointer',
                        }}
                      />
                      {lf > ef && (
                        <div
                          title={`float ${a.total_float}`}
                          style={{
                            position: 'absolute',
                            left: ef * scale,
                            width: (lf - ef) * scale,
                            height: 18,
                            background: 'repeating-linear-gradient(45deg, #e6eaeb, #e6eaeb 4px, #f3f5f6 4px, #f3f5f6 8px)',
                            borderRadius: 3,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <NetworkView activities={activities} dependencies={dependencies} baseTime={baseTime} onEdit={editDuration} />
          )}

          <section style={{ marginTop: 32 }}>
            <h3>Dependencies</h3>
            {dependencies.length === 0 && <p style={{ color: '#4b5457' }}>None yet.</p>}
            {dependencies.map((d) => (
              <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                <span>{nameOf(d.predecessor_id)} → {nameOf(d.successor_id)} (FS)</span>
                <button style={btn} onClick={() => removeDependency(d.id)}>×</button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <select value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)} style={{ padding: 4 }}>
                <option value="">Predecessor…</option>
                {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <span>must finish before</span>
              <select value={successorId} onChange={(e) => setSuccessorId(e.target.value)} style={{ padding: 4 }}>
                <option value="">Successor…</option>
                {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button style={btn} onClick={addDependency}>+ Add link</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const NetworkView = ({
  activities, dependencies, baseTime, onEdit,
}: {
  activities: ScheduledActivity[];
  dependencies: Dependency[];
  baseTime: number;
  onEdit: (a: ScheduledActivity) => void;
}) => {
  // Simple layered layout: layer = number of predecessor hops from a root.
  const predecessorsOf = new Map<string, string[]>();
  for (const d of dependencies) {
    if (!predecessorsOf.has(d.successor_id)) predecessorsOf.set(d.successor_id, []);
    predecessorsOf.get(d.successor_id)!.push(d.predecessor_id);
  }
  const layer = new Map<string, number>();
  const computeLayer = (id: string, guard = 0): number => {
    if (layer.has(id)) return layer.get(id)!;
    if (guard > activities.length) return 0; // cycle guard, shouldn't happen (server rejects cycles)
    const preds = predecessorsOf.get(id) || [];
    const l = preds.length === 0 ? 0 : Math.max(...preds.map((p) => computeLayer(p, guard + 1))) + 1;
    layer.set(id, l);
    return l;
  };
  for (const a of activities) computeLayer(a.id);

  const byLayer = new Map<number, ScheduledActivity[]>();
  for (const a of activities) {
    const l = layer.get(a.id) || 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(a);
  }

  const nodeW = 150, nodeH = 84, gapX = 60, gapY = 24;
  const positions = new Map<string, { x: number; y: number }>();
  let maxY = 0;
  for (const [l, nodes] of byLayer) {
    nodes.forEach((a, i) => {
      const x = l * (nodeW + gapX);
      const y = i * (nodeH + gapY);
      positions.set(a.id, { x, y });
      maxY = Math.max(maxY, y + nodeH);
    });
  }
  const maxX = (Math.max(0, ...Array.from(byLayer.keys())) + 1) * (nodeW + gapX);

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #d8dedf', borderRadius: 8, padding: 16 }}>
      <svg width={Math.max(maxX, 400)} height={Math.max(maxY + 40, 200)}>
        {dependencies.map((d) => {
          const from = positions.get(d.predecessor_id);
          const to = positions.get(d.successor_id);
          if (!from || !to) return null;
          const x1 = from.x + nodeW, y1 = from.y + nodeH / 2;
          const x2 = to.x, y2 = to.y + nodeH / 2;
          return <path key={d.id} d={`M${x1},${y1} C${x1 + 30},${y1} ${x2 - 30},${y2} ${x2},${y2}`} stroke="#9fb0ae" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" />;
        })}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#9fb0ae" />
          </marker>
        </defs>
        {activities.map((a) => {
          const pos = positions.get(a.id);
          if (!pos) return null;
          const es = dayOffset(a.early_start, baseTime);
          const ef = dayOffset(a.early_finish, baseTime);
          const ls = a.late_start ? dayOffset(a.late_start, baseTime) : es;
          const lf = a.late_finish ? dayOffset(a.late_finish, baseTime) : ef;
          return (
            <g key={a.id} transform={`translate(${pos.x},${pos.y})`} onClick={() => onEdit(a)} style={{ cursor: 'pointer' }}>
              <rect width={nodeW} height={nodeH} rx={8} fill="#fff" stroke={a.is_critical ? '#0c5f53' : '#d8dedf'} strokeWidth={a.is_critical ? 2 : 1.5} />
              <text x={10} y={16} fontSize={10} fill="#737c7e">ES {es}</text>
              <text x={nodeW - 10} y={16} fontSize={10} fill="#737c7e" textAnchor="end">EF {ef}</text>
              <text x={nodeW / 2} y={38} fontSize={13} fill="#15191c" textAnchor="middle">{a.name}</text>
              <text x={nodeW / 2} y={54} fontSize={10} fill={a.is_critical ? '#0c5f53' : '#a5721a'} textAnchor="middle">
                dur {a.duration_days}d · float {a.total_float ?? '-'}
              </text>
              <text x={10} y={nodeH - 8} fontSize={10} fill="#737c7e">LS {ls}</text>
              <text x={nodeW - 10} y={nodeH - 8} fontSize={10} fill="#737c7e" textAnchor="end">LF {lf}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const tab = (active: boolean): React.CSSProperties => ({
  padding: '6px 16px',
  marginRight: 8,
  cursor: 'pointer',
  background: active ? '#0c5f53' : '#f3f5f6',
  color: active ? '#fff' : '#15191c',
  border: '1px solid #d8dedf',
  borderRadius: 6,
});

const btn: React.CSSProperties = {
  fontSize: 12,
  padding: '2px 8px',
  cursor: 'pointer',
};

export default PfScheduleView;
