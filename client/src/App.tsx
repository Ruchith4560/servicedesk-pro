import { Activity, ShieldCheck, Cpu, Layers } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-500/10 p-2 rounded-lg border border-sky-500/20 text-sky-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2">
              ServiceDesk <span className="text-sky-400 font-bold">PRO</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">v1.0-alpha</span>
            </h1>
            <p className="text-xs text-slate-400">AI-Powered IT Service Management & Asset Intelligence</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Platform Active</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-1 w-full flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 mb-6 font-mono">
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span>Multi-Runtime Architecture: Node.js Core API + FastAPI AI Service</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Enterprise Operations Intelligence, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            Grounded in Approved Knowledge.
          </span>
        </h2>
        <p className="max-w-2xl text-slate-400 text-base mb-10 leading-relaxed">
          ServiceDesk Pro bridges incoming employee tickets, strict SLA management, hardware/software asset history, 
          and Qdrant-backed RAG recommendations into an auditable human-in-the-loop operational cockpit.
        </p>

        {/* Feature Grid Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="text-sky-400 mb-3"><ShieldCheck className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">Server-Enforced RBAC</h3>
            <p className="text-xs text-slate-400 leading-relaxed">5 discrete operational roles with strict department scoping and ownership checks.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="text-indigo-400 mb-3"><Activity className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">Deterministic SLA Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Business-hour timers, auto-escalation, and pause-on-waiting state machine protection.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="text-emerald-400 mb-3"><Cpu className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">Evidence-Grounded RAG</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Restricted vector search with citations back to approved IT documentation.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        ServiceDesk Pro &copy; 2026 | Built for Mission-Critical IT Support & Engineering Excellence
      </footer>
    </div>
  );
}
