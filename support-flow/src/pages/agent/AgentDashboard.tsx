import React, { useState } from 'react';
import { 
  Ticket, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockTickets, mockDashboardStats, getTicketsForAgent } from '@/data/mockData';
import StatCard from '@/components/dashboard/StatCard';
import TicketTable from '@/components/tickets/TicketTable';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Get tickets assigned to this agent (using mock data for demo)
  const assignedTickets = user ? getTicketsForAgent(user.id) : mockTickets.filter(t => t.assignedAgentId);
  
  // For demo, show all tickets with assignments
  const allAssignedTickets = mockTickets.filter(t => t.assignedAgentId);
  
  const filteredTickets = statusFilter === 'all' 
    ? allAssignedTickets 
    : allAssignedTickets.filter(t => t.status === statusFilter);

  const openCount = allAssignedTickets.filter(t => t.status === 'open').length;
  const inProgressCount = allAssignedTickets.filter(t => t.status === 'in-progress').length;
  const criticalCount = allAssignedTickets.filter(t => t.priority === 'critical' || t.priority === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your assigned tickets and track performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">{user?.department || 'Technical Support'}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Tickets"
          value={allAssignedTickets.length}
          icon={Ticket}
          variant="primary"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="High Priority"
          value={criticalCount}
          icon={AlertTriangle}
          variant="accent"
        />
        <StatCard
          title="Resolved Today"
          value={mockDashboardStats.agentPerformance[0]?.resolvedToday || 0}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Performance card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-gradient p-6">
          <h3 className="font-semibold text-foreground mb-4">Your Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">
                {mockDashboardStats.agentPerformance[0]?.ticketsHandled || 142}
              </p>
              <p className="text-sm text-muted-foreground">Tickets Handled</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">
                {mockDashboardStats.agentPerformance[0]?.avgResolutionTime || '2.3h'}
              </p>
              <p className="text-sm text-muted-foreground">Avg Resolution</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">
                {mockDashboardStats.agentPerformance[0]?.satisfactionRating || 4.8}⭐
              </p>
              <p className="text-sm text-muted-foreground">Rating</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card-gradient p-6">
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Clock className="h-4 w-4 mr-2" />
              View Pending Queue
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance Report
            </Button>
          </div>
        </div>
      </div>

      {/* Assigned Tickets */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Assigned Tickets</h2>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <TicketTable tickets={filteredTickets} showCustomer />
      </div>
    </div>
  );
};

export default AgentDashboard;
