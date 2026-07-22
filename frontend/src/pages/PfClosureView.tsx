/**
 * FlowSpace PM Engine — Reviews & Closure (Phase 6)
 *
 * Fills in the lifecycle's second soft gate: closing to "close" now
 * requires every checklist item complete plus a recorded closure outcome
 * (completed / terminated / cancelled) - a project must close one way
 * or another, not only when it succeeds.
 *
 * Internal preview, not linked from the main nav yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', maxWidth: 1000 }}>
      <p><Link to={`/app/projects/engine-preview/${projectId}`}>← back to engine preview</Link></p>
      <h1>Reviews &amp; Closure</h1>
      {error && <div style={{ background: '#f3ebda', border: '1px solid #d8dedf', borderRadius: 8, padding: 16, color: '#a5721a' }}>{error}</div>}

      <div style={{
        margin: '20px 0', padding: '10px 16px', borderRadius: 8, display: 'inline-block',
        background: gateReady ? '#e4f0ec' : '#f3ebda', color: gateReady ? '#2c6e49' : '#a5721a', fontSize: 13,
      }}>
        {gateReady ? 'Closure gate satisfied — the project can transition to "close".' : 'Closure gate not yet satisfied — complete the checklist and record an outcome.'}
      </div>

      <section style={{ margin: '24px 0' }}>
        <h3>Closure checklist</h3>
        {checklist.map((item) => (
          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #e6eaeb', cursor: 'pointer' }}>
            <input type="checkbox" checked={item.is_complete} onChange={() => toggleItem(item)} />
            <span style={{ fontSize: 11, color: '#737c7e', textTransform: 'uppercase', width: 110 }}>{item.category.replace('_', ' ')}</span>
            <span style={{ flex: 1, textDecoration: item.is_complete ? 'line-through' : 'none', color: item.is_complete ? '#737c7e' : '#15191c' }}>{item.label}</span>
          </label>
        ))}
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Closure outcome</h3>
        <p style={{ fontSize: 13, color: '#737c7e' }}>Every project must close one way or another — completed, terminated, or cancelled.</p>
        <div style={row}>
          {(['completed', 'terminated', 'cancelled'] as const).map((o) => (
            <button key={o} onClick={() => setOutcomeValue(o)} style={{
              ...btn, padding: '8px 16px',
              background: outcome === o ? '#0c5f53' : 'transparent', color: outcome === o ? '#fff' : '#15191c',
              border: `1px solid ${outcome === o ? '#0c5f53' : '#d8dedf'}`, borderRadius: 6,
            }}>{OUTCOME_LABEL[o]}</button>
          ))}
        </div>
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Document repository</h3>
        {documents.map((d) => (
          <div key={d.id} style={{ ...row, borderBottom: '1px solid #e6eaeb', padding: '6px 0' }}>
            <span style={{ fontSize: 11, color: '#737c7e', width: 100 }}>{d.category || '—'}</span>
            {d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>{d.title}</a> : <span style={{ flex: 1 }}>{d.title}</span>}
            <button style={{ ...btn, color: '#a23b27' }} onClick={() => removeDocument(d.id)}>Remove</button>
          </div>
        ))}
        <div style={{ ...row, marginTop: 12 }}>
          <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Document title" style={{ flex: 1, padding: 6 }} />
          <input value={docCategory} onChange={(e) => setDocCategory(e.target.value)} placeholder="Category" style={{ width: 140, padding: 6 }} />
          <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Link / reference (optional)" style={{ flex: 1, padding: 6 }} />
          <button style={btn} onClick={addDocument}>Add</button>
        </div>
      </section>

      <section style={{ margin: '24px 0' }}>
        <h3>Lessons learned</h3>
        {lessons.map((l) => (
          <div key={l.id} style={{ borderBottom: '1px solid #e6eaeb', padding: '8px 0' }}>
            <div style={row}>
              <span style={{ fontSize: 11, color: '#737c7e', width: 100 }}>{l.category || '—'}</span>
              <span style={{ flex: 1 }}>{l.observation}</span>
              <button style={{ ...btn, color: '#a23b27' }} onClick={() => removeLesson(l.id)}>Remove</button>
            </div>
            {l.recommendation && <div style={{ fontSize: 13, color: '#4b5457', marginLeft: 108 }}>→ {l.recommendation}</div>}
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <div style={row}>
            <input value={lessonCategory} onChange={(e) => setLessonCategory(e.target.value)} placeholder="Category" style={{ width: 140, padding: 6 }} />
            <input value={lessonObservation} onChange={(e) => setLessonObservation(e.target.value)} placeholder="What happened" style={{ flex: 1, padding: 6 }} />
          </div>
          <div style={{ ...row, marginTop: 8 }}>
            <input value={lessonRecommendation} onChange={(e) => setLessonRecommendation(e.target.value)} placeholder="Recommendation for next time" style={{ flex: 1, padding: 6 }} />
            <button style={btn} onClick={addLesson}>Add</button>
          </div>
        </div>
      </section>
    </div>
  );
};

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const btn: React.CSSProperties = { fontSize: 12, padding: '4px 10px', cursor: 'pointer' };

export default PfClosureView;
