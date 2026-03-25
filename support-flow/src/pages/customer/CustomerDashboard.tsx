import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Ticket, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  Eye,
  ArrowUpRight,
  Sparkles 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockTickets, mockDashboardStats, getTicketsForUser } from '@/data/mockData';
import StatCard from '@/components/dashboard/StatCard';
import TicketTable from '@/components/tickets/TicketTable';
import { Button } from '@/components/ui/button';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const userTickets = user ? getTicketsForUser(user.id) : mockTickets.slice(0, 3);
  
  const openTickets = userTickets.filter(t => t.status === 'open').length;
  const inProgressTickets = userTickets.filter(t => t.status === 'in-progress').length;
  const resolvedTickets = userTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your support tickets
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/tickets">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              My Tickets
            </Button>
          </Link>
          <Link to="/create-ticket">
            <Button className="btn-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Tickets"
          value={openTickets}
          icon={Ticket}
          variant="primary"
          trend={{ value: 12, isPositive: false }}
        />
        <StatCard
          title="In Progress"
          value={inProgressTickets}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Resolved"
          value={resolvedTickets}
          icon={CheckCircle}
          variant="success"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Avg Response Time"
          value={mockDashboardStats.averageResponseTime}
          icon={TrendingUp}
          variant="accent"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/create-ticket" className="card-gradient p-6 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Create New Ticket</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Submit a support request
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Plus className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
            </div>
          </div>
        </Link>

        <Link to="/tickets/resolved" className="card-gradient p-6 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Resolved Tickets</h3>
              <p className="text-sm text-muted-foreground mt-1">
                View your resolved issues
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-status-resolved-bg flex items-center justify-center group-hover:bg-status-resolved transition-colors">
              <CheckCircle className="h-5 w-5 text-status-resolved group-hover:text-white" />
            </div>
          </div>
        </Link>

        <Link to="/history" className="card-gradient p-6 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Ticket History</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Browse all past tickets
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
              <ArrowUpRight className="h-5 w-5 text-accent group-hover:text-white" />
            </div>
          </div>
        </Link>
      </div>

      {/* AI Highlight */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl p-6 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI-Powered Support</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your tickets are automatically analyzed and categorized by our AI system for faster resolution. 
              Average processing time: under 1 minute.
            </p>
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Tickets</h2>
          <Link to="/tickets" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <TicketTable tickets={userTickets.slice(0, 5)} />
      </div>
    </div>
  );
};

export default CustomerDashboard;
