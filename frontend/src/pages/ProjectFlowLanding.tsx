/**
 * ProjectFlow Landing Page
 * Standalone marketing page for the ProjectFlow product shell.
 * Deliberately does not reuse SiyaBusa ERP's branding/colours.
 */

import { Link } from 'react-router-dom';
import './ProjectFlowLanding.css';

const FEATURES = [
  {
    label: 'PLAN',
    title: 'Tasks board',
    description: 'Kanban-style boards to track work from backlog to done, per project or per team.',
  },
  {
    label: 'SCHEDULE',
    title: 'Gantt view',
    description: 'See every project timeline at a glance — dependencies, overlaps, and slack all in one view.',
  },
  {
    label: 'TRACK',
    title: 'Milestones',
    description: 'Mark the dates that matter and know instantly when a project is drifting off course.',
  },
  {
    label: 'LOG',
    title: 'Time tracking',
    description: 'Capture hours against tasks and projects — the record you need for billing or reporting.',
  },
  {
    label: 'REUSE',
    title: 'Project templates',
    description: "Turn your best-run project into a template so the next one starts from what already works.",
  },
  {
    label: 'REPORT',
    title: 'Progress dashboards',
    description: 'Budget, spend, and progress rolled up per project — no spreadsheet required.',
  },
];

const ProjectFlowLanding = () => {
  return (
    <div className="pf-landing">
      <header className="pf-header">
        <div className="pf-header-inner">
          <span className="pf-wordmark">ProjectFlow</span>
          <nav className="pf-nav">
            <Link to="/login" className="pf-nav-link">Sign in</Link>
            <Link to="/signup" className="pf-nav-cta">Get started</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="pf-hero">
          <p className="pf-eyebrow">PROJECT MANAGEMENT</p>
          <h1 className="pf-headline">Run projects without the spreadsheet chaos.</h1>
          <p className="pf-subhead">
            Tasks, timelines, milestones, and time tracking in one focused tool.
            No setup wizard, no modules you'll never touch.
          </p>
          <div className="pf-hero-actions">
            <Link to="/signup" className="pf-cta-primary">Start free — no credit card</Link>
            <Link to="/login" className="pf-cta-secondary">Sign in</Link>
          </div>
        </section>

        <section className="pf-features">
          <div className="pf-features-grid">
            {FEATURES.map((feature) => (
              <div className="pf-feature-card" key={feature.title}>
                <p className="pf-feature-label">{feature.label}</p>
                <h3 className="pf-feature-title">{feature.title}</h3>
                <p className="pf-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pf-upgrade-note">
          <p>
            Outgrowing a single tool? ProjectFlow runs on the same platform as{' '}
            <a href="https://siyabusaerp.co.za" target="_blank" rel="noopener noreferrer">
              SiyaBusa ERP
            </a>{' '}
            — upgrading to the full business platform never means starting over.
          </p>
        </section>
      </main>

      <footer className="pf-footer">
        <span>© {new Date().getFullYear()} ProjectFlow</span>
        <div className="pf-footer-links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
      </footer>
    </div>
  );
};

export default ProjectFlowLanding;
