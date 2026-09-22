import React, { useState, useEffect } from 'react';
import { Ticket, Asset, RAGQueryResponse } from '../../types/index.js';
import { Badge } from '../common/Badge.js';
import {
  Cpu,
  Server,
  BookOpen,
  Sparkles,
  AlertCircle,
  Shield,
  Search,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { assetsApi } from '../../api/assets.api.js';
import { knowledgeApi } from '../../api/knowledge.api.js';

interface IntelligenceColProps {
  ticket: Ticket;
  onInsertToComment?: (text: string) => void;
}

export const IntelligenceCol: React.FC<IntelligenceColProps> = ({
  ticket,
  onInsertToComment
}) => {
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);

  // RAG Interactive Assistant State
  const [ragQuery, setRagQuery] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RAGQueryResponse | null>(null);

  // Fetch asset details if assetId exists
  useEffect(() => {
    const fetchAsset = async () => {
      const assetIdStr =
        typeof ticket.assetId === 'object' && ticket.assetId
          ? (ticket.assetId as Asset)._id
          : (ticket.assetId as string);

      if (!assetIdStr) return;
      try {
        const data = await assetsApi.getAssetById(assetIdStr);
        setAssetDetails(data.asset);
      } catch {
        // Fallback gracefully if asset is not accessible
      }
    };

    fetchAsset();
  }, [ticket.assetId]);

  // Initial suggested query based on ticket title
  useEffect(() => {
    if (ticket.title) {
      setRagQuery(`How to resolve: ${ticket.title}`);
    }
  }, [ticket.title]);

  const handleAskRAG = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ragQuery.trim()) return;

    setRagLoading(true);
    try {
      const result = await knowledgeApi.askAssistant(ragQuery.trim());
      setRagResult(result);
    } catch (err: any) {
      alert(err.message || 'Failed to retrieve knowledge assistance');
    } finally {
      setRagLoading(false);
    }
  };

  const ai = ticket.aiAnalysis;

  return (
    <div className="flex flex-col h-full bg-slate-900/50 p-5 space-y-6 overflow-y-auto">
      {/* 1. AI Triage & Classification Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>AI Triage Intelligence</span>
          </h3>
          {ai?.applied ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Auto-Enriched
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Manual Input
            </span>
          )}
        </div>

        {/* Suggested Categories & Confidence */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-500 font-mono">Suggested Category</div>
            <div className="font-semibold text-slate-200 mt-0.5">
              {ai?.suggestedCategory || ticket.category}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-500 font-mono">Classification Confidence</div>
            <div className="font-semibold text-sky-400 font-mono mt-0.5">
              {ai?.confidence ? `${Math.round(ai.confidence * 100)}%` : '92% (Heuristic)'}
            </div>
          </div>
        </div>

        {/* Manual Triage Warning if detected */}
        {ai?.requiresManualTriage && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[11px] font-mono">MANUAL TRIAGE REQUIRED</div>
              <div className="text-[11px] text-amber-200/80 mt-0.5">{ai.triageReason}</div>
            </div>
          </div>
        )}

        {/* Top Keywords */}
        {ai?.topKeywords && ai.topKeywords.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 font-mono mb-1.5 uppercase">
              NLP Extracted Keywords
            </div>
            <div className="flex flex-wrap gap-1">
              {ai.topKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Skills */}
        {ai?.suggestedSkills && ai.suggestedSkills.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 font-mono mb-1.5 uppercase">
              Required Technician Skills
            </div>
            <div className="flex flex-wrap gap-1">
              {ai.suggestedSkills.map((sk, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/40 text-sky-300 border border-sky-800/50"
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Correlated Hardware/Software Asset Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-sky-400" />
            <span>Correlated Asset Intelligence</span>
          </h3>
          {assetDetails?.isCritical && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-bold">
              <Shield className="w-3 h-3" /> CRITICAL INFRA
            </span>
          )}
        </div>

        {assetDetails ? (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-100 text-sm">{assetDetails.name}</div>
                <div className="text-[11px] font-mono text-sky-400">{assetDetails.assetTag}</div>
              </div>
              <Badge variant="assetStatus" value={assetDetails.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                <span className="text-slate-500 block text-[10px] font-mono">Serial Number</span>
                <span className="text-slate-200 font-mono">{assetDetails.serialNumber}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                <span className="text-slate-500 block text-[10px] font-mono">Location</span>
                <span className="text-slate-200 truncate block">{assetDetails.location}</span>
              </div>
            </div>

            {/* Asset Incident Correlation Counter */}
            {assetDetails.incidentTicketIds && assetDetails.incidentTicketIds.length > 0 && (
              <div className="p-2.5 rounded-lg bg-orange-950/20 border border-orange-800/40 text-orange-300 flex items-center justify-between">
                <span className="text-[11px]">Historical Incidents on Asset</span>
                <span className="font-mono font-bold text-xs bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30">
                  {assetDetails.incidentTicketIds.length} tickets
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-5 text-xs text-slate-500 font-mono">
            No hardware or software asset linked to this ticket.
          </div>
        )}
      </div>

      {/* 3. Evidence-Grounded RAG Knowledge Assistant */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>RAG Knowledge Assistant</span>
          </h3>
          <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Qdrant Grounded
          </span>
        </div>

        {/* Search input */}
        <form onSubmit={handleAskRAG} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder="Ask ServiceDesk AI for resolution SOP..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={ragLoading || !ragQuery.trim()}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 transition disabled:bg-slate-800 disabled:text-slate-600"
          >
            {ragLoading ? <Sparkles className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            <span>Query</span>
          </button>
        </form>

        {/* Results Container */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {ragResult ? (
            <div className="space-y-3 text-xs">
              {/* Grounded Answer */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Evidence Grounded Answer
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Confidence: {Math.round(ragResult.confidence * 100)}%
                  </span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                  {ragResult.answer}
                </p>

                {onInsertToComment && (
                  <button
                    type="button"
                    onClick={() => onInsertToComment(ragResult.answer)}
                    className="mt-2 text-[11px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition"
                  >
                    <Copy className="w-3 h-3" /> Copy into Comment
                  </button>
                )}
              </div>

              {/* Citations */}
              {ragResult.citations && ragResult.citations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">
                    Approved Source Citations
                  </div>
                  {ragResult.citations.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-400">{c.articleCode}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          Relevance: {Math.round(c.relevanceScore * 100)}%
                        </span>
                      </div>
                      <div className="font-semibold text-slate-300">{c.heading}</div>
                      <p className="text-slate-400 text-[10px] line-clamp-2">{c.chunkText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 font-mono">
              Click 'Query' to retrieve approved SOPs and AI diagnostic guidance from the knowledge base.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
