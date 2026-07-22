/**
 * FlowSpace — Governance Registers
 *
 * Risk register (5x5 matrix), stakeholder engagement matrix, comms plan,
 * RACI matrix, procurement with best-value scoring. Independent of the
 * scheduling/EVA engine - a project can have these registers with or
 * without a schedule underneath it.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

type Tab = 'risk' | 'stakeholders' | 'comms' | 'raci' | 'procurement';

interface Risk {
  id: string; risk_number: number; title: string; description: string | null; category: string | null;
  probability: number; impact: number; score: number;
  response_strategy: string | null; response_plan: string | null; owner: string | null; status: string;
}
interface Stakeholder {
  id: string; name: string; role: string | null; power: string; interest: string;
  engagement_current: string; engagement_desired: string; strategy: string | null;
}
interface CommsItem {
  id: string; stakeholder_id: string | null; audience: string; message: string;
  method: string | null; frequency: string | null; owner: string | null; next_due: string | null;
}
interface RaciEntry { id: string; task_label: string; person: string; role_code: 'R' | 'A' | 'C' | 'I'; }
interface RaciGrid { tasks: string[]; people: string[]; entries: RaciEntry[]; }
interface VendorOption { vendor: string; price: number; quality_score: number; delivery_score: number; best_value_score: number; }
interface ProcurementItem {
  id: string; item_name: string; description: string | null; procurement_type: string;
  estimated_value: string | null; vendor_options: VendorOption[]; selected_vendor: string | null; status: string;
}

const scoreStyle = (score: number) => (score >= 15 ? { bg: '#FBECEB', fg: '#7A4A45' } : score >= 8 ? { bg: '#FBF3E4', fg: '#8A6416' } : { bg: '#EEF6F3', fg: '#1B5E52' });

const TABS: Tab[] = ['risk', 'stakeholders', 'comms', 'raci', 'procurement'];
const TAB_LABEL: Record<Tab, string> = { risk: 'Risk', stakeholders: 'Stakeholders', comms: 'Comms', raci: 'RACI', procurement: 'Procurement' };

const PfGovernanceView = () => {
  const { projectId } = useParams();
  const [tab, setTab] = useState<Tab>('risk');
  const [error, setError] = useState<string | null>(null);

  const [risks, setRisks] = useState<Risk[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [comms, setComms] = useState<CommsItem[]>([]);
  const [raci, setRaci] = useState<RaciGrid>({ tasks: [], people: [], entries: [] });
  const [procurement, setProcurement] = useState<ProcurementItem[]>([]);

  const load = useCallback(() => {
    if (!projectId) return;
    setError(null);
    Promise.all([
      apiFetch(`/api/projects/engine/${projectId}/risks`),
      apiFetch(`/api/projects/engine/${projectId}/stakeholders`),
      apiFetch(`/api/projects/engine/${projectId}/comms`),
      apiFetch(`/api/projects/engine/${projectId}/raci`),
      apiFetch(`/api/projects/engine/${projectId}/procurement`),
    ])
      .then(([r, s, c, raciRes, p]) => {
        setRisks(r.data); setStakeholders(s.data); setComms(c.data); setRaci(raciRes.data); setProcurement(p.data);
      })
      .catch((err) => setError(err.message));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;

  return (
    <div style={{ maxWidth: 1100 }}>
      {error && <div style={{ background: '#FBF3E4', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: 16, color: '#8A6416', marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 2, background: 'var(--fs-cream)', borderRadius: 8, padding: 3, marginBottom: 24, width: 'fit-content' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, borderRadius: 6,
            background: tab === t ? '#1B5E52' : 'transparent', color: tab === t ? '#fff' : 'var(--fs-slate)',
          }}>{TAB_LABEL[t]}</button>
        ))}
      </div>

      {tab === 'risk' && <RiskTab projectId={projectId} risks={risks} reload={load} />}
      {tab === 'stakeholders' && <StakeholderTab projectId={projectId} stakeholders={stakeholders} reload={load} />}
      {tab === 'comms' && <CommsTab projectId={projectId} comms={comms} stakeholders={stakeholders} reload={load} />}
      {tab === 'raci' && <RaciTab projectId={projectId} grid={raci} reload={load} />}
      {tab === 'procurement' && <ProcurementTab projectId={projectId} items={procurement} reload={load} />}
    </div>
  );
};

// ── Risk register ──────────────────────────────────────────────────────

const RiskTab = ({ projectId, risks, reload }: { projectId: string; risks: Risk[]; reload: () => void }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [probability, setProbability] = useState('3');
  const [impact, setImpact] = useState('3');

  const create = async () => {
    if (!title.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/risks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), category: category || undefined, probability: Number(probability), impact: Number(impact) }),
    });
    setTitle(''); setCategory(''); reload();
  };

  const setField = async (riskId: string, field: string, value: any) => {
    await apiFetch(`/api/projects/engine/${projectId}/risks/${riskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }),
    });
    reload();
  };

  return (
    <section>
      <p style={{ fontSize: 12, color: 'var(--fs-slate)', marginBottom: 12 }}>Score = probability × impact (5×5 matrix, 1-25).</p>
      <div className="fs-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={th_row}>
            <th style={th}>#</th><th style={th}>Title</th><th style={th}>Category</th><th style={th}>P</th><th style={th}>I</th>
            <th style={th}>Score</th><th style={th}>Response</th><th style={th}>Owner</th><th style={th}>Status</th>
          </tr></thead>
          <tbody>
            {risks.map((r) => {
              const s = scoreStyle(r.score);
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--fs-line)' }}>
                  <td style={{ ...td, fontFamily: 'var(--fs-font-mono)', color: 'var(--fs-teal)' }}>R-{r.risk_number}</td>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{r.category || '—'}</td>
                  <td style={td}>{r.probability}</td>
                  <td style={td}>{r.impact}</td>
                  <td style={td}><span style={{ ...pill, background: s.bg, color: s.fg }}>{r.score}</span></td>
                  <td style={td}>
                    <select className="fs-input" style={selectSm} value={r.response_strategy || ''} onChange={(e) => setField(r.id, 'responseStrategy', e.target.value)}>
                      <option value="">—</option>
                      <option value="avoid">Avoid</option><option value="mitigate">Mitigate</option>
                      <option value="transfer">Transfer</option><option value="accept">Accept</option>
                    </select>
                  </td>
                  <td style={td}>{r.owner || '—'}</td>
                  <td style={td}>
                    <select className="fs-input" style={selectSm} value={r.status} onChange={(e) => setField(r.id, 'status', e.target.value)}>
                      <option value="open">Open</option><option value="mitigating">Mitigating</option><option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {risks.length === 0 && <tr><td colSpan={9} style={{ ...td, color: 'var(--fs-slate)', textAlign: 'center', padding: 20 }}>No risks logged yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ ...row, marginTop: 12 }}>
        <input className="fs-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Risk title" style={{ flex: 1 }} />
        <input className="fs-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" style={{ width: 140 }} />
        <select className="fs-input" value={probability} onChange={(e) => setProbability(e.target.value)}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>P{n}</option>)}
        </select>
        <select className="fs-input" value={impact} onChange={(e) => setImpact(e.target.value)}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>I{n}</option>)}
        </select>
        <button className="fs-btn fs-btn-primary" onClick={create}>Add risk</button>
      </div>
    </section>
  );
};

// ── Stakeholder engagement matrix ────────────────────────────────────

const ENGAGEMENT_LEVELS = ['unaware', 'resistant', 'neutral', 'supportive', 'leading'];

const StakeholderTab = ({ projectId, stakeholders, reload }: { projectId: string; stakeholders: Stakeholder[]; reload: () => void }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [power, setPower] = useState('medium');
  const [interest, setInterest] = useState('medium');

  const create = async () => {
    if (!name.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/stakeholders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), role: role || undefined, power, interest }),
    });
    setName(''); setRole(''); reload();
  };

  const setEngagement = async (id: string, field: 'engagementCurrent' | 'engagementDesired', value: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/stakeholders/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }),
    });
    reload();
  };

  return (
    <section>
      <p style={{ fontSize: 12, color: 'var(--fs-slate)', marginBottom: 12 }}>Power/interest drives who needs direct management vs monitoring; current → desired engagement is the gap to close.</p>
      <div className="fs-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={th_row}>
            <th style={th}>Name</th><th style={th}>Role</th><th style={th}>Power</th><th style={th}>Interest</th>
            <th style={th}>Current</th><th style={th}>Desired</th>
          </tr></thead>
          <tbody>
            {stakeholders.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--fs-line)' }}>
                <td style={td}>{s.name}</td>
                <td style={td}>{s.role || '—'}</td>
                <td style={td} className="capitalize">{s.power}</td>
                <td style={td} className="capitalize">{s.interest}</td>
                <td style={td}>
                  <select className="fs-input" style={selectSm} value={s.engagement_current} onChange={(e) => setEngagement(s.id, 'engagementCurrent', e.target.value)}>
                    {ENGAGEMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select className="fs-input" style={selectSm} value={s.engagement_desired} onChange={(e) => setEngagement(s.id, 'engagementDesired', e.target.value)}>
                    {ENGAGEMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {stakeholders.length === 0 && <tr><td colSpan={6} style={{ ...td, color: 'var(--fs-slate)', textAlign: 'center', padding: 20 }}>No stakeholders yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ ...row, marginTop: 12 }}>
        <input className="fs-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ flex: 1 }} />
        <input className="fs-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" style={{ width: 160 }} />
        <select className="fs-input" value={power} onChange={(e) => setPower(e.target.value)}>
          <option value="low">Power: low</option><option value="medium">Power: medium</option><option value="high">Power: high</option>
        </select>
        <select className="fs-input" value={interest} onChange={(e) => setInterest(e.target.value)}>
          <option value="low">Interest: low</option><option value="medium">Interest: medium</option><option value="high">Interest: high</option>
        </select>
        <button className="fs-btn fs-btn-primary" onClick={create}>Add stakeholder</button>
      </div>
    </section>
  );
};

// ── Comms plan ────────────────────────────────────────────────────────

const CommsTab = ({ projectId, comms, stakeholders, reload }: { projectId: string; comms: CommsItem[]; stakeholders: Stakeholder[]; reload: () => void }) => {
  const [audience, setAudience] = useState('');
  const [message, setMessage] = useState('');
  const [method, setMethod] = useState('');
  const [frequency, setFrequency] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [stakeholderId, setStakeholderId] = useState('');

  const create = async () => {
    if (!audience.trim() || !message.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/comms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience: audience.trim(), message: message.trim(), method: method || undefined, frequency: frequency || undefined, nextDue: nextDue || undefined, stakeholderId: stakeholderId || undefined }),
    });
    setAudience(''); setMessage(''); setMethod(''); setFrequency(''); setNextDue(''); setStakeholderId(''); reload();
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/comms/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <section>
      <div className="fs-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={th_row}>
            <th style={th}>Audience</th><th style={th}>Message</th><th style={th}>Method</th><th style={th}>Frequency</th><th style={th}>Next due</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {comms.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--fs-line)' }}>
                <td style={td}>{c.audience}</td><td style={td}>{c.message}</td><td style={td}>{c.method || '—'}</td>
                <td style={td}>{c.frequency || '—'}</td><td style={td}>{c.next_due || '—'}</td>
                <td style={td}><button className="fs-icon-btn" onClick={() => remove(c.id)}>✕</button></td>
              </tr>
            ))}
            {comms.length === 0 && <tr><td colSpan={6} style={{ ...td, color: 'var(--fs-slate)', textAlign: 'center', padding: 20 }}>No communications planned yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="fs-card" style={{ padding: 14, marginTop: 12 }}>
        <div style={row}>
          <select className="fs-input" value={stakeholderId} onChange={(e) => setStakeholderId(e.target.value)}>
            <option value="">Audience (from stakeholders, optional)…</option>
            {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="fs-input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience label" style={{ flex: 1 }} />
        </div>
        <div style={{ ...row, marginTop: 8 }}>
          <input className="fs-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message / content" style={{ flex: 1 }} />
          <input className="fs-input" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Method" style={{ width: 140 }} />
          <input className="fs-input" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Frequency" style={{ width: 140 }} />
          <input className="fs-input" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
          <button className="fs-btn fs-btn-primary" onClick={create}>Add</button>
        </div>
      </div>
    </section>
  );
};

// ── RACI matrix ───────────────────────────────────────────────────────

const RaciTab = ({ projectId, grid, reload }: { projectId: string; grid: RaciGrid; reload: () => void }) => {
  const [taskLabel, setTaskLabel] = useState('');
  const [person, setPerson] = useState('');
  const [roleCode, setRoleCode] = useState<'R' | 'A' | 'C' | 'I'>('R');

  const cellFor = (task: string, p: string) => grid.entries.find((e) => e.task_label === task && e.person === p)?.role_code;

  const setCell = async () => {
    if (!taskLabel.trim() || !person.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/raci`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskLabel: taskLabel.trim(), person: person.trim(), roleCode }),
    });
    setTaskLabel(''); setPerson(''); reload();
  };

  const clearCell = async (task: string, p: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/raci`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskLabel: task, person: p }),
    });
    reload();
  };

  return (
    <section>
      <p style={{ fontSize: 12, color: 'var(--fs-slate)', marginBottom: 12 }}>R = Responsible, A = Accountable, C = Consulted, I = Informed. Click a filled cell to clear it.</p>
      {grid.tasks.length > 0 && grid.people.length > 0 && (
        <div className="fs-card" style={{ overflow: 'auto', marginBottom: 16 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={th_row}>
              <th style={th}></th>
              {grid.people.map((p) => <th key={p} style={th}>{p}</th>)}
            </tr></thead>
            <tbody>
              {grid.tasks.map((t) => (
                <tr key={t} style={{ borderBottom: '1px solid var(--fs-line)' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{t}</td>
                  {grid.people.map((p) => {
                    const code = cellFor(t, p);
                    return (
                      <td key={p} style={{ ...td, textAlign: 'center' }}>
                        {code ? (
                          <span onClick={() => clearCell(t, p)} style={{ ...pill, background: 'var(--fs-teal-wash)', color: 'var(--fs-teal)', cursor: 'pointer' }}>{code}</span>
                        ) : <span style={{ color: 'var(--fs-line-strong)' }}>·</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={row}>
        <input className="fs-input" value={taskLabel} onChange={(e) => setTaskLabel(e.target.value)} placeholder="Task label" style={{ flex: 1 }} />
        <input className="fs-input" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Person" style={{ flex: 1 }} />
        <select className="fs-input" value={roleCode} onChange={(e) => setRoleCode(e.target.value as any)}>
          <option value="R">R</option><option value="A">A</option><option value="C">C</option><option value="I">I</option>
        </select>
        <button className="fs-btn fs-btn-primary" onClick={setCell}>Set cell</button>
      </div>
    </section>
  );
};

// ── Procurement ───────────────────────────────────────────────────────

const ProcurementTab = ({ projectId, items, reload }: { projectId: string; items: ProcurementItem[]; reload: () => void }) => {
  const [itemName, setItemName] = useState('');
  const [procurementType, setProcurementType] = useState('buy');
  const [estimatedValue, setEstimatedValue] = useState('');

  const [vendorFor, setVendorFor] = useState<string | null>(null);
  const [vendor, setVendor] = useState('');
  const [price, setPrice] = useState('');
  const [qualityScore, setQualityScore] = useState('3');
  const [deliveryScore, setDeliveryScore] = useState('3');

  const create = async () => {
    if (!itemName.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/procurement`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName: itemName.trim(), procurementType, estimatedValue: estimatedValue ? Number(estimatedValue) : undefined }),
    });
    setItemName(''); setEstimatedValue(''); reload();
  };

  const addVendor = async (itemId: string) => {
    if (!vendor.trim() || !price) return;
    await apiFetch(`/api/projects/engine/${projectId}/procurement/${itemId}/vendors`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor: vendor.trim(), price: Number(price), qualityScore: Number(qualityScore), deliveryScore: Number(deliveryScore) }),
    });
    setVendor(''); setPrice(''); setVendorFor(null); reload();
  };

  const award = async (itemId: string, v: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/procurement/${itemId}/award`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor: v }),
    });
    reload();
  };

  return (
    <section>
      <p style={{ fontSize: 12, color: 'var(--fs-slate)', marginBottom: 12 }}>Best-value score = 40% price (cheaper wins) + 30% quality + 30% delivery, normalised across each item's own vendor options.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {items.map((item) => (
          <div key={item.id} className="fs-card" style={{ padding: 16 }}>
            <div style={row}>
              <strong style={{ flex: 1, fontSize: 14 }}>{item.item_name}</strong>
              <span style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'capitalize' }}>{item.procurement_type}</span>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, background: item.status === 'awarded' ? '#EEF6F3' : 'var(--fs-cream)', color: item.status === 'awarded' ? '#1B5E52' : 'var(--fs-slate)' }}>{item.status}</span>
            </div>
            {item.vendor_options.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 10 }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--fs-slate)' }}>
                  <th style={th}>Vendor</th><th style={th}>Price</th><th style={th}>Quality</th><th style={th}>Delivery</th><th style={th}>Best value</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {[...item.vendor_options].sort((a, b) => b.best_value_score - a.best_value_score).map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--fs-line)', fontWeight: item.selected_vendor === v.vendor ? 600 : 400 }}>
                      <td style={td}>{v.vendor}{item.selected_vendor === v.vendor && ' ✓'}</td>
                      <td style={td}>R{v.price}</td><td style={td}>{v.quality_score}/5</td><td style={td}>{v.delivery_score}/5</td>
                      <td style={{ ...td, color: 'var(--fs-teal)', fontFamily: 'var(--fs-font-mono)' }}>{v.best_value_score.toFixed(3)}</td>
                      <td style={td}>{item.status !== 'awarded' && <button className="fs-btn fs-btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => award(item.id, v.vendor)}>Award</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {vendorFor === item.id ? (
              <div style={{ ...row, marginTop: 10 }}>
                <input className="fs-input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor" />
                <input className="fs-input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" style={{ width: 100 }} />
                <select className="fs-input" value={qualityScore} onChange={(e) => setQualityScore(e.target.value)}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Quality {n}</option>)}
                </select>
                <select className="fs-input" value={deliveryScore} onChange={(e) => setDeliveryScore(e.target.value)}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Delivery {n}</option>)}
                </select>
                <button className="fs-btn fs-btn-primary" onClick={() => addVendor(item.id)}>Add</button>
              </div>
            ) : (
              <button className="fs-btn fs-btn-secondary" style={{ marginTop: 10, padding: '5px 12px', fontSize: 12 }} onClick={() => setVendorFor(item.id)}>+ Add vendor option</button>
            )}
          </div>
        ))}
        {items.length === 0 && <p style={{ color: 'var(--fs-slate)', fontSize: 13 }}>No procurement items yet.</p>}
      </div>

      <div style={row}>
        <input className="fs-input" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Procurement item" style={{ flex: 1 }} />
        <select className="fs-input" value={procurementType} onChange={(e) => setProcurementType(e.target.value)}>
          <option value="buy">Buy</option><option value="make">Make</option>
        </select>
        <input className="fs-input" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="Estimated value (R)" style={{ width: 160 }} />
        <button className="fs-btn fs-btn-primary" onClick={create}>Add item</button>
      </div>
    </section>
  );
};

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const th_row: React.CSSProperties = { textAlign: 'left', background: 'var(--fs-cream)' };
const th: React.CSSProperties = { padding: '9px 12px', fontSize: 11, fontWeight: 600, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.02em' };
const td: React.CSSProperties = { padding: '8px 12px' };
const pill: React.CSSProperties = { display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
const selectSm: React.CSSProperties = { padding: '4px 8px', fontSize: 12 };

export default PfGovernanceView;
