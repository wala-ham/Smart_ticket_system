import React from 'react';
import { mockTickets } from '@/data/mockData';
import TicketTable from '@/components/tickets/TicketTable';
import { CheckCircle } from 'lucide-react';

const ResolvedTickets: React.FC = () => {
  const resolvedTickets = mockTickets.filter(
    t => t.status === 'resolved' || t.status === 'closed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-status-resolved-bg">
          <CheckCircle className="h-6 w-6 text-status-resolved" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resolved Tickets</h1>
          <p className="text-muted-foreground mt-1">
            View all your resolved and closed tickets
          </p>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {resolvedTickets.length} resolved ticket{resolvedTickets.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tickets table */}
      <TicketTable tickets={resolvedTickets} />
    </div>
  );
};

export default ResolvedTickets;
