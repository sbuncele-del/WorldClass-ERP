/**
 * Onboarding Checklist Widget
 * Shows setup progress for new accounts in the dashboard.
 * Auto-fetches from /api/onboarding/checklist and hides
 * itself once all tasks are complete.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import './OnboardingChecklist.css';

interface ChecklistTask {
  id: string;
  task_key: string;
  task_label: string;
  task_url: string | null;
  task_icon: string;
  completed: boolean;
  completed_at: string | null;
}

const ICON_MAP: Record<string, string> = {
  mail:         '✉️',
  building:     '🏢',
  users:        '👥',
  'credit-card':'💳',
  'file-text':  '🧾',
  'user-plus':  '🤝',
  package:      '📦',
  'bar-chart-2':'📊',
  'pie-chart':  '📈',
  'dollar-sign':'💰',
};

const DISMISS_KEY = 'siyabusa_checklist_dismissed';

const OnboardingChecklist = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const res = await apiClient.get('/api/onboarding/checklist');
        if (res.data?.tasks) {
          setTasks(res.data.tasks);
        }
      } catch {
        // Silently fail — widget is not critical
      } finally {
        setLoading(false);
      }
    };
    fetchChecklist();
  }, []);

  if (loading || dismissed) return null;

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total && total > 0;

  // Don't render if no tasks loaded
  if (total === 0) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  const handleTaskClick = (url: string | null) => {
    if (url) navigate(url);
  };

  return (
    <div className={`oc-widget${collapsed ? ' oc-widget--collapsed' : ''}`}>
      {/* Header */}
      <div className="oc-header" onClick={() => setCollapsed((c) => !c)}>
        <div className="oc-header__left">
          <div className="oc-progress-ring">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#e9d5ff" strokeWidth="4" />
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - percent / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <span className="oc-progress-pct">{percent}%</span>
          </div>
          <div className="oc-header__text">
            <h3 className="oc-title">
              {allDone ? '🎉 Setup complete!' : 'Get started checklist'}
            </h3>
            <p className="oc-subtitle">
              {allDone
                ? 'Your account is fully configured.'
                : `${completed} of ${total} tasks completed`}
            </p>
          </div>
        </div>
        <div className="oc-header__right">
          <button
            className="oc-btn-icon"
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            title="Dismiss checklist"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <svg
            className="oc-chevron"
            width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d={collapsed
              ? 'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
              : 'M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z'
            } clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Progress bar */}
      {!collapsed && (
        <div className="oc-progress-bar">
          <div className="oc-progress-bar__fill" style={{ width: `${percent}%` }} />
        </div>
      )}

      {/* Tasks */}
      {!collapsed && (
        <ul className="oc-tasks">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`oc-task${task.completed ? ' oc-task--done' : ''}${task.task_url ? ' oc-task--clickable' : ''}`}
              onClick={() => !task.completed && handleTaskClick(task.task_url)}
            >
              <span className="oc-task__icon">{ICON_MAP[task.task_icon] || '📌'}</span>
              <span className="oc-task__label">{task.task_label}</span>
              <span className="oc-task__status">
                {task.completed ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="#10b981">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#8B5CF6">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OnboardingChecklist;
