/**
 * ProjectFlow PM Engine — Governance Registers (Phase 5)
 *
 * Risk register (5x5 matrix), stakeholder engagement matrix, comms plan,
 * RACI matrix, procurement with best-value scoring. Independent of the
 * scheduling/EVA engine (Phases 1-4) - a project can have these registers
 * with or without a schedule underneath it.
 *
 * Internal preview, not linked from the main nav yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

const scoreColor = (score: number) => (score >= 15 ? '#a23b27' : score >= 8 ? '#b57a16' : '#2c6e49');

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
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', maxWidth: 1100 }}>
      <p><Link to={`/app/projects/engine-preview/${projectId}`}>← back to engine preview</Link></p>
      <h1>Governance Registers</h1>
      <p style={{ color: '#4b5457' }}>Internal scaffold. Not part of the live Projects experience yet.</p>
      {error && <div style={{ background: '#f3ebda', border: '1px solid #d8dedf', borderRadius: 8, padding: 16, color: '#a5721a' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 4, margin: '20px 0', borderBottom: '1px solid #d8dedf' }}>
        {(['risk', 'stakeholders', 'comms', 'raci', 'procurement'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14,
            borderBottom: tab === t ? '2px solid #0c5f53' : '2px solid transparent',
            color: tab === t ? '#0c5f53' : '#4b5457', textTransform: 'capitalize',
          }}>{t === 'raci' ? 'RACI' : t}</button>
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
      <p style={{ fontSize: 13, color: '#737c7e' }}>Score = probability × impact (5×5 matrix, 1-25). Red ≥15, amber ≥8, green below.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #d8dedf' }}>
          <th style={th}>#</th><th style={th}>Title</th><th style={th}>Category</th><th style={th}>P</th><th style={th}>I</th>
          <th style={th}>Score</th><th style={th}>Response</th><th style={th}>Owner</th><th style={th}>Status</th>
        </tr></thead>
        <tbody>
          {risks.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e6eaeb' }}>
              <td style={td}>R-{r.risk_number}</td>
              <td style={td}>{r.title}</td>
              <td style={td}>{r.category || '—'}</td>
              <td style={td}>{r.probability}</td>
              <td style={td}>{r.impact}</td>
              <td style={{ ...td, color: scoreColor(r.score), fontWeight: 600 }}>{r.score}</td>
              <td style={td}>
                <select value={r.response_strategy || ''} onChange={(e) => setField(r.id, 'responseStrategy', e.target.value)} style={{ fontSize: 12 }}>
                  <option value="">—</option>
                  <option value="avoid">Avoid</option><option value="mitigate">Mitigate</option>
                  <option value="transfer">Transfer</option><option value="accept">Accept</option>
                </select>
              </td>
              <td style={td}>{r.owner || '—'}</td>
              <td style={td}>
                <select value={r.status} onChange={(e) => setField(r.id, 'status', e.target.value)} style={{ fontSize: 12 }}>
                  <option value="open">Open</option><option value="mitigating">Mitigating</option><option value="closed">Closed</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...row, marginTop: 16 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Risk title" style={{ flex: 1, padding: 6 }} />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" style={{ width: 140, padding: 6 }} />
        <select value={probability} onChange={(e) => setProbability(e.target.value)} style={{ padding: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>P{n}</option>)}
        </select>
        <select value={impact} onChange={(e) => setImpact(e.target.value)} style={{ padding: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>I{n}</option>)}
        </select>
        <button style={btn} onClick={create}>Add risk</button>
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
      <p style={{ fontSize: 13, color: '#737c7e' }}>Power/interest grid drives who needs direct management vs monitoring; current → desired engagement is the gap to close.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #d8dedf' }}>
          <th style={th}>Name</th><th style={th}>Role</th><th style={th}>Power</th><th style={th}>Interest</th>
          <th style={th}>Current</th><th style={th}>Desired</th>
        </tr></thead>
        <tbody>
          {stakeholders.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #e6eaeb' }}>
              <td style={td}>{s.name}</td>
              <td style={td}>{s.role || '—'}</td>
              <td style={td}>{s.power}</td>
              <td style={td}>{s.interest}</td>
              <td style={td}>
                <select value={s.engagement_current} onChange={(e) => setEngagement(s.id, 'engagementCurrent', e.target.value)} style={{ fontSize: 12 }}>
                  {ENGAGEMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </td>
              <td style={td}>
                <select value={s.engagement_desired} onChange={(e) => setEngagement(s.id, 'engagementDesired', e.target.value)} style={{ fontSize: 12 }}>
                  {ENGAGEMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...row, marginTop: 16 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ flex: 1, padding: 6 }} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" style={{ width: 160, padding: 6 }} />
        <select value={power} onChange={(e) => setPower(e.target.value)} style={{ padding: 4 }}>
          <option value="low">Power: low</option><option value="medium">Power: medium</option><option value="high">Power: high</option>
        </select>
        <select value={interest} onChange={(e) => setInterest(e.target.value)} style={{ padding: 4 }}>
          <option value="low">Interest: low</option><option value="medium">Interest: medium</option><option value="high">Interest: high</option>
        </select>
        <button style={btn} onClick={create}>Add stakeholder</button>
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
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #d8dedf' }}>
          <th style={th}>Audience</th><th style={th}>Message</th><th style={th}>Method</th><th style={th}>Frequency</th><th style={th}>Next due</th><th style={th}></th>
        </tr></thead>
        <tbody>
          {comms.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #e6eaeb' }}>
              <td style={td}>{c.audience}</td><td style={td}>{c.message}</td><td style={td}>{c.method || '—'}</td>
              <td style={td}>{c.frequency || '—'}</td><td style={td}>{c.next_due || '—'}</td>
              <td style={td}><button style={{ ...btn, color: '#a23b27' }} onClick={() => remove(c.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        <div style={row}>
          <select value={stakeholderId} onChange={(e) => setStakeholderId(e.target.value)} style={{ padding: 4 }}>
            <option value="">Audience (from stakeholders, optional)…</option>
            {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience label" style={{ flex: 1, padding: 6 }} />
        </div>
        <div style={{ ...row, marginTop: 8 }}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message / content" style={{ flex: 1, padding: 6 }} />
          <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Method" style={{ width: 140, padding: 6 }} />
          <input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Frequency" style={{ width: 140, padding: 6 }} />
          <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} style={{ padding: 6 }} />
          <button style={btn} onClick={create}>Add</button>
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
      <p style={{ fontSize: 13, color: '#737c7e' }}>R = Responsible, A = Accountable, C = Consulted, I = Informed. Click a filled cell to clear it.</p>
      {grid.tasks.length > 0 && grid.people.length > 0 && (
        <table style={{ borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
          <thead><tr>
            <th style={th}></th>
            {grid.people.map((p) => <th key={p} style={th}>{p}</th>)}
          </tr></thead>
          <tbody>
            {grid.tasks.map((t) => (
              <tr key={t} style={{ borderBottom: '1px solid #e6eaeb' }}>
                <td style={{ ...td, fontWeight: 600 }}>{t}</td>
                {grid.people.map((p) => {
                  const code = cellFor(t, p);
                  return (
                    <td key={p} style={{ ...td, textAlign: 'center', cursor: code ? 'pointer' : 'default' }} onClick={() => code && clearCell(t, p)}>
                      {code || '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={row}>
        <input value={taskLabel} onChange={(e) => setTaskLabel(e.target.value)} placeholder="Task label" style={{ flex: 1, padding: 6 }} />
        <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Person" style={{ flex: 1, padding: 6 }} />
        <select value={roleCode} onChange={(e) => setRoleCode(e.target.value as any)} style={{ padding: 4 }}>
          <option value="R">R</option><option value="A">A</option><option value="C">C</option><option value="I">I</option>
        </select>
        <button style={btn} onClick={setCell}>Set cell</button>
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
      <p style={{ fontSize: 13, color: '#737c7e' }}>Best-value score = 40% price (cheaper wins) + 30% quality + 30% delivery, normalised across each item's own vendor options.</p>
      {items.map((item) => (
        <div key={item.id} style={{ border: '1px solid #d8dedf', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={row}>
            <strong style={{ flex: 1 }}>{item.item_name}</strong>
            <span style={{ fontSize: 12, color: '#4b5457' }}>{item.procurement_type}</span>
            <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#4b5457' }}>{item.status}</span>
          </div>
          {item.vendor_options.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
              <thead><tr style={{ textAlign: 'left', color: '#737c7e' }}>
                <th style={th}>Vendor</th><th style={th}>Price</th><th style={th}>Quality</th><th style={th}>Delivery</th><th style={th}>Best value</th><th style={th}></th>
              </tr></thead>
              <tbody>
                {[...item.vendor_options].sort((a, b) => b.best_value_score - a.best_value_score).map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e6eaeb', fontWeight: item.selected_vendor === v.vendor ? 600 : 400 }}>
                    <td style={td}>{v.vendor}{item.selected_vendor === v.vendor && ' ✓'}</td>
                    <td style={td}>R{v.price}</td><td style={td}>{v.quality_score}/5</td><td style={td}>{v.delivery_score}/5</td>
                    <td style={{ ...td, color: '#0c5f53' }}>{v.best_value_score.toFixed(3)}</td>
                    <td style={td}>{item.status !== 'awarded' && <button style={btn} onClick={() => award(item.id, v.vendor)}>Award</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {vendorFor === item.id ? (
            <div style={{ ...row, marginTop: 8 }}>
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor" style={{ padding: 4 }} />
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" style={{ width: 100, padding: 4 }} />
              <select value={qualityScore} onChange={(e) => setQualityScore(e.target.value)} style={{ padding: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Quality {n}</option>)}
              </select>
              <select value={deliveryScore} onChange={(e) => setDeliveryScore(e.target.value)} style={{ padding: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Delivery {n}</option>)}
              </select>
              <button style={btn} onClick={() => addVendor(item.id)}>Add</button>
            </div>
          ) : (
            <button style={{ ...btn, marginTop: 8 }} onClick={() => setVendorFor(item.id)}>+ Add vendor option</button>
          )}
        </div>
      ))}

      <div style={{ ...row, marginTop: 16 }}>
        <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Procurement item" style={{ flex: 1, padding: 6 }} />
        <select value={procurementType} onChange={(e) => setProcurementType(e.target.value)} style={{ padding: 4 }}>
          <option value="buy">Buy</option><option value="make">Make</option>
        </select>
        <input value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="Estimated value (R)" style={{ width: 160, padding: 6 }} />
        <button style={btn} onClick={create}>Add item</button>
      </div>
    </section>
  );
};

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const btn: React.CSSProperties = { fontSize: 12, padding: '4px 10px', cursor: 'pointer' };
const th: React.CSSProperties = { padding: '6px 8px', fontSize: 12 };
const td: React.CSSProperties = { padding: '6px 8px' };

export default PfGovernanceView;
