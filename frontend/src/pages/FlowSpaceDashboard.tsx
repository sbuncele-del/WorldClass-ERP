/**
 * FlowSpace — portfolio Dashboard (top-level).
 *
 * The landing surface: a snapshot across every project (counts by status,
 * a status-breakdown bar, and the full list with per-project detail) so
 * the app opens onto something substantial instead of a single card.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/project.service';

interface ProjectRow {
  id: string;
  name: string;
  code?: string;
  status?: string;
  client_name?: string | null;
}

const STATUS_META: Record<string, { label: string; bar: string; bg: string; fg: string }> = {
  planning: { label: 'Planning', bar: '#B58A2E', bg: '#FBF3E4', fg: '#8A6416' },
  active: { label: 'Active', bar: '#1B5E52', bg: '#EEF6F3', fg: '#1B5E52' },
  in_progress: { label: 'Active', bar: '#1B5E52', bg: '#EEF6F3', fg: '#1B5E52' },
  on_hold: { label: 'On hold', bar: '#B58A2E', bg: '#FBF3E4', fg: '#8A6416' },
  completed: { label: 'Completed', bar: '#3A6B4F', bg: '#EEF3EE', fg: '#3A6B4F' },
  cancelled: { label: 'Cancelled', bar: '#B04A43', bg: '#FBECEB', fg: '#7A4A45' },
};

const meta = (s?: string) => STATUS_META[(s || 'planning').toLowerCase()] || STATUS_META.planning;
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const FlowSpaceDashboard = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    projectService.getProjects()
      .then((res: any) => setProjects(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const count = (keys: string[]) => projects.filter((p) => keys.includes((p.status || 'planning').toLowerCase())).length;
  const planning = count(['planning']);
  const active = count(['active', 'in_progress']);
  const onHold = count(['on_hold']);
  const completed = count(['completed']);
  const total = projects.length;

  // status breakdown for the bar
  const segments = [
    { label: 'Planning', value: planning, color: STATUS_META.planning.bar },
    { label: 'Active', value: active, color: STATUS_META.active.bar },
    { label: 'On hold', value: onHold, color: STATUS_META.on_hold.bar },
    { label: 'Completed', value: completed, color: STATUS_META.completed.bar },
  ].filter((s) => s.value > 0);

  return (
    <div style={{ maxWidth: 1160 }}>
      <p className="fs-page-eyebrow">Portfolio</p>
      <h1 className="fs-page-title">Dashboard</h1>
      <p className="fs-page-subtitle" style={{ marginBottom: 28 }}>An overview of everything in flight across your workspace.</p>

      {loading ? (
        <p style={{ color: 'var(--fs-slate)' }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <Stat label="Total projects" value={total} accent="#1B5E52" />
            <Stat label="In planning" value={planning} accent="#B58A2E" />
            <Stat label="Active" value={active} accent="#1B5E52" />
            <Stat label="Completed" value={completed} accent="#3A6B4F" />
          </div>

          {total > 0 && (
            <div className="fs-card" style={{ padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <p className="fs-page-eyebrow" style={{ margin: 0 }}>Status breakdown</p>
                <span style={{ fontSize: 12, color: 'var(--fs-slate)' }}>{total} project{total === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--fs-cream)' }}>
                {segments.map((s) => (
                  <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
                {segments.map((s) => (
                  <span key={s.label} style={{ fontSize: 12, color: 'var(--fs-slate)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i style={{ width: 9, height: 9, borderRadius: 2, background: s.color, display: 'inline-block' }} /> {s.label} · {s.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="fs-page-eyebrow" style={{ margin: 0 }}>All projects</p>
            <Link to="/app/projects/list" style={{ fontSize: 13, color: 'var(--fs-teal)', textDecoration: 'none' }}>Manage →</Link>
          </div>

          <div className="fs-card" style={{ overflow: 'hidden' }}>
            {projects.length === 0 && (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--fs-slate)' }}>
                <p style={{ fontFamily: 'var(--fs-font-serif)', fontSize: 18, color: 'var(--fs-ink)', margin: '0 0 6px' }}>Nothing here yet</p>
                <p style={{ margin: 0, fontSize: 14 }}>Create your first project from the panel on the left.</p>
              </div>
            )}
            {projects.map((p) => {
              const m = meta(p.status);
              return (
                <Link key={p.id} to={`/app/projects/engine-preview/${p.id}`} className="fs-listrow" style={{ textDecoration: 'none', color: 'var(--fs-ink)' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 7, background: 'var(--fs-teal-wash)', color: 'var(--fs-teal)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flex: 'none',
                  }}>{initials(p.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    {p.code && <div style={{ fontFamily: 'var(--fs-font-mono)', fontSize: 11, color: 'var(--fs-slate)' }}>{p.code}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', padding: '4px 10px', borderRadius: 20, background: m.bg, color: m.fg }}>{m.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className="fs-card" style={{ padding: '16px 22px', minWidth: 180, flex: '1 1 180px', maxWidth: 240, borderTop: `3px solid ${accent}` }}>
    <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: 'var(--fs-font-serif)', fontSize: 30, fontWeight: 600, color: 'var(--fs-ink)' }}>{value}</div>
  </div>
);

export default FlowSpaceDashboard;
