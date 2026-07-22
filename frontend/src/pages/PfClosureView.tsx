/**
 * FlowSpace — Reviews & Closure
 *
 * Fills the lifecycle's second soft gate: closing to "close" requires
 * every checklist item complete plus a recorded closure outcome
 * (completed / terminated / cancelled) - a project must close one way
 * or another, not only when it succeeds.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface ChecklistItem {
  id: string; category: string; label: string; is_complete: boolean; notes: string | null; sort_order: number;
}
interface DocumentRow { id: string; title: string; category: string | null; url: string | null; notes: string | null; created_at: string; }
interface LessonRow { id: string; category: string | null; observation: string; recommendation: string | null; created_at: string; }

const OUTCOME_LABEL: Record<string, string> = { completed: 'Completed', terminated: 'Terminated', cancelled: 'Cancelled' };

const PfClosureView = () => {
  const { projectId } = useParams();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const [lessonCategory, setLessonCategory] = useState('');
  const [lessonObservation, setLessonObservation] = useState('');
  const [lessonRecommendation, setLessonRecommendation] = useState('');

  const load = useCallback(() => {
    if (!projectId) return;
    setError(null);
    Promise.all([
      apiFetch(`/api/projects/engine/${projectId}/closure/checklist`),
      apiFetch(`/api/projects/engine/${projectId}/closure/outcome`),
      apiFetch(`/api/projects/engine/${projectId}/closure/documents`),
      apiFetch(`/api/projects/engine/${projectId}/closure/lessons`),
    ])
      .then(([c, o, d, l]) => { setChecklist(c.data); setOutcome(o.data.outcome); setDocuments(d.data); setLessons(l.data); })
      .catch((err) => setError(err.message));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = async (item: ChecklistItem) => {
    await apiFetch(`/api/projects/engine/${projectId}/closure/checklist/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isComplete: !item.is_complete }),
    });
    load();
  };

  const setOutcomeValue = async (value: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/closure/outcome`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: value }),
    });
    load();
  };

  const addDocument = async () => {
    if (!docTitle.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/closure/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: docTitle.trim(), category: docCategory || undefined, url: docUrl || undefined }),
    });
    setDocTitle(''); setDocCategory(''); setDocUrl(''); load();
  };

  const removeDocument = async (id: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/closure/documents/${id}`, { method: 'DELETE' });
    load();
  };

  const addLesson = async () => {
    if (!lessonObservation.trim()) return;
    await apiFetch(`/api/projects/engine/${projectId}/closure/lessons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: lessonCategory || undefined, observation: lessonObservation.trim(), recommendation: lessonRecommendation || undefined }),
    });
    setLessonCategory(''); setLessonObservation(''); setLessonRecommendation(''); load();
  };

  const removeLesson = async (id: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/closure/lessons/${id}`, { method: 'DELETE' });
    load();
  };

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;

  const allComplete = checklist.length > 0 && checklist.every((i) => i.is_complete);
  const gateReady = allComplete && outcome != null;

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {error && <div style={{ background: '#FBF3E4', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: 16, color: '#8A6416' }}>{error}</div>}

      <div style={{
        padding: '10px 16px', borderRadius: 20, display: 'inline-block', width: 'fit-content',
        background: gateReady ? '#EEF6F3' : '#FBF3E4', color: gateReady ? '#1B5E52' : '#8A6416', fontSize: 13, fontWeight: 500,
      }}>
        {gateReady ? '✓ Closure gate satisfied — the project can transition to "close".' : 'Closure gate not yet satisfied — complete the checklist and record an outcome.'}
      </div>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Closure checklist</p>
        <div className="fs-card" style={{ overflow: 'hidden' }}>
          {checklist.map((item) => (
            <label key={item.id} className="fs-listrow" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={item.is_complete} onChange={() => toggleItem(item)} />
              <span style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', width: 110 }}>{item.category.replace('_', ' ')}</span>
              <span style={{ flex: 1, fontSize: 14, textDecoration: item.is_complete ? 'line-through' : 'none', color: item.is_complete ? 'var(--fs-slate)' : 'var(--fs-ink)' }}>{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 4 }}>Closure outcome</p>
        <p style={{ fontSize: 12, color: 'var(--fs-slate)', marginTop: 0, marginBottom: 10 }}>Every project must close one way or another — completed, terminated, or cancelled.</p>
        <div style={row}>
          {(['completed', 'terminated', 'cancelled'] as const).map((o) => (
            <button key={o} onClick={() => setOutcomeValue(o)} className={outcome === o ? 'fs-btn fs-btn-primary' : 'fs-btn fs-btn-secondary'}>
              {OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Document repository</p>
        <div className="fs-card" style={{ overflow: 'hidden' }}>
          {documents.map((d) => (
            <div key={d.id} className="fs-listrow">
              <span style={{ fontSize: 11, color: 'var(--fs-slate)', width: 100 }}>{d.category || '—'}</span>
              {d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'var(--fs-teal)', fontSize: 14 }}>{d.title}</a> : <span style={{ flex: 1, fontSize: 14 }}>{d.title}</span>}
              <button className="fs-icon-btn" onClick={() => removeDocument(d.id)}>✕</button>
            </div>
          ))}
          {documents.length === 0 && <p style={{ color: 'var(--fs-slate)', fontSize: 13, padding: '14px', margin: 0 }}>No documents yet.</p>}
        </div>
        <div style={{ ...row, marginTop: 10 }}>
          <input className="fs-input" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Document title" style={{ flex: 1 }} />
          <input className="fs-input" value={docCategory} onChange={(e) => setDocCategory(e.target.value)} placeholder="Category" style={{ width: 140 }} />
          <input className="fs-input" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Link / reference (optional)" style={{ flex: 1 }} />
          <button className="fs-btn fs-btn-primary" onClick={addDocument}>Add</button>
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Lessons learned</p>
        <div className="fs-card" style={{ overflow: 'hidden' }}>
          {lessons.map((l) => (
            <div key={l.id} className="fs-listrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
              <div style={row}>
                <span style={{ fontSize: 11, color: 'var(--fs-slate)', width: 100 }}>{l.category || '—'}</span>
                <span style={{ flex: 1, fontSize: 14 }}>{l.observation}</span>
                <button className="fs-icon-btn" onClick={() => removeLesson(l.id)}>✕</button>
              </div>
              {l.recommendation && <div style={{ fontSize: 13, color: 'var(--fs-slate)', marginLeft: 108 }}>→ {l.recommendation}</div>}
            </div>
          ))}
          {lessons.length === 0 && <p style={{ color: 'var(--fs-slate)', fontSize: 13, padding: '14px', margin: 0 }}>No lessons logged yet.</p>}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={row}>
            <input className="fs-input" value={lessonCategory} onChange={(e) => setLessonCategory(e.target.value)} placeholder="Category" style={{ width: 140 }} />
            <input className="fs-input" value={lessonObservation} onChange={(e) => setLessonObservation(e.target.value)} placeholder="What happened" style={{ flex: 1 }} />
          </div>
          <div style={{ ...row, marginTop: 8 }}>
            <input className="fs-input" value={lessonRecommendation} onChange={(e) => setLessonRecommendation(e.target.value)} placeholder="Recommendation for next time" style={{ flex: 1 }} />
            <button className="fs-btn fs-btn-primary" onClick={addLesson}>Add</button>
          </div>
        </div>
      </section>
    </div>
  );
};

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };

export default PfClosureView;
