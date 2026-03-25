import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, MoreHorizontal, Sparkles } from 'lucide-react';
import { Ticket, formatDate, categoryLabels } from '@/data/mockData';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TicketTableProps {
  tickets: Ticket[];
  showCustomer?: boolean;
  showAgent?: boolean;
}

const TicketTable: React.FC<TicketTableProps> = ({ 
  tickets, 
  showCustomer = false,
  showAgent = false 
}) => {
  const navigate = useNavigate();

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No tickets found</h3>
        <p className="text-muted-foreground">There are no tickets matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              {showCustomer && <th>Customer</th>}
              {showAgent && <th>Agent</th>}
              <th>Created</th>
              <th>AI</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                <td>
                  <span className="font-mono text-primary font-medium">{ticket.id}</span>
                </td>
                <td>
                  <div className="max-w-xs truncate font-medium text-foreground">
                    {ticket.subject}
                  </div>
                </td>
                <td>
                  <span className="text-sm text-muted-foreground">
                    {categoryLabels[ticket.category]}
                  </span>
                </td>
                <td>
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                {showCustomer && (
                  <td>
                    <span className="text-sm">{ticket.customerName}</span>
                  </td>
                )}
                {showAgent && (
                  <td>
                    <span className="text-sm">
                      {ticket.assignedAgentName || (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </span>
                  </td>
                )}
                <td>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(ticket.createdAt)}
                  </span>
                </td>
                <td>
                  {ticket.aiAnalysis && (
                    <div className="ai-badge text-xs">
                      <Sparkles className="h-3 w-3" />
                      {ticket.aiAnalysis.categoryConfidence}%
                    </div>
                  )}
                </td>
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/tickets/${ticket.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Ticket
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketTable;
