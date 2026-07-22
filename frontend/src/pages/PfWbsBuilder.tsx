/**
 * FlowSpace PM Engine — WBS Builder (Phase 1)
 *
 * Internal preview, not linked from the main nav yet (see productShells /
 * coexistence strategy in the FlowSpace build plan). Functional over
 * polished - this proves the WBS/activity CRUD + auto-numbering work
 * end-to-end against real data before Phase 2 builds the CPM engine on top.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

const PfWbsBuilder = () => {
  const { projectId } = useParams();
  const [tree, setTree] = useState<WbsNode[]>([]);
  const [scopeStatement, setScopeStatement] = useState('');
  const [scopeSaved, setScopeSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRootName, setNewRootName] = useState('');

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

  const addRoot = async () => {
    if (!newRootName.trim() || !projectId) return;
    await apiFetch(`/api/projects/engine/${projectId}/wbs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRootName.trim() }),
    });
    setNewRootName('');
    loadTree();
  };

  const addChild = async (parentId: string) => {
    const name = window.prompt('New work package name:');
    if (!name?.trim() || !projectId) return;
    await apiFetch(`/api/projects/engine/${projectId}/wbs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, name: name.trim() }),
    });
    loadTree();
  };

  const addActivity = async (elementId: string) => {
    const name = window.prompt('New activity name:');
    if (!name?.trim() || !projectId) return;
    await apiFetch(`/api/projects/engine/${projectId}/wbs/${elementId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    loadTree();
  };

  const rename = async (elementId: string, currentName: string) => {
    const name = window.prompt('Rename work package:', currentName);
    if (!name?.trim() || name === currentName) return;
    await apiFetch(`/api/projects/engine/${projectId}/wbs/${elementId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    loadTree();
  };

  const move = async (elementId: string, direction: 'up' | 'down' | 'indent' | 'outdent') => {
    await apiFetch(`/api/projects/engine/${projectId}/wbs/${elementId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    loadTree();
  };

  const remove = async (elementId: string) => {
    if (!window.confirm('Delete this work package and everything under it?')) return;
    await apiFetch(`/api/projects/engine/${projectId}/wbs/${elementId}`, { method: 'DELETE' });
    loadTree();
  };

  const removeActivity = async (activityId: string) => {
    if (!window.confirm('Delete this activity?')) return;
    await apiFetch(`/api/projects/engine/${projectId}/activities/${activityId}`, { method: 'DELETE' });
    loadTree();
  };

  const saveScope = async () => {
    await apiFetch(`/api/projects/engine/${projectId}/scope`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeStatement }),
    });
    setScopeSaved(true);
  };

  const renderNode = (node: WbsNode, depth: number) => (
    <div key={node.id} style={{ marginLeft: depth * 28 }}>
      <div style={row}>
        <span style={code}>{node.code}</span>
        <span style={{ flex: 1 }}>{node.name}</span>
        <button style={btn} onClick={() => move(node.id, 'up')} title="Move up">↑</button>
        <button style={btn} onClick={() => move(node.id, 'down')} title="Move down">↓</button>
        <button style={btn} onClick={() => move(node.id, 'outdent')} title="Outdent">⇤</button>
        <button style={btn} onClick={() => move(node.id, 'indent')} title="Indent">⇥</button>
        <button style={btn} onClick={() => rename(node.id, node.name)} title="Rename">✎</button>
        <button style={btn} onClick={() => addChild(node.id)} title="Add child work package">+ WBS</button>
        <button style={btn} onClick={() => addActivity(node.id)} title="Add activity">+ Activity</button>
        <button style={{ ...btn, color: '#a23b27' }} onClick={() => remove(node.id)} title="Delete">×</button>
      </div>

      {node.activities.map((activity) => (
        <div key={activity.id} style={{ ...row, marginLeft: 28, color: '#4b5457' }}>
          <span style={{ ...code, color: '#a5721a' }}>ACT</span>
          <span style={{ flex: 1 }}>{activity.name} <em style={{ fontSize: 12 }}>({activity.duration_days}d, {activity.status})</em></span>
          <button style={{ ...btn, color: '#a23b27' }} onClick={() => removeActivity(activity.id)}>×</button>
        </div>
      ))}

      {node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;
  if (loading) return <div style={{ padding: 48 }}>Loading WBS…</div>;
  if (error) return <div style={{ padding: 48, color: 'crimson' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', maxWidth: 900 }}>
      <p><Link to={`/app/projects/engine-preview/${projectId}`}>← back to engine preview</Link></p>
      <h1>Work Breakdown Structure</h1>

      <section style={{ margin: '24px 0' }}>
        <h3>Scope statement</h3>
        <textarea
          value={scopeStatement}
          onChange={(e) => { setScopeStatement(e.target.value); setScopeSaved(false); }}
          rows={3}
          style={{ width: '100%', fontFamily: 'inherit', padding: 8 }}
          placeholder="What must be done?"
        />
        <button style={btn} onClick={saveScope} disabled={scopeSaved}>
          {scopeSaved ? 'Saved' : 'Save scope statement'}
        </button>
      </section>

      <section>
        <h3>Structure</h3>
        {tree.length === 0 && <p style={{ color: '#4b5457' }}>No work packages yet.</p>}
        {tree.map((node) => renderNode(node, 0))}

        <div style={{ ...row, marginTop: 16 }}>
          <input
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            placeholder="New top-level work package"
            style={{ flex: 1, padding: 6 }}
            onKeyDown={(e) => e.key === 'Enter' && addRoot()}
          />
          <button style={btn} onClick={addRoot}>+ Add</button>
        </div>
      </section>
    </div>
  );
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 0',
  borderBottom: '1px solid #e6eaeb',
};

const code: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#0c5f53',
  minWidth: 40,
};

const btn: React.CSSProperties = {
  fontSize: 12,
  padding: '2px 8px',
  cursor: 'pointer',
};

export default PfWbsBuilder;
