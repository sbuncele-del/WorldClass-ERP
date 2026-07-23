/**
 * Project Workspace — Overview tab (the project command center).
 *
 * A PM opening a project should know, at a glance and without touching
 * any other tab: how much is done, whether it's on schedule, whether
 * it's on budget, what's most at risk, and what happens next. Every
 * number here is already computed by the engine (CPM schedule, earned
 * value, baseline cost, risk register) — this tab just brings it
 * together into one dashboard instead of making you reconstruct it by
 * clicking through seven tabs.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface Activity {
  id: string; name: string; duration_days: string;
  early_start: string | null; early_finish: string | null; is_critical: boolean;
}
interface Eva {
  bcws: number; bcwp: number; acwp: number; cv: number; sv: number;
  cpi: number | null; spi: number | null; cvWithinThreshold: boolean; svWithinThreshold: boolean;
  healthQuadrant: string;
}
interface Baseline { total_cost: string; version: number; frozen_at: string; }
interface Risk { id: string; risk_number: number; title: string; score: number; status: string; }

const PHASE_LABEL: Record<string, string> = {
  define: 'Define', develop: 'Develop', plan: 'Plan', execute: 'Execute', monitor_control: 'Monitor & Control', close: 'Close',
};

const rand = (v: number) => `R${Math.round(v).toLocaleString('en-ZA')}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const settled = async <T,>(p: Promise<T>): Promise<T | null> => { try { return await p; } catch { return null; } };

const PfOverviewTab = () => {
  const { projectId } = useParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [duration, setDuration] = useState(0);
  const [eva, setEva] = useState<Eva | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [plannedCost, setPlannedCost] = useState(0);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [nextPhases, setNextPhases] = useState<string[]>([]);
  const [phase, setPhase] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    const base = `/api/projects/engine/${projectId}`;
    const [sched, ev, bl, cost, rk, lc] = await Promise.all([
      settled(apiFetch(`${base}/schedule`)),
      settled(apiFetch(`${base}/eva`)),
      settled(apiFetch(`${base}/baseline`)),
      settled(apiFetch(`${base}/cost-summary`)),
      settled(apiFetch(`${base}/risks`)),
      settled(apiFetch(`${base}/lifecycle`)),
    ]);
    if (sched?.data) { setActivities(sched.data.activities || []); setDuration(sched.data.projectDurationDays || 0); }
    setEva(ev?.data || null);
    setBaseline(bl?.data || null);
    if (cost?.data) setPlannedCost(cost.data.totalCost || 0);
    if (rk?.data) setRisks(rk.data);
    if (lc?.data) { setNextPhases(lc.data.nextPhases || []); setPhase(lc.data.phase || null); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const attemptTransition = async (toPhase: string) => {
    setGateMessage(null);
    try {
      await apiFetch(`/api/projects/engine/${projectId}/lifecycle/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toPhase }),
      });
      load();
    } catch (err: any) { setGateMessage(err.message); }
  };

  if (loading) return <p style={{ color: 'var(--fs-slate)' }}>Loading project…</p>;

  const activityCount = activities.length;
  const milestoneCount = activities.filter((a) => parseFloat(a.duration_days) === 0).length;
  const criticalCount = activities.filter((a) => a.is_critical).length;
  const starts = activities.map((a) => a.early_start).filter(Boolean) as string[];
  const finishes = activities.map((a) => a.early_finish).filter(Boolean) as string[];
  const projStart = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null;
  const projFinish = finishes.length ? finishes.reduce((a, b) => (a > b ? a : b)) : null;

  const bac = baseline ? parseFloat(baseline.total_cost) : 0;
  const pctComplete = eva && bac > 0 ? Math.max(0, Math.min(100, (eva.bcwp / bac) * 100)) : null;

  const openRisks = risks.filter((r) => r.status !== 'closed');
  const topRisks = [...openRisks].sort((a, b) => b.score - a.score).slice(0, 3);

  const upcoming = [...activities]
    .filter((a) => a.early_start)
    .sort((a, b) => (a.early_start! < b.early_start! ? -1 : 1))
    .slice(0, 5);

  const scoreStyle = (s: number) => (s >= 15 ? { bg: '#FBECEB', fg: '#7A4A45' } : s >= 8 ? { bg: '#FBF3E4', fg: '#8A6416' } : { bg: '#EEF6F3', fg: '#1B5E52' });

  return (
    <div style={{ maxWidth: 1160, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── KPI row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="fs-card" style={{ padding: 18, flex: '1 1 200px', minWidth: 200, display: 'flex', alignItems: 'center', gap: 16 }}>
          <CompletionRing pct={pctComplete} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Complete</div>
            <div style={{ fontFamily: 'var(--fs-font-serif)', fontSize: 24, fontWeight: 600 }}>{pctComplete != null ? `${pctComplete.toFixed(0)}%` : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--fs-slate)' }}>{pctComplete != null ? 'earned value' : 'set a baseline'}</div>
          </div>
        </div>

        <KpiTile
          label="Schedule"
          value={eva?.spi != null ? eva.spi.toFixed(2) : `${duration}d`}
          sub={eva?.spi != null ? (eva.svWithinThreshold ? 'on schedule' : 'behind plan') : 'total duration'}
          tone={eva?.spi != null ? (eva.svWithinThreshold ? 'good' : 'bad') : 'neutral'}
          hint={eva?.spi != null ? 'SPI' : undefined}
        />
        <KpiTile
          label="Budget"
          value={eva?.cpi != null ? eva.cpi.toFixed(2) : rand(plannedCost)}
          sub={eva?.cpi != null ? (eva.cvWithinThreshold ? 'on budget' : 'over budget') : 'planned cost'}
          tone={eva?.cpi != null ? (eva.cvWithinThreshold ? 'good' : 'bad') : 'neutral'}
          hint={eva?.cpi != null ? 'CPI' : undefined}
        />
        <KpiTile
          label="Open risks"
          value={String(openRisks.length)}
          sub={topRisks[0] ? `top score ${topRisks[0].score}` : 'none logged'}
          tone={topRisks[0] && topRisks[0].score >= 15 ? 'bad' : topRisks[0] && topRisks[0].score >= 8 ? 'warn' : 'neutral'}
        />
      </div>

      {/* ── Schedule + Cost ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="fs-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <p className="fs-page-eyebrow" style={{ margin: 0 }}>Schedule</p>
            <Link to={`/app/projects/engine-preview/${projectId}/schedule`} style={miniLink}>Open →</Link>
          </div>
          {activityCount === 0 ? (
            <Empty text="No activities yet." to={`/app/projects/engine-preview/${projectId}/wbs`} cta="Build the WBS" />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
                <Metric label="Activities" value={String(activityCount)} />
                <Metric label="Milestones" value={String(milestoneCount)} />
                <Metric label="On critical path" value={String(criticalCount)} accent="#1B5E52" />
                <Metric label="Duration" value={`${duration}d`} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fs-slate)', borderTop: '1px solid var(--fs-line)', paddingTop: 12 }}>
                <span>Start <strong style={{ color: 'var(--fs-ink)' }}>{fmtDate(projStart)}</strong></span>
                <span>Finish <strong style={{ color: 'var(--fs-ink)' }}>{fmtDate(projFinish)}</strong></span>
              </div>
            </>
          )}
        </div>

        <div className="fs-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <p className="fs-page-eyebrow" style={{ margin: 0 }}>Cost & Earned Value</p>
            <Link to={`/app/projects/engine-preview/${projectId}/eva`} style={miniLink}>Open →</Link>
          </div>
          {eva ? (
            <>
              <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
                <Metric label="Budget (BAC)" value={rand(bac)} />
                <Metric label="Earned (BCWP)" value={rand(eva.bcwp)} accent="#1B5E52" />
                <Metric label="Actual (ACWP)" value={rand(eva.acwp)} />
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, borderTop: '1px solid var(--fs-line)', paddingTop: 12 }}>
                <span style={{ color: 'var(--fs-slate)' }}>Cost variance <strong style={{ color: eva.cvWithinThreshold ? '#1B5E52' : '#B04A43' }}>{rand(eva.cv)}</strong></span>
                <span style={{ color: 'var(--fs-slate)' }}>Schedule variance <strong style={{ color: eva.svWithinThreshold ? '#1B5E52' : '#B04A43' }}>{rand(eva.sv)}</strong></span>
              </div>
            </>
          ) : baseline ? (
            <p style={{ fontSize: 13, color: 'var(--fs-slate)', margin: 0 }}>Baseline v{baseline.version} set. Record progress in Earned Value to track cost/schedule performance.</p>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}><Metric label="Planned cost" value={rand(plannedCost)} /></div>
              <Empty text="No baseline frozen yet — earned value needs a baseline to measure against." to={`/app/projects/engine-preview/${projectId}/resources`} cta="Freeze a baseline" />
            </>
          )}
        </div>
      </div>

      {/* ── Risks + Lifecycle ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="fs-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <p className="fs-page-eyebrow" style={{ margin: 0 }}>Top risks</p>
            <Link to={`/app/projects/engine-preview/${projectId}/governance`} style={miniLink}>Open →</Link>
          </div>
          {topRisks.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fs-slate)', margin: 0 }}>No open risks logged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topRisks.map((r) => {
                const s = scoreStyle(r.score);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--fs-font-mono)', fontSize: 11, color: 'var(--fs-slate)', width: 34 }}>R-{r.risk_number}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{r.title}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: s.bg, color: s.fg }}>{r.score}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="fs-card" style={{ padding: 20 }}>
          <p className="fs-page-eyebrow" style={{ margin: '0 0 6px' }}>Lifecycle</p>
          <p style={{ fontSize: 13, color: 'var(--fs-slate)', margin: '0 0 14px' }}>
            Currently in <strong style={{ color: 'var(--fs-ink)' }}>{phase ? (PHASE_LABEL[phase] || phase) : '—'}</strong>.
          </p>
          {nextPhases.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fs-slate)', margin: 0 }}>No further transitions from this phase.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {nextPhases.map((p) => (
                <button key={p} className="fs-btn fs-btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => attemptTransition(p)}>
                  Move to {PHASE_LABEL[p] || p}
                </button>
              ))}
            </div>
          )}
          {gateMessage && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#FBF3E4', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', color: '#8A6416', fontSize: 13 }}>
              {gateMessage}
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <div className="fs-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--fs-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p className="fs-page-eyebrow" style={{ margin: 0 }}>Upcoming activities</p>
            <Link to={`/app/projects/engine-preview/${projectId}/schedule`} style={miniLink}>Schedule →</Link>
          </div>
          {upcoming.map((a) => (
            <div key={a.id} className="fs-listrow">
              {a.is_critical && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1B5E52', flex: 'none' }} title="On critical path" />}
              <span style={{ flex: 1, fontSize: 14, marginLeft: a.is_critical ? 0 : 18 }}>{a.name}</span>
              <span style={{ fontSize: 12, color: 'var(--fs-slate)' }}>{parseFloat(a.duration_days) === 0 ? 'Milestone' : `${a.duration_days}d`}</span>
              <span style={{ fontSize: 12, color: 'var(--fs-slate)', width: 100, textAlign: 'right' }}>{fmtDate(a.early_start)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const KpiTile = ({ label, value, sub, tone, hint }: { label: string; value: string; sub: string; tone: 'good' | 'bad' | 'warn' | 'neutral'; hint?: string }) => {
  const bar = tone === 'good' ? '#1B5E52' : tone === 'bad' ? '#B04A43' : tone === 'warn' ? '#B58A2E' : '#9AA3AB';
  return (
    <div className="fs-card" style={{ padding: 18, flex: '1 1 200px', minWidth: 200, borderTop: `3px solid ${bar}` }}>
      <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>{hint && <span style={{ fontFamily: 'var(--fs-font-mono)' }}>{hint}</span>}
      </div>
      <div style={{ fontFamily: 'var(--fs-font-serif)', fontSize: 24, fontWeight: 600, margin: '4px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--fs-slate)' }}>{sub}</div>
    </div>
  );
};

const Metric = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 600, fontFamily: 'var(--fs-font-mono)', color: accent || 'var(--fs-ink)' }}>{value}</div>
  </div>
);

const Empty = ({ text, to, cta }: { text: string; to: string; cta: string }) => (
  <div style={{ fontSize: 13, color: 'var(--fs-slate)' }}>
    {text} <Link to={to} style={{ color: 'var(--fs-teal)', textDecoration: 'none', fontWeight: 600 }}>{cta} →</Link>
  </div>
);

const CompletionRing = ({ pct }: { pct: number | null }) => {
  const r = 22, c = 2 * Math.PI * r, v = pct ?? 0;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--fs-cream)" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1B5E52" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} transform="rotate(-90 28 28)" />
    </svg>
  );
};

const miniLink: React.CSSProperties = { fontSize: 12, color: 'var(--fs-teal)', textDecoration: 'none' };

export default PfOverviewTab;
