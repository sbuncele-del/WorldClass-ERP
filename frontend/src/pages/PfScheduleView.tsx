/**
 * FlowSpace — Schedule (Gantt / Network)
 *
 * A real Gantt, not a static bar chart: date-scale header, dense
 * spreadsheet-style row grid, dependency connector lines, milestone
 * diamonds, and a draggable right-edge handle that resizes an
 * activity's duration live (drag feedback locally, committed to the
 * CPM engine on release - the whole network recomputes on the backend).
 *
 * One real constraint worth being explicit about: bars aren't
 * drag-to-move. In a true CPM engine, start/finish dates are DERIVED
 * from the dependency network + duration, not stored as independent
 * fields - so "drag the bar left" has nothing to write to. Resizing
 * duration is the correct interactive lever here; it already ripples
 * through the whole schedule on release.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const DAY_MS = 1000 * 60 * 60 * 24;
const ROW_H = 32;
const SCALE = 28; // px per day

const dayOffset = (dateStr: string | null, baseTime: number): number =>
  dateStr ? Math.round((new Date(dateStr).getTime() - baseTime) / DAY_MS) : 0;

const fmtDate = (dateStr: string | null) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—';

const PfScheduleView = () => {
  const { projectId } = useParams();
  const [activities, setActivities] = useState<ScheduledActivity[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [projectDurationDays, setProjectDurationDays] = useState(0);
  const [view, setView] = useState<'gantt' | 'network'>('gantt');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [dragPreview, setDragPreview] = useState<{ id: string; duration: number } | null>(null);

  const dragRef = useRef<{ id: string; startX: number; original: number; current: number } | null>(null);

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

  const commitDuration = async (activityId: string, durationDays: number) => {
    await apiFetch(`/api/projects/engine/${projectId}/activities/${activityId}/duration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationDays }),
    });
    load();
  };

  // ── Drag-to-resize (right handle) ────────────────────────────────────
  const onHandleMouseDown = (a: ScheduledActivity) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const original = parseFloat(a.duration_days);
    dragRef.current = { id: a.id, startX: e.clientX, original, current: original };
    setDragPreview({ id: a.id, duration: original });

    const onMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaDays = Math.round((moveEvent.clientX - dragRef.current.startX) / SCALE);
      const next = Math.max(1, dragRef.current.original + deltaDays);
      dragRef.current.current = next;
      setDragPreview({ id: dragRef.current.id, duration: next });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const finished = dragRef.current;
      dragRef.current = null;
      setDragPreview(null);
      if (finished && finished.current !== finished.original) {
        commitDuration(finished.id, finished.current);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
      setLinking(false);
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

  // Weekly date-axis ticks spanning the visible schedule.
  const weeks = useMemo(() => {
    const span = Math.max(projectDurationDays + 7, 14);
    const ticks: { offset: number; label: string }[] = [];
    for (let d = 0; d <= span; d += 7) {
      ticks.push({ offset: d, label: new Date(baseTime + d * DAY_MS).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) });
    }
    return ticks;
  }, [baseTime, projectDurationDays]);

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;
  if (loading) return <div style={{ padding: 48 }}>Loading schedule…</div>;
  if (error) return <div style={{ padding: 48, color: 'crimson' }}>Error: {error}</div>;

  return (
    <div>
      {activities.length === 0 ? (
        <div className="fs-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--fs-slate)' }}>
          No activities yet — add some in the <Link to={`/app/projects/engine-preview/${projectId}/wbs`} style={{ color: 'var(--fs-teal)' }}>WBS builder</Link> first.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 2, background: 'var(--fs-cream)', borderRadius: 8, padding: 3 }}>
              <button style={pillTab(view === 'gantt')} onClick={() => setView('gantt')}>Gantt</button>
              <button style={pillTab(view === 'network')} onClick={() => setView('network')}>Network</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fs-slate)' }}>
              Duration <strong style={{ color: 'var(--fs-ink)' }}>{projectDurationDays}d</strong> · Critical path in teal
            </div>
          </div>

          {view === 'gantt' ? (
            <div className="fs-card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex' }}>
                {/* ── Left grid ── */}
                <div style={{ flex: 'none', width: 340, borderRight: '1px solid var(--fs-line)' }}>
                  <div style={{ display: 'flex', height: 36, borderBottom: '1px solid var(--fs-line)', alignItems: 'center', background: 'var(--fs-cream)', fontSize: 11, fontWeight: 600, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    <div style={{ width: 32, textAlign: 'center' }}>#</div>
                    <div style={{ flex: 1 }}>Task</div>
                    <div style={{ width: 48, textAlign: 'center' }}>Days</div>
                    <div style={{ width: 76, textAlign: 'center' }}>Finish</div>
                  </div>
                  {activities.map((a, i) => {
                    const dur = dragPreview?.id === a.id ? dragPreview.duration : parseFloat(a.duration_days);
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', height: ROW_H, borderBottom: '1px solid var(--fs-line)', fontSize: 13 }}>
                        <div style={{ width: 32, textAlign: 'center', color: 'var(--fs-slate)', fontSize: 11, fontFamily: 'var(--fs-font-mono)' }}>{i + 1}</div>
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }} title={a.name}>{a.name}</div>
                        <div style={{ width: 48, textAlign: 'center', fontFamily: 'var(--fs-font-mono)', fontSize: 12, color: a.is_critical ? 'var(--fs-teal)' : 'var(--fs-ink)' }}>{dur}d</div>
                        <div style={{ width: 76, textAlign: 'center', fontSize: 11, color: 'var(--fs-slate)' }}>{fmtDate(a.early_finish)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Right timeline ── */}
                <div style={{ flex: 1, overflowX: 'auto' }}>
                  <svg width={Math.max((projectDurationDays + 10) * SCALE, 400)} height={36 + activities.length * ROW_H}>
                    {/* week gridlines + labels */}
                    {weeks.map((w) => (
                      <g key={w.offset}>
                        <line x1={w.offset * SCALE} y1={0} x2={w.offset * SCALE} y2={36 + activities.length * ROW_H} stroke="var(--fs-line, #e5e5e5)" strokeWidth={1} />
                        <text x={w.offset * SCALE + 4} y={14} fontSize={10} fill="#5B6470" fontFamily="Roboto Mono, monospace">{w.label}</text>
                      </g>
                    ))}
                    <line x1={0} y1={36} x2={Math.max((projectDurationDays + 10) * SCALE, 400)} y2={36} stroke="#D8DEDF" strokeWidth={1} />

                    {/* dependency connectors */}
                    <defs>
                      <marker id="ganttArrow" markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto">
                        <path d="M0,0 L6,2.5 L0,5 Z" fill="#5B998A" />
                      </marker>
                    </defs>
                    {dependencies.map((d) => {
                      const fromIdx = activities.findIndex((a) => a.id === d.predecessor_id);
                      const toIdx = activities.findIndex((a) => a.id === d.successor_id);
                      const from = activities[fromIdx];
                      const to = activities[toIdx];
                      if (!from || !to) return null;
                      const x1 = dayOffset(from.early_finish, baseTime) * SCALE;
                      const y1 = 36 + fromIdx * ROW_H + ROW_H / 2;
                      const x2 = dayOffset(to.early_start, baseTime) * SCALE;
                      const y2 = 36 + toIdx * ROW_H + ROW_H / 2;
                      const midX = x1 + 12;
                      return (
                        <path
                          key={d.id}
                          d={`M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`}
                          stroke="#5B998A" strokeWidth={1.5} fill="none" markerEnd="url(#ganttArrow)"
                        />
                      );
                    })}

                    {/* bars */}
                    {activities.map((a, i) => {
                      const es = dayOffset(a.early_start, baseTime);
                      const originalDur = parseFloat(a.duration_days);
                      const dur = dragPreview?.id === a.id ? dragPreview.duration : originalDur;
                      const ef = es + dur;
                      const lf = dayOffset(a.late_finish, baseTime);
                      const y = 36 + i * ROW_H + (ROW_H - 20) / 2;
                      const isMilestone = originalDur === 0;

                      if (isMilestone) {
                        const cx = es * SCALE;
                        const cy = y + 10;
                        return (
                          <g key={a.id} transform={`translate(${cx},${cy}) rotate(45)`}>
                            <rect x={-7} y={-7} width={14} height={14} fill="#123832" />
                          </g>
                        );
                      }

                      return (
                        <g key={a.id}>
                          {lf > ef && (
                            <rect x={ef * SCALE} y={y} width={(lf - ef) * SCALE} height={20} rx={3}
                              fill="#E6EAEB" fillOpacity={0.6} stroke="#D8DEDF" strokeDasharray="3 2" />
                          )}
                          <rect
                            x={es * SCALE} y={y} width={Math.max(dur * SCALE, 6)} height={20} rx={4}
                            fill={a.is_critical ? '#1B5E52' : '#8FB6AC'}
                          />
                          {/* resize handle */}
                          <rect
                            x={es * SCALE + Math.max(dur * SCALE, 6) - 5} y={y} width={10} height={20}
                            fill="transparent" style={{ cursor: 'ew-resize' }}
                            onMouseDown={onHandleMouseDown(a)}
                          />
                          <text x={es * SCALE + Math.max(dur * SCALE, 6) + 6} y={y + 14} fontSize={11} fill="#172033">
                            {a.name.length > 28 ? a.name.slice(0, 26) + '…' : a.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <NetworkView activities={activities} dependencies={dependencies} baseTime={baseTime} onEdit={(a) => {
              const value = window.prompt(`Duration for "${a.name}" (days):`, a.duration_days);
              if (value == null) return;
              const d = parseFloat(value);
              if (!Number.isNaN(d) && d > 0) commitDuration(a.id, d);
            }} />
          )}

          <section style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="fs-page-eyebrow" style={{ margin: 0 }}>Dependencies</p>
              {!linking && <button className="fs-btn fs-btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setLinking(true)}>+ Add link</button>}
            </div>

            {dependencies.length === 0 && !linking && <p style={{ color: 'var(--fs-slate)', fontSize: 13 }}>None yet.</p>}

            <div className="fs-card" style={{ overflow: 'hidden' }}>
              {dependencies.map((d) => (
                <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--fs-line)', fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{nameOf(d.predecessor_id)} → {nameOf(d.successor_id)} <span style={{ color: 'var(--fs-slate)', fontSize: 11 }}>FS</span></span>
                  <button style={{ ...btn, color: '#7A4A45' }} onClick={() => removeDependency(d.id)}>Remove</button>
                </div>
              ))}
              {dependencies.length === 0 && !linking && <div style={{ padding: 14 }} />}
            </div>

            {linking && (
              <div className="fs-card" style={{ padding: 14, marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="fs-input" value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)}>
                  <option value="">Predecessor…</option>
                  {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <span style={{ fontSize: 13, color: 'var(--fs-slate)' }}>must finish before</span>
                <select className="fs-input" value={successorId} onChange={(e) => setSuccessorId(e.target.value)}>
                  <option value="">Successor…</option>
                  {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <button className="fs-btn fs-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={addDependency}>Link</button>
                <button className="fs-btn fs-btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setLinking(false)}>Cancel</button>
              </div>
            )}
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
  const predecessorsOf = new Map<string, string[]>();
  for (const d of dependencies) {
    if (!predecessorsOf.has(d.successor_id)) predecessorsOf.set(d.successor_id, []);
    predecessorsOf.get(d.successor_id)!.push(d.predecessor_id);
  }
  const layer = new Map<string, number>();
  const computeLayer = (id: string, guard = 0): number => {
    if (layer.has(id)) return layer.get(id)!;
    if (guard > activities.length) return 0;
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

  const nodeW = 160, nodeH = 84, gapX = 60, gapY = 24;
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
    <div className="fs-card" style={{ overflowX: 'auto', padding: 16 }}>
      <svg width={Math.max(maxX, 400)} height={Math.max(maxY + 40, 200)}>
        {dependencies.map((d) => {
          const from = positions.get(d.predecessor_id);
          const to = positions.get(d.successor_id);
          if (!from || !to) return null;
          const x1 = from.x + nodeW, y1 = from.y + nodeH / 2;
          const x2 = to.x, y2 = to.y + nodeH / 2;
          return <path key={d.id} d={`M${x1},${y1} C${x1 + 30},${y1} ${x2 - 30},${y2} ${x2},${y2}`} stroke="#5B998A" strokeWidth={1.5} fill="none" markerEnd="url(#netArrow)" />;
        })}
        <defs>
          <marker id="netArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#5B998A" />
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
              <rect width={nodeW} height={nodeH} rx={8} fill="#fff" stroke={a.is_critical ? '#1B5E52' : '#D8DEDF'} strokeWidth={a.is_critical ? 2 : 1.5} />
              <text x={10} y={16} fontSize={10} fill="#5B6470" fontFamily="Roboto Mono, monospace">ES {es}</text>
              <text x={nodeW - 10} y={16} fontSize={10} fill="#5B6470" fontFamily="Roboto Mono, monospace" textAnchor="end">EF {ef}</text>
              <text x={nodeW / 2} y={40} fontSize={13} fill="#172033" fontFamily="Inter, sans-serif" textAnchor="middle">{a.name}</text>
              <text x={nodeW / 2} y={56} fontSize={10} fill={a.is_critical ? '#1B5E52' : '#8A6416'} textAnchor="middle">
                dur {a.duration_days}d · float {a.total_float ?? '-'}
              </text>
              <text x={10} y={nodeH - 8} fontSize={10} fill="#5B6470" fontFamily="Roboto Mono, monospace">LS {ls}</text>
              <text x={nodeW - 10} y={nodeH - 8} fontSize={10} fill="#5B6470" fontFamily="Roboto Mono, monospace" textAnchor="end">LF {lf}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const pillTab = (active: boolean): React.CSSProperties => ({
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  background: active ? '#1B5E52' : 'transparent',
  color: active ? '#fff' : '#5B6470',
  border: 'none',
  borderRadius: 6,
});

const btn: React.CSSProperties = {
  fontSize: 12,
  padding: '2px 8px',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
};

export default PfScheduleView;
