import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import { Layers, UserCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/tickets');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setIsLoading(true);
    setError(null);
    try {
      await login(demoEmail, 'Password123!');
      navigate('/tickets');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-2">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            ServiceDesk <span className="text-sky-400">PRO</span>
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access the AI-Powered IT Operations Cockpit
          </p>
        </div>

        {/* Demo Personas Quick Select */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-sky-400">
              <UserCheck className="w-3.5 h-3.5" /> 1-CLICK DEMO PERSONAS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('tech@servicedesk.local')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/30 text-left transition"
            >
              <div className="font-semibold text-slate-200">Senior Technician</div>
              <div className="text-[10px] text-sky-400 font-mono">tech@servicedesk.local</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager@servicedesk.local')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/30 text-left transition"
            >
              <div className="font-semibold text-slate-200">IT Manager</div>
              <div className="text-[10px] text-purple-400 font-mono">manager@servicedesk.local</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@servicedesk.local')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/30 text-left transition"
            >
              <div className="font-semibold text-slate-200">System Admin</div>
              <div className="text-[10px] text-rose-400 font-mono">admin@servicedesk.local</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('employee@servicedesk.local')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-left transition"
            >
              <div className="font-semibold text-slate-200">End User Employee</div>
              <div className="text-[10px] text-emerald-400 font-mono">employee@servicedesk.local</div>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-sky-950 disabled:bg-slate-800"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
