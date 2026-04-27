import React from 'react';
import { Sparkles, TrendingUp, Building2 } from 'lucide-react'; // Ajout de Building2 pour le département

type AIAnalysis = {
  category?: string;
  department_name?: string; // Ajout du département
  priority?: string;
  confidence?: number;
  summary?: string;
  sentiment?: string;
  keywords?: string[];
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  urgent:   { label: 'Urgent',   color: 'text-red-700 bg-red-100'      },
  negative: { label: 'Négatif',  color: 'text-orange-700 bg-orange-100' },
  neutral:  { label: 'Neutre',   color: 'text-slate-700 bg-slate-100'   },
  positive: { label: 'Positif',  color: 'text-emerald-700 bg-emerald-100' },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-red-700 bg-red-100',
  high:     'text-orange-700 bg-orange-100',
  medium:   'text-blue-700 bg-blue-100',
  low:      'text-green-700 bg-green-100',
};

export const AIAnalysisBadge: React.FC<{ analysis: AIAnalysis; compact?: boolean }> = ({ analysis, compact = false }) => {
  if (!analysis) return null;

  const sentiment = SENTIMENT_CONFIG[analysis.sentiment ?? 'neutral'] || SENTIMENT_CONFIG.neutral;
  const confidence = analysis.confidence ?? 0;

  const confColor = confidence >= 80 ? 'bg-emerald-500' : confidence >= 60 ? 'bg-amber-500' : 'bg-red-500';

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
        <Sparkles className="h-3 w-3" />
        IA: {Math.round(confidence)}%
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-semibold text-purple-800">Analyse IA</span>
        <span className="ml-auto text-xs text-purple-600">{Math.round(confidence)}% confiance</span>
      </div>

      {/* Barre de confiance */}
      <div className="w-full bg-purple-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${confColor}`} style={{ width: `${confidence}%` }} />
      </div>

      {/* Résumé */}
      {analysis.summary && (
        <p className="text-xs text-purple-700 italic">"{analysis.summary}"</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {/* NOUVEAU: Badge Département */}
        {analysis.department_name && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {analysis.department_name}
          </span>
        )}

        {analysis.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
            📁 {analysis.category}
          </span>
        )}
        
        {analysis.priority && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${PRIORITY_COLOR[analysis.priority]}`}>
            <TrendingUp className="h-3 w-3" />
            {analysis.priority.toUpperCase()}
          </span>
        )}

        {analysis.sentiment && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sentiment.color}`}>
            {sentiment.label}
          </span>
        )}
      </div>

      {/* Mots-clés */}
      {analysis.keywords && analysis.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {analysis.keywords.map((kw, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-purple-200 text-purple-600 uppercase font-medium">
              #{kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAnalysisBadge;