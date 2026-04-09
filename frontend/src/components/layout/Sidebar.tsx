import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, GitBranch, Settings, Hammer } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analysis', icon: Shield, label: 'Analysis' },
  { to: '/pipelines', icon: GitBranch, label: 'Pipelines' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-bg-secondary border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Hammer className="w-6 h-6 text-accent" />
          <span className="text-lg font-bold text-text-primary">CodeForge</span>
        </div>
        <p className="text-xs text-text-muted mt-1">Developer Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-text-muted">v0.1.0</p>
      </div>
    </aside>
  );
}
