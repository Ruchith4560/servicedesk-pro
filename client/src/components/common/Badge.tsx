import React from 'react';
import { TicketPriority, TicketStatus, RiskLevel, TicketCategory } from '../../types/index.js';

interface BadgeProps {
  variant?: 'priority' | 'status' | 'risk' | 'category' | 'assetStatus' | 'default';
  value: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', value, size = 'sm', pulse = false }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (variant === 'priority') {
    switch (value as TicketPriority) {
      case 'CRITICAL':
        colorClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        break;
      case 'HIGH':
        colorClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        break;
      case 'MEDIUM':
        colorClasses = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
        break;
      case 'LOW':
        colorClasses = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
        break;
    }
  } else if (variant === 'status') {
    switch (value as TicketStatus) {
      case 'OPEN':
        colorClasses = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
        break;
      case 'TRIAGED':
        colorClasses = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
        break;
      case 'ASSIGNED':
        colorClasses = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
        break;
      case 'IN_PROGRESS':
        colorClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        break;
      case 'WAITING':
        colorClasses = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
        break;
      case 'RESOLVED':
        colorClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        break;
      case 'CLOSED':
        colorClasses = 'bg-slate-700/30 text-slate-400 border-slate-700';
        break;
      case 'REOPENED':
        colorClasses = 'bg-red-500/15 text-red-400 border-red-500/30';
        break;
    }
  } else if (variant === 'risk') {
    switch (value as RiskLevel) {
      case 'CRITICAL':
        colorClasses = 'bg-rose-600/20 text-rose-300 border-rose-500/40';
        break;
      case 'HIGH':
        colorClasses = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
        break;
      case 'MEDIUM':
        colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
        break;
      case 'LOW':
        colorClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        break;
    }
  } else if (variant === 'category') {
    switch (value as TicketCategory) {
      case 'SECURITY':
        colorClasses = 'bg-red-500/15 text-red-400 border-red-500/30';
        break;
      case 'NETWORK':
        colorClasses = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
        break;
      case 'HARDWARE':
        colorClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        break;
      case 'ACCESS_IAM':
        colorClasses = 'bg-violet-500/15 text-violet-400 border-violet-500/30';
        break;
      case 'SOFTWARE':
        colorClasses = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-wider ${sizeClasses} ${colorClasses}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {value.replace('_', ' ')}
    </span>
  );
};
