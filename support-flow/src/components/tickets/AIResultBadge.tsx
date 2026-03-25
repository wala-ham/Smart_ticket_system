import React from 'react';
import { Sparkles, Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIAnalysis, categoryLabels, priorityLabels } from '@/data/mockData';

interface AIResultBadgeProps {
  analysis: AIAnalysis;
  compact?: boolean;
  className?: string;
}

const AIResultBadge: React.FC<AIResultBadgeProps> = ({ analysis, compact = false, className }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-ai-high';
    if (confidence >= 70) return 'text-ai-medium';
    return 'text-ai-low';
  };

  const getSentimentIcon = () => {
    switch (analysis.sentiment) {
      case 'positive':
        return <TrendingUp className="h-3.5 w-3.5 text-status-resolved" />;
      case 'negative':
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className={cn('ai-badge', className)}>
        <Sparkles className="h-3 w-3" />
        <span>AI: {analysis.categoryConfidence}%</span>
      </div>
    );
  }

  return (
    <div className={cn('p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20', className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-accent">
          <Brain className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">AI Analysis Completed</span>
        <Sparkles className="h-4 w-4 text-accent ml-auto" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Detected Category</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {categoryLabels[analysis.detectedCategory]}
            </span>
            <span className={cn('text-xs font-medium', getConfidenceColor(analysis.categoryConfidence))}>
              {analysis.categoryConfidence}%
            </span>
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Suggested Priority</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {priorityLabels[analysis.suggestedPriority]}
            </span>
            <span className={cn('text-xs font-medium', getConfidenceColor(analysis.priorityConfidence))}>
              {analysis.priorityConfidence}%
            </span>
          </div>
        </div>

        {/* Sentiment */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Sentiment</p>
          <div className="flex items-center gap-2">
            {getSentimentIcon()}
            <span className="text-sm font-medium text-foreground capitalize">
              {analysis.sentiment}
            </span>
          </div>
        </div>

        {/* Suggested Agent */}
        {analysis.suggestedAgent && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Suggested Agent</p>
            <span className="text-sm font-medium text-foreground">
              {analysis.suggestedAgent}
            </span>
          </div>
        )}
      </div>

      {/* Keywords */}
      <div className="mt-4">
        <p className="text-xs text-muted-foreground mb-2">Keywords</p>
        <div className="flex flex-wrap gap-1.5">
          {analysis.keywords.map((keyword, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIResultBadge;
