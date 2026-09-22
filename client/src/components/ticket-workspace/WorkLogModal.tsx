import React, { useState } from 'react';
import { WorkLogActivity } from '../../types/index.js';
import { Modal } from '../common/Modal.js';
import { Clock } from 'lucide-react';

interface WorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    timeSpentMinutes: number;
    activityType: WorkLogActivity;
    description: string;
  }) => Promise<void>;
}

const ACTIVITIES: { value: WorkLogActivity; label: string }[] = [
  { value: 'DIAGNOSTICS', label: 'Diagnostics & Triage' },
  { value: 'HARDWARE_REPAIR', label: 'Hardware Repair / Replacement' },
  { value: 'SOFTWARE_INSTALL', label: 'Software Configuration / Patching' },
  { value: 'NETWORK_CONFIG', label: 'Network & Gateway Config' },
  { value: 'COMMUNICATION', label: 'User / Customer Consultation' },
  { value: 'VENDOR_SUPPORT', label: 'Vendor Escalation & RMA' },
  { value: 'RESEARCH', label: 'Knowledge Base Research & Runbook' },
  { value: 'OTHER', label: 'Other Support Activity' }
];

export const WorkLogModal: React.FC<WorkLogModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [minutes, setMinutes] = useState<number>(30);
  const [activityType, setActivityType] = useState<WorkLogActivity>('DIAGNOSTICS');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || minutes <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        timeSpentMinutes: Number(minutes),
        activityType,
        description: description.trim()
      });
      onClose();
      setDescription('');
      setMinutes(30);
    } catch (err: any) {
      alert(err.message || 'Failed to log work entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addQuickMinutes = (mins: number) => {
    setMinutes((prev) => Math.max(1, prev + mins));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Technician Work Time"
      subtitle="Logs engineering effort to ticket timeline and operational billing records."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Time spent input & quick chips */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Time Spent (Minutes) <span className="text-rose-400">*</span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={1}
              max={1440}
              required
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-32 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono font-bold focus:outline-none focus:border-sky-500"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => addQuickMinutes(15)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px]"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => addQuickMinutes(30)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px]"
              >
                +30m
              </button>
              <button
                type="button"
                onClick={() => addQuickMinutes(60)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px]"
              >
                +1h
              </button>
            </div>
          </div>
        </div>

        {/* Activity Selector */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Activity Category</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as WorkLogActivity)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {ACTIVITIES.map((act) => (
              <option key={act.value} value={act.value}>
                {act.label}
              </option>
            ))}
          </select>
        </div>

        {/* Work description */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Work Summary <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of troubleshooting performed, patches applied, or hardware replaced..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-white transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Record Work Log'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
