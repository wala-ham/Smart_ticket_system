import React from 'react';
import { 
  Ticket, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Users,
  BarChart3,
  AlertTriangle,
  Target
} from 'lucide-react';
import { mockTickets, mockDashboardStats, categoryLabels, priorityLabels } from '@/data/mockData';
import StatCard from '@/components/dashboard/StatCard';
import TicketTable from '@/components/tickets/TicketTable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const stats = mockDashboardStats;

  // Prepare chart data
  const categoryData = Object.entries(stats.ticketsByCategory).map(([key, value]) => ({
    name: categoryLabels[key as keyof typeof categoryLabels],
    value,
  }));

  const priorityData = Object.entries(stats.ticketsByPriority).map(([key, value]) => ({
    name: priorityLabels[key as keyof typeof priorityLabels],
    value,
  }));

  const COLORS = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Global overview of support operations and team performance
        </p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tickets"
          value={stats.totalTickets}
          icon={Ticket}
          variant="primary"
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Open Tickets"
          value={stats.openTickets}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Resolution Rate"
          value={`${stats.resolutionRate}%`}
          icon={Target}
          variant="success"
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Avg Resolution Time"
          value={stats.averageResolutionTime}
          icon={TrendingUp}
          variant="accent"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Category */}
        <div className="card-gradient p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Tickets by Category
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tickets by Priority */}
        <div className="card-gradient p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" />
            Tickets by Priority
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {priorityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tickets per day */}
      <div className="card-gradient p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Tickets Trend (Last 7 Days)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.ticketsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="card-gradient p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Agent Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Tickets Handled</th>
                <th>Avg Resolution Time</th>
                <th>Satisfaction Rating</th>
                <th>Resolved Today</th>
              </tr>
            </thead>
            <tbody>
              {stats.agentPerformance.map((agent) => (
                <tr key={agent.agentId}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {agent.avatar}
                      </div>
                      <span className="font-medium">{agent.agentName}</span>
                    </div>
                  </td>
                  <td>{agent.ticketsHandled}</td>
                  <td>{agent.avgResolutionTime}</td>
                  <td>
                    <span className="text-primary font-medium">{agent.satisfactionRating}⭐</span>
                  </td>
                  <td>
                    <span className="px-2 py-1 rounded-full bg-status-resolved-bg text-status-resolved text-sm font-medium">
                      {agent.resolvedToday}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Tickets */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">All Recent Tickets</h2>
        <TicketTable tickets={mockTickets} showCustomer showAgent />
      </div>
    </div>
  );
};

export default AdminDashboard;
