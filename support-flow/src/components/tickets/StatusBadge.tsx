import React from 'react';
import { cn } from '@/lib/utils';
import { TicketStatus, TicketPriority, statusLabels, priorityLabels } from '@/data/mockData';

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'open':
        return 'status-open';
      case 'in-progress':
        return 'status-progress';
      case 'resolved':
        return 'status-resolved';
      case 'closed':
        return 'status-closed';
      default:
        return 'status-open';
    }
  };

  return (
    <span className={cn('status-badge', getStatusClass(), className)}>
      {statusLabels[status]}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const getPriorityClass = () => {
    switch (priority) {
      case 'critical':
        return 'priority-critical';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  return (
    <span className={cn('priority-badge', getPriorityClass(), className)}>
      {priorityLabels[priority]}
    </span>
  );
};
