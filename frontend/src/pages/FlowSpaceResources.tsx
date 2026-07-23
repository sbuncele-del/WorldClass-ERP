/**
 * FlowSpace — Team (top-level).
 *
 * The tenant-wide people/resource pool (rate + productivity factor), the
 * same resources that get assigned to activities inside a project. Lives
 * at the workspace level because a person/crew works across projects, not
 * inside one. Real CRUD, inline-add, no browser prompts.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

interface Resource {
  id: string;
  name: string;
  cost_per_hour: string;
  productivity_factor: string;
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const FlowSpaceResources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [productivity, setProductivity] = useState('1');

  const load = useCallback(() => {
    apiFetch('/api/projects/engine/resources')
      .then((res) => setResources(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    await apiFetch('/api/projects/engine/resources', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), costPerHour: parseFloat(rate) || 0, productivityFactor: parseFloat(productivity) || 1 }),
    });
    setName(''); setRate(''); setProductivity('1'); setAdding(false); load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this team member from the pool?')) return;
    await apiFetch(`/api/projects/engine/resources/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="fs-page-eyebrow">Workspace</p>
          <h1 className="fs-page-title">Team</h1>
          <p className="fs-page-subtitle" style={{ marginBottom: 0 }}>People and crews you assign to activities. Rates and productivity feed every project's cost roll-up.</p>
        </div>
        {!adding && <button className="fs-btn fs-btn-primary" onClick={() => setAdding(true)}>+ Add member</button>}
      </div>

      {error && <div style={{ background: '#FBECEB', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: '12px 16px', color: '#7A4A45', margin: '24px 0', fontSize: 14 }}>{error}</div>}

      {adding && (
        <div className="fs-card" style={{ padding: 16, margin: '24px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input autoFocus className="fs-input" style={{ flex: 1, minWidth: 180 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Site crew, Jane Doe)" onKeyDown={(e) => e.key === 'Enter' && create()} />
          <input className="fs-input" style={{ width: 120 }} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="R / hour" />
          <input className="fs-input" style={{ width: 130 }} value={productivity} onChange={(e) => setProductivity(e.target.value)} placeholder="Productivity ×" />
          <button className="fs-btn fs-btn-primary" onClick={create} disabled={!name.trim()}>Add</button>
          <button className="fs-btn fs-btn-secondary" onClick={() => { setAdding(false); setName(''); setRate(''); }}>Cancel</button>
        </div>
      )}

      <div style={{ marginTop: adding ? 8 : 28 }}>
        {loading && <p style={{ color: 'var(--fs-slate)' }}>Loading…</p>}
        {!loading && resources.length === 0 && (
          <div className="fs-card" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--fs-slate)' }}>
            <p style={{ fontFamily: 'var(--fs-font-serif)', fontSize: 18, color: 'var(--fs-ink)', margin: '0 0 6px' }}>No team members yet</p>
            <p style={{ margin: 0, fontSize: 14 }}>Add people or crews to assign them to project activities.</p>
          </div>
        )}
        {!loading && resources.length > 0 && (
          <div className="fs-card" style={{ overflow: 'hidden' }}>
            <div className="fs-listrow" style={{ background: 'var(--fs-cream)', fontSize: 11, fontWeight: 600, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <span style={{ width: 32 }} />
              <span style={{ flex: 1 }}>Name</span>
              <span style={{ width: 120, textAlign: 'right' }}>Rate</span>
              <span style={{ width: 120, textAlign: 'right' }}>Productivity</span>
              <span style={{ width: 40 }} />
            </div>
            {resources.map((r) => (
              <div key={r.id} className="fs-listrow">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--fs-teal-wash)', color: 'var(--fs-teal)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flex: 'none',
                }}>{initials(r.name)}</div>
                <span style={{ flex: 1, fontSize: 14 }}>{r.name}</span>
                <span style={{ width: 120, textAlign: 'right', fontFamily: 'var(--fs-font-mono)', fontSize: 13 }}>R{r.cost_per_hour}/hr</span>
                <span style={{ width: 120, textAlign: 'right', fontFamily: 'var(--fs-font-mono)', fontSize: 13, color: 'var(--fs-slate)' }}>×{r.productivity_factor}</span>
                <span style={{ width: 40, textAlign: 'right' }}><button className="fs-icon-btn" onClick={() => remove(r.id)}>✕</button></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowSpaceResources;
