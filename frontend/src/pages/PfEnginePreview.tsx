/**
 * ProjectFlow PM Engine — internal preview shell (Phase 0)
 *
 * Not linked from any nav. Exists to prove the engine's routes/lifecycle
 * plumbing work end-to-end before Phase 1+ build real screens here.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const PfEnginePreview = () => {
  const { projectId } = useParams();
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    apiFetch(`/api/projects/engine/${projectId}/lifecycle`)
      .then((res) => setPhase(res.data.phase))
      .catch((err) => setError(err.message));
  }, [projectId]);

  return (
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif' }}>
      <h1>ProjectFlow PM Engine — Preview</h1>
      <p>Internal scaffold. Not part of the live Projects experience yet.</p>
      {!projectId && <p>Pass a project id: <code>/app/projects/engine-preview/:projectId</code></p>}
      {projectId && !phase && !error && <p>Loading lifecycle phase…</p>}
      {phase && <p>Lifecycle phase: <strong>{phase}</strong></p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/wbs`}>Open WBS builder →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/schedule`}>Open Schedule (Gantt/Network) →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/resources`}>Open Resources, Cost & Baseline →</Link></p>}
      {projectId && <p><Link to={`/app/projects/engine-preview/${projectId}/eva`}>Open Earned Value & Change Control →</Link></p>}
    </div>
  );
};

export default PfEnginePreview;
