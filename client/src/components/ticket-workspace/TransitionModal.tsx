import React, { useState } from 'react';
import { TicketStatus } from '../../types/index.js';
import { Modal } from '../common/Modal.js';

interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStatus: TicketStatus | null;
  onSubmit: (data: {
    targetStatus: TicketStatus;
    waitingReason?: string;
    resolutionSummary?: string;
    rootCause?: string;
    reopenReason?: string;
  }) => Promise<void>;
}

export const TransitionModal: React.FC<TransitionModalProps> = ({
  isOpen,
  onClose,
  targetStatus,
  onSubmit
}) => {
  const [waitingReason, setWaitingReason] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!targetStatus) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        targetStatus,
        waitingReason: targetStatus === 'WAITING' ? waitingReason : undefined,
        resolutionSummary: targetStatus === 'RESOLVED' ? resolutionSummary : undefined,
        rootCause: targetStatus === 'RESOLVED' ? rootCause : undefined,
        reopenReason: targetStatus === 'REOPENED' ? reopenReason : undefined
      });
      onClose();
      // Reset form
      setWaitingReason('');
      setResolutionSummary('');
      setRootCause('');
      setReopenReason('');
    } catch (err: any) {
      alert(err.message || 'Transition submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (targetStatus) {
      case 'WAITING':
        return 'Pause Ticket (Waiting on User / Vendor)';
      case 'RESOLVED':
        return 'Resolve Incident';
      case 'REOPENED':
        return 'Reopen Incident';
      default:
        return `Transition to ${targetStatus}`;
    }
  };

  const getSubtitle = () => {
    switch (targetStatus) {
      case 'WAITING':
        return 'Pauses the SLA resolution timer until work resumes.';
      case 'RESOLVED':
        return 'Mandatory resolution record is saved to the audit ledger.';
      case 'REOPENED':
        return 'Requires justification for reopening a previously resolved ticket.';
      default:
        return 'Update ticket workflow state';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} subtitle={getSubtitle()}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {targetStatus === 'WAITING' && (
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Reason for Waiting <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={waitingReason}
              onChange={(e) => setWaitingReason(e.target.value)}
              placeholder="e.g. Waiting for user to test new VPN credentials, or waiting for replacement motherboard from vendor..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {targetStatus === 'RESOLVED' && (
          <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Resolution Summary <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="Explain the technical fix applied and steps taken to restore service..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Root Cause Classification (Optional)
              </label>
              <input
                type="text"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="e.g. Expired SSL certificate, Corrupt registry hive, Faulty RAM"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </>
        )}

        {targetStatus === 'REOPENED' && (
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Reopening Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Detail why the issue recurred or why previous resolution was ineffective..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

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
            className={`px-4 py-1.5 rounded-lg font-semibold text-white transition ${
              targetStatus === 'RESOLVED'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : targetStatus === 'WAITING'
                ? 'bg-orange-600 hover:bg-orange-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Transition'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
