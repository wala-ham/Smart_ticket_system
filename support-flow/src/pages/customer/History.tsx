import React, { useState } from 'react';
import { mockTickets, formatDate, TicketStatus, TicketCategory, categoryLabels } from '@/data/mockData';
import { Filter, Calendar, Search } from 'lucide-react';
import TicketTable from '@/components/tickets/TicketTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const History: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = mockTickets.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesSearch = searchQuery === '' || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ticket History</h1>
        <p className="text-muted-foreground mt-1">
          Browse and filter all your past tickets
        </p>
      </div>

      {/* Filters */}
      <div className="card-gradient p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ticket ID or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tickets table */}
      <TicketTable tickets={filteredTickets} />
    </div>
  );
};

export default History;
