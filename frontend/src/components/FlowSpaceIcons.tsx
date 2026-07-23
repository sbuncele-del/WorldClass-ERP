/**
 * FlowSpace icon set — inline stroke SVGs so the app doesn't pull in an
 * icon library and the nav rail reads as software, not unicode glyphs.
 */

interface IconProps { size?: number; }

const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const DashboardIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
);

export const ProjectsIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);

export const TeamIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.9" /><path d="M18 20a6 6 0 0 0-3-5.2" /></svg>
);

export const SearchIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);

export const PlusIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);

export const ChevronRight = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="m9 6 6 6-6 6" /></svg>
);
