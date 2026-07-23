/**
 * FlowSpace — WBS Builder
 *
 * A dense, spreadsheet-style tree grid with fully INLINE editing - click
 * a name to rename it in place, click +WBS / +Task to add a child row you
 * type directly into. No browser prompt() / confirm() dialogs for the
 * common path; those popups are the single biggest "toy app" tell.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

interface ActivityNode {
  id: string;
  name: string;
  duration_days: string;
  status: string;
}

interface WbsNode {
  id: string;
  code: string;
  name: string;
  children: WbsNode[];
  activities: ActivityNode[];
}

const ICON_BTN: React.CSSProperties = {
  width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', borderRadius: 4, color: 'var(--fs-slate)',
};

const INLINE_INPUT: React.CSSProperties = {
  flex: 1, border: '1px solid var(--fs-teal)', borderRadius: 4, padding: '3px 8px',
  font: 'inherit', fontSize: 14, outline: 'none', background: '#fff', color: 'var(--fs-ink)',
};

type EditTarget = { id: string; kind: 'wbs' | 'activity' };
type AddTarget = { parentId: string; kind: 'wbs' | 'activity' };

const PfWbsBuilder = () => {
  const { projectId } = useParams();
  const [tree, setTree] = useState<WbsNode[]>([]);
  const [scopeStatement, setScopeStatement] = useState('');
  const [scopeSaved, setScopeSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRootName, setNewRootName] = useState('');

  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingUnder, setAddingUnder] = useState<AddTarget | null>(null);
  const [addValue, setAddValue] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const loadTree = useCallback(() => {
    if (!projectId) return;
    apiFetch(`/api/projects/engine/${projectId}/wbs`)
      .then((res) => setTree(res.data))
      .catch((err) => setError(err.message));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/projects/engine/${projectId}/wbs`),
      apiFetch(`/api/projects/engine/${projectId}/scope`),
    ])
      .then(([wbsRes, scopeRes]) => {
        setTree(wbsRes.data);
        setScopeStatement(scopeRes.data.scopeStatement || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { if (addingUnder) addInputRef.current?.focus(); }, [addingUnder]);

  // ── Inline rename ──
  const startEdit = (t: EditTarget, current: string) => { setEditing(t); setEditValue(current); };
  const commitEdit = async () => {
    if (!editing) return;
    const target = editing;
    const value = editValue.trim();
    setEditing(null);
    if (!value) return;
    const path = target.kind === 'wbs' ? `wbs/${target.id}` : `activities/${target.id}`;
    await apiFetch(`/api/projects/engine/${projectId}/${path}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: value }),
    });
    loadTree();
  };

  // ── Inline add ──
  const startAdd = (t: AddTarget) => { setAddingUnder(t); setAddValue(''); };
  const commitAdd = async () => {
    if (!addingUnder) return;
    const t = addingUnder;
    const value = addValue.trim();
    if (!value) { setAddingUnder(null); return; }
    if (t.kind === 'wbs') {
      await apiFetch(`/api/projects/engine/${projectId}/wbs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentId: t.parentId, name: value }),
      });
    } else {
      await apiFetch(`/api/projects/engine/${projectId}/wbs/${t.parentId}/activities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: value }),
      });
    }
    setAddingUnder(null); setAddValue(''); loadTree();
  };

  const addRoot = async () => {
    if (!newRootName.trim() || !projectId) return;
    await apiFetch(`/api/projects/engine/${projectId}/wbs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newRootName.trim() }),
    });
    setNewRootName('');
    loadTree();
  };

  const move = async (elementId: string, direction: 'up' | 'down' | 'indent' | 'outdent') => {
    await apiFetch(`/api/projects/engine/${projectId}/wbs/${elementId}/move`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction }),
    });
    loadTree();
  };

  const remove = async (elementId: string) => {
    if (!window.confirm('Delete this work package and everything under it?')) return;
    await apiFetch(`/api/projects/engine/${projectId}/wbs/${elementId}`, { method: 'DELETE' });
    loadTree();
  };

  const removeActivity = async (activityId: string) => {
    await apiFetch(`/api/projects/engine/${projectId}/activities/${activityId}`, { method: 'DELETE' });
    loadTree();
  };

  const saveScope = async () => {
    await apiFetch(`/api/projects/engine/${projectId}/scope`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scopeStatement }),
    });
    setScopeSaved(true);
  };

  const addRow = (kind: 'wbs' | 'activity', indentPx: number) => (
    <div className="wbs-row" style={{ paddingLeft: indentPx, background: kind === 'activity' ? 'var(--fs-cream)' : 'transparent' }}>
      <span style={{ minWidth: 44 }} />
      <input
        ref={addInputRef}
        style={INLINE_INPUT}
        value={addValue}
        onChange={(e) => setAddValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setAddingUnder(null); }}
        onBlur={commitAdd}
        placeholder={kind === 'wbs' ? 'Work package name…' : 'Task name…'}
      />
    </div>
  );

  const renderNode = (node: WbsNode, depth: number) => {
    const isEditing = editing?.kind === 'wbs' && editing.id === node.id;
    return (
      <div key={node.id}>
        <div className="wbs-row" style={{ paddingLeft: 14 + depth * 22 }}>
          <span style={{ fontFamily: 'var(--fs-font-mono)', fontSize: 12, color: 'var(--fs-teal)', minWidth: 44 }}>{node.code}</span>
          {isEditing ? (
            <input
              autoFocus
              style={INLINE_INPUT}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
              onBlur={commitEdit}
            />
          ) : (
            <span style={{ flex: 1, fontSize: 14, cursor: 'text', fontWeight: 600 }} onClick={() => startEdit({ id: node.id, kind: 'wbs' }, node.name)} title="Click to rename">{node.name}</span>
          )}
          <div className="wbs-actions" style={{ display: 'flex', gap: 2 }}>
            <button style={ICON_BTN} onClick={() => move(node.id, 'up')} title="Move up">↑</button>
            <button style={ICON_BTN} onClick={() => move(node.id, 'down')} title="Move down">↓</button>
            <button style={ICON_BTN} onClick={() => move(node.id, 'outdent')} title="Outdent">⇤</button>
            <button style={ICON_BTN} onClick={() => move(node.id, 'indent')} title="Indent">⇥</button>
            <button style={{ ...ICON_BTN, width: 'auto', padding: '0 6px', color: 'var(--fs-teal)', fontWeight: 600 }} onClick={() => startAdd({ parentId: node.id, kind: 'wbs' })} title="Add child work package">+WBS</button>
            <button style={{ ...ICON_BTN, width: 'auto', padding: '0 6px', color: 'var(--fs-teal)', fontWeight: 600 }} onClick={() => startAdd({ parentId: node.id, kind: 'activity' })} title="Add task">+Task</button>
            <button style={{ ...ICON_BTN, color: '#B04A43' }} onClick={() => remove(node.id)} title="Delete">✕</button>
          </div>
        </div>

        {node.activities.map((activity) => {
          const isActEditing = editing?.kind === 'activity' && editing.id === activity.id;
          return (
            <div key={activity.id} className="wbs-row" style={{ paddingLeft: 14 + (depth + 1) * 22, background: 'var(--fs-cream)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#8A6416', background: '#FBF3E4', borderRadius: 4, padding: '2px 6px', minWidth: 32, textAlign: 'center' }}>TASK</span>
              {isActEditing ? (
                <input
                  autoFocus
                  style={INLINE_INPUT}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                  onBlur={commitEdit}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 13, color: 'var(--fs-ink)', cursor: 'text' }} onClick={() => startEdit({ id: activity.id, kind: 'activity' }, activity.name)} title="Click to rename">
                  {activity.name} <span style={{ fontSize: 11, color: 'var(--fs-slate)' }}>· {activity.duration_days}d · {activity.status}</span>
                </span>
              )}
              <div className="wbs-actions">
                <button style={{ ...ICON_BTN, color: '#B04A43' }} onClick={() => removeActivity(activity.id)} title="Delete">✕</button>
              </div>
            </div>
          );
        })}

        {addingUnder?.kind === 'activity' && addingUnder.parentId === node.id && addRow('activity', 14 + (depth + 1) * 22)}

        {node.children.map((child) => renderNode(child, depth + 1))}

        {addingUnder?.kind === 'wbs' && addingUnder.parentId === node.id && addRow('wbs', 14 + (depth + 1) * 22)}
      </div>
    );
  };

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;
  if (loading) return <div style={{ padding: 48 }}>Loading WBS…</div>;
  if (error) return <div style={{ padding: 48, color: 'crimson' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <style>{`
        .wbs-row { display: flex; align-items: center; gap: 6px; padding: 8px 12px 8px 0; border-bottom: 1px solid var(--fs-line); }
        .wbs-row .wbs-actions { opacity: 0; transition: opacity 0.1s ease; }
        .wbs-row:hover { background: #FbFcFb; }
        .wbs-row:hover .wbs-actions { opacity: 1; }
      `}</style>

      <section style={{ marginBottom: 28 }}>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Scope statement</p>
        <textarea
          className="fs-input"
          value={scopeStatement}
          onChange={(e) => { setScopeStatement(e.target.value); setScopeSaved(false); }}
          rows={3}
          style={{ width: '100%', fontFamily: 'var(--fs-font-sans)', resize: 'vertical', boxSizing: 'border-box' }}
          placeholder="What must be done?"
        />
        <div style={{ marginTop: 8 }}>
          <button className="fs-btn fs-btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={saveScope} disabled={scopeSaved}>
            {scopeSaved ? 'Saved' : 'Save scope statement'}
          </button>
        </div>
      </section>

      <section>
        <p className="fs-page-eyebrow" style={{ marginBottom: 10 }}>Work breakdown structure</p>
        <p style={{ fontSize: 12, color: 'var(--fs-slate)', marginTop: 0, marginBottom: 10 }}>Click any name to rename it. Use +WBS / +Task on a row to add children.</p>
        <div className="fs-card" style={{ overflow: 'hidden' }}>
          {tree.length === 0 && <p style={{ color: 'var(--fs-slate)', fontSize: 13, padding: '20px 14px', margin: 0 }}>No work packages yet — add your first below.</p>}
          {tree.map((node) => renderNode(node, 0))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input
            className="fs-input"
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            placeholder="New top-level work package"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && addRoot()}
          />
          <button className="fs-btn fs-btn-primary" onClick={addRoot}>+ Add</button>
        </div>
      </section>
    </div>
  );
};

export default PfWbsBuilder;
