import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';
import { Layers, UserCheck, LogOut, Ticket as TicketIcon, BarChart3, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge.js';
import { NotificationBell } from './NotificationBell.js';

export const Navbar: React.FC = () => {
  const { user, logout, login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDemoSwitch = async (email: string) => {
    try {
      await login(email, 'Password123!');
    } catch {
      // Handle switch error gracefully
    }
  };

  const canViewAudit = user?.role === 'SYSTEM_ADMIN' || user?.role === 'IT_MANAGER';

  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
      {/* Brand & Nav */}
      <div className="flex items-center space-x-6">
        <div
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="bg-sky-500/10 p-2 rounded-lg border border-sky-500/20 text-sky-400 group-hover:border-sky-500/40 transition">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight flex items-center gap-1.5">
              ServiceDesk <span className="text-sky-400 font-bold">PRO</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                HERO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">ITSM & Asset Intelligence Platform</p>
          </div>
        </div>

        <nav className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/tickets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              location.pathname.startsWith('/tickets')
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TicketIcon className="w-3.5 h-3.5" />
            <span>Tickets Queue</span>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              location.pathname === '/analytics'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics & KPIs</span>
          </button>

          {canViewAudit && (
            <button
              onClick={() => navigate('/audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                location.pathname === '/audit'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          )}
        </nav>
      </div>

      {/* User Actions & Persona Switcher */}
      <div className="flex items-center space-x-4">
        {/* Quick Persona Switcher for Demos */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-[10px] text-slate-500 font-mono px-2 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> DEMO:
          </span>
          <button
            onClick={() => handleDemoSwitch('admin@servicedesk.local')}
            className={`px-2 py-1 rounded text-[11px] transition ${
              user?.role === 'SYSTEM_ADMIN'
                ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleDemoSwitch('manager@servicedesk.local')}
            className={`px-2 py-1 rounded text-[11px] transition ${
              user?.role === 'IT_MANAGER'
                ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => handleDemoSwitch('tech@servicedesk.local')}
            className={`px-2 py-1 rounded text-[11px] transition ${
              user?.role === 'TECHNICIAN'
                ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Technician
          </button>
          <button
            onClick={() => handleDemoSwitch('employee@servicedesk.local')}
            className={`px-2 py-1 rounded text-[11px] transition ${
              user?.role === 'EMPLOYEE'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Employee
          </button>
        </div>

        {/* Notification Center */}
        <NotificationBell />

        {/* Current User Profile */}
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200">{user.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1.5">
                <span>{user.department}</span>
                <Badge variant="status" value={user.role} size="sm" />
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
