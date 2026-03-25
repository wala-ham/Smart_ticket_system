// Mock data for Smart Customer Support Ticket Management System

export type UserRole = 'customer' | 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  department?: string;
  ticketsHandled?: number;
  averageResolutionTime?: number;
  rating?: number;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  attachments?: Attachment[];
  comments?: Comment[];
  aiAnalysis?: AIAnalysis;
  timeline?: TimelineEvent[];
}

export type TicketCategory = 
  | 'technical'
  | 'billing'
  | 'general'
  | 'account'
  | 'feature-request'
  | 'bug-report';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface AIAnalysis {
  detectedCategory: TicketCategory;
  categoryConfidence: number;
  suggestedPriority: TicketPriority;
  priorityConfidence: number;
  suggestedAgent?: string;
  suggestedAgentId?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  analysisCompletedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'assigned' | 'status-change' | 'comment' | 'ai-analysis' | 'resolved';
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

export interface Notification {
  id: string;
  type: 'ticket-created' | 'ticket-assigned' | 'ticket-resolved' | 'comment-added' | 'status-updated';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  ticketId?: string;
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResponseTime: string;
  averageResolutionTime: string;
  resolutionRate: number;
  ticketsByCategory: Record<TicketCategory, number>;
  ticketsByPriority: Record<TicketPriority, number>;
  ticketsPerDay: { date: string; count: number }[];
  agentPerformance: AgentPerformance[];
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  avatar: string;
  ticketsHandled: number;
  avgResolutionTime: string;
  satisfactionRating: number;
  resolvedToday: number;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'JD',
    role: 'customer',
  },
  {
    id: 'user-2',
    name: 'Sarah Smith',
    email: 'sarah.smith@example.com',
    avatar: 'SS',
    role: 'customer',
  },
  {
    id: 'agent-1',
    name: 'Michael Chen',
    email: 'michael.chen@support.com',
    avatar: 'MC',
    role: 'employee',
    department: 'Technical Support',
    ticketsHandled: 142,
    averageResolutionTime: 2.3,
    rating: 4.8,
  },
  {
    id: 'agent-2',
    name: 'Emily Johnson',
    email: 'emily.johnson@support.com',
    avatar: 'EJ',
    role: 'employee',
    department: 'Billing',
    ticketsHandled: 98,
    averageResolutionTime: 1.8,
    rating: 4.9,
  },
  {
    id: 'agent-3',
    name: 'David Wilson',
    email: 'david.wilson@support.com',
    avatar: 'DW',
    role: 'employee',
    department: 'General Support',
    ticketsHandled: 215,
    averageResolutionTime: 3.1,
    rating: 4.6,
  },
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@support.com',
    avatar: 'AU',
    role: 'admin',
  },
];

// Mock Tickets
export const mockTickets: Ticket[] = [
  {
    id: 'TKT-001',
    subject: 'Unable to access my account',
    description: 'I am experiencing a login error after submitting my credentials. The system shows "Invalid credentials" even though I am sure my password is correct. I have tried resetting my password but the issue persists.',
    category: 'technical',
    priority: 'high',
    status: 'open',
    createdAt: '2024-01-28T10:30:00Z',
    updatedAt: '2024-01-28T10:35:00Z',
    customerId: 'user-1',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    attachments: [
      {
        id: 'att-1',
        name: 'error_screenshot.png',
        size: '245 KB',
        type: 'image/png',
        url: '/attachments/error_screenshot.png',
      },
    ],
    aiAnalysis: {
      detectedCategory: 'technical',
      categoryConfidence: 94,
      suggestedPriority: 'high',
      priorityConfidence: 87,
      suggestedAgent: 'Michael Chen',
      suggestedAgentId: 'agent-1',
      sentiment: 'negative',
      keywords: ['login', 'error', 'credentials', 'password', 'access'],
      analysisCompletedAt: '2024-01-28T10:31:00Z',
    },
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        description: 'Ticket created by John Doe',
        timestamp: '2024-01-28T10:30:00Z',
        userId: 'user-1',
        userName: 'John Doe',
      },
      {
        id: 'tl-2',
        type: 'ai-analysis',
        description: 'AI analysis completed - Category: Technical, Priority: High (94% confidence)',
        timestamp: '2024-01-28T10:31:00Z',
      },
    ],
  },
  {
    id: 'TKT-002',
    subject: 'Billing discrepancy on last invoice',
    description: 'I noticed an extra charge of $49.99 on my January invoice that I did not authorize. Please investigate and process a refund if applicable.',
    category: 'billing',
    priority: 'medium',
    status: 'in-progress',
    createdAt: '2024-01-27T14:20:00Z',
    updatedAt: '2024-01-28T09:15:00Z',
    customerId: 'user-2',
    customerName: 'Sarah Smith',
    customerEmail: 'sarah.smith@example.com',
    assignedAgentId: 'agent-2',
    assignedAgentName: 'Emily Johnson',
    aiAnalysis: {
      detectedCategory: 'billing',
      categoryConfidence: 98,
      suggestedPriority: 'medium',
      priorityConfidence: 82,
      suggestedAgent: 'Emily Johnson',
      suggestedAgentId: 'agent-2',
      sentiment: 'neutral',
      keywords: ['billing', 'invoice', 'charge', 'refund', 'unauthorized'],
      analysisCompletedAt: '2024-01-27T14:21:00Z',
    },
    comments: [
      {
        id: 'cmt-1',
        authorId: 'agent-2',
        authorName: 'Emily Johnson',
        authorRole: 'employee',
        content: 'Hi Sarah, I am looking into this issue now. I can see the charge in question and will investigate with our billing department.',
        createdAt: '2024-01-28T09:15:00Z',
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        description: 'Ticket created by Sarah Smith',
        timestamp: '2024-01-27T14:20:00Z',
        userId: 'user-2',
        userName: 'Sarah Smith',
      },
      {
        id: 'tl-2',
        type: 'ai-analysis',
        description: 'AI analysis completed - Category: Billing, Priority: Medium (98% confidence)',
        timestamp: '2024-01-27T14:21:00Z',
      },
      {
        id: 'tl-3',
        type: 'assigned',
        description: 'Ticket assigned to Emily Johnson',
        timestamp: '2024-01-27T15:00:00Z',
        userId: 'agent-2',
        userName: 'Emily Johnson',
      },
      {
        id: 'tl-4',
        type: 'status-change',
        description: 'Status changed from Open to In Progress',
        timestamp: '2024-01-28T09:15:00Z',
        userId: 'agent-2',
        userName: 'Emily Johnson',
      },
    ],
  },
  {
    id: 'TKT-003',
    subject: 'Feature request: Dark mode',
    description: 'It would be great to have a dark mode option in the application. This would help reduce eye strain during night usage.',
    category: 'feature-request',
    priority: 'low',
    status: 'open',
    createdAt: '2024-01-26T08:45:00Z',
    updatedAt: '2024-01-26T08:46:00Z',
    customerId: 'user-1',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    aiAnalysis: {
      detectedCategory: 'feature-request',
      categoryConfidence: 96,
      suggestedPriority: 'low',
      priorityConfidence: 91,
      suggestedAgent: 'David Wilson',
      suggestedAgentId: 'agent-3',
      sentiment: 'positive',
      keywords: ['feature', 'dark mode', 'night', 'eye strain'],
      analysisCompletedAt: '2024-01-26T08:46:00Z',
    },
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        description: 'Ticket created by John Doe',
        timestamp: '2024-01-26T08:45:00Z',
        userId: 'user-1',
        userName: 'John Doe',
      },
      {
        id: 'tl-2',
        type: 'ai-analysis',
        description: 'AI analysis completed - Category: Feature Request, Priority: Low (96% confidence)',
        timestamp: '2024-01-26T08:46:00Z',
      },
    ],
  },
  {
    id: 'TKT-004',
    subject: 'Application crashes on mobile',
    description: 'The mobile app keeps crashing whenever I try to open the settings page. This happens on both iOS and Android devices. I have already tried reinstalling the app.',
    category: 'bug-report',
    priority: 'critical',
    status: 'in-progress',
    createdAt: '2024-01-28T07:00:00Z',
    updatedAt: '2024-01-28T11:30:00Z',
    customerId: 'user-2',
    customerName: 'Sarah Smith',
    customerEmail: 'sarah.smith@example.com',
    assignedAgentId: 'agent-1',
    assignedAgentName: 'Michael Chen',
    aiAnalysis: {
      detectedCategory: 'bug-report',
      categoryConfidence: 92,
      suggestedPriority: 'critical',
      priorityConfidence: 95,
      suggestedAgent: 'Michael Chen',
      suggestedAgentId: 'agent-1',
      sentiment: 'negative',
      keywords: ['crash', 'mobile', 'settings', 'iOS', 'Android', 'bug'],
      analysisCompletedAt: '2024-01-28T07:01:00Z',
    },
    comments: [
      {
        id: 'cmt-1',
        authorId: 'agent-1',
        authorName: 'Michael Chen',
        authorRole: 'employee',
        content: 'Thank you for reporting this. I have escalated this to our development team. Can you please provide your device model and OS version?',
        createdAt: '2024-01-28T08:30:00Z',
      },
      {
        id: 'cmt-2',
        authorId: 'user-2',
        authorName: 'Sarah Smith',
        authorRole: 'customer',
        content: 'I am using iPhone 14 Pro with iOS 17.2 and also tested on Samsung Galaxy S23 with Android 14.',
        createdAt: '2024-01-28T09:00:00Z',
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        description: 'Ticket created by Sarah Smith',
        timestamp: '2024-01-28T07:00:00Z',
        userId: 'user-2',
        userName: 'Sarah Smith',
      },
      {
        id: 'tl-2',
        type: 'ai-analysis',
        description: 'AI analysis completed - Category: Bug Report, Priority: Critical (92% confidence)',
        timestamp: '2024-01-28T07:01:00Z',
      },
      {
        id: 'tl-3',
        type: 'assigned',
        description: 'Ticket assigned to Michael Chen',
        timestamp: '2024-01-28T07:30:00Z',
        userId: 'agent-1',
        userName: 'Michael Chen',
      },
      {
        id: 'tl-4',
        type: 'status-change',
        description: 'Status changed from Open to In Progress',
        timestamp: '2024-01-28T08:30:00Z',
        userId: 'agent-1',
        userName: 'Michael Chen',
      },
    ],
  },
  {
    id: 'TKT-005',
    subject: 'How to reset my password?',
    description: 'I forgot my password and need help resetting it. The password reset email is not arriving in my inbox.',
    category: 'account',
    priority: 'medium',
    status: 'resolved',
    createdAt: '2024-01-25T16:00:00Z',
    updatedAt: '2024-01-25T17:30:00Z',
    customerId: 'user-1',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    assignedAgentId: 'agent-3',
    assignedAgentName: 'David Wilson',
    aiAnalysis: {
      detectedCategory: 'account',
      categoryConfidence: 89,
      suggestedPriority: 'medium',
      priorityConfidence: 78,
      suggestedAgent: 'David Wilson',
      suggestedAgentId: 'agent-3',
      sentiment: 'neutral',
      keywords: ['password', 'reset', 'forgot', 'email'],
      analysisCompletedAt: '2024-01-25T16:01:00Z',
    },
    comments: [
      {
        id: 'cmt-1',
        authorId: 'agent-3',
        authorName: 'David Wilson',
        authorRole: 'employee',
        content: 'Hi John, I have manually sent a password reset link to your registered email. Please also check your spam folder.',
        createdAt: '2024-01-25T16:30:00Z',
      },
      {
        id: 'cmt-2',
        authorId: 'user-1',
        authorName: 'John Doe',
        authorRole: 'customer',
        content: 'Found it in spam! Password reset successfully. Thank you!',
        createdAt: '2024-01-25T17:00:00Z',
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        description: 'Ticket created by John Doe',
        timestamp: '2024-01-25T16:00:00Z',
        userId: 'user-1',
        userName: 'John Doe',
      },
      {
        id: 'tl-2',
        type: 'ai-analysis',
        description: 'AI analysis completed - Category: Account, Priority: Medium (89% confidence)',
        timestamp: '2024-01-25T16:01:00Z',
      },
      {
        id: 'tl-3',
        type: 'assigned',
        description: 'Ticket assigned to David Wilson',
        timestamp: '2024-01-25T16:15:00Z',
        userId: 'agent-3',
        userName: 'David Wilson',
      },
      {
        id: 'tl-4',
        type: 'resolved',
        description: 'Ticket resolved by David Wilson',
        timestamp: '2024-01-25T17:30:00Z',
        userId: 'agent-3',
        userName: 'David Wilson',
      },
    ],
  },
  {
    id: 'TKT-006',
    subject: 'General inquiry about pricing plans',
    description: 'I would like to know more about your enterprise pricing plans and what features are included. Can someone from sales contact me?',
    category: 'general',
    priority: 'low',
    status: 'closed',
    createdAt: '2024-01-24T11:00:00Z',
    updatedAt: '2024-01-24T14:00:00Z',
    customerId: 'user-2',
    customerName: 'Sarah Smith',
    customerEmail: 'sarah.smith@example.com',
    assignedAgentId: 'agent-3',
    assignedAgentName: 'David Wilson',
    aiAnalysis: {
      detectedCategory: 'general',
      categoryConfidence: 85,
      suggestedPriority: 'low',
      priorityConfidence: 88,
      suggestedAgent: 'David Wilson',
      suggestedAgentId: 'agent-3',
      sentiment: 'positive',
      keywords: ['pricing', 'enterprise', 'plans', 'features', 'sales'],
      analysisCompletedAt: '2024-01-24T11:01:00Z',
    },
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        description: 'Ticket created by Sarah Smith',
        timestamp: '2024-01-24T11:00:00Z',
        userId: 'user-2',
        userName: 'Sarah Smith',
      },
      {
        id: 'tl-2',
        type: 'ai-analysis',
        description: 'AI analysis completed - Category: General, Priority: Low (85% confidence)',
        timestamp: '2024-01-24T11:01:00Z',
      },
      {
        id: 'tl-3',
        type: 'resolved',
        description: 'Ticket closed - Sales team contacted customer',
        timestamp: '2024-01-24T14:00:00Z',
      },
    ],
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'ticket-created',
    title: 'New Ticket Created',
    message: 'Ticket TKT-001 has been created: "Unable to access my account"',
    timestamp: '2024-01-28T10:30:00Z',
    read: false,
    ticketId: 'TKT-001',
  },
  {
    id: 'notif-2',
    type: 'ticket-assigned',
    title: 'Ticket Assigned to You',
    message: 'Ticket TKT-004 has been assigned to Michael Chen',
    timestamp: '2024-01-28T07:30:00Z',
    read: false,
    ticketId: 'TKT-004',
  },
  {
    id: 'notif-3',
    type: 'comment-added',
    title: 'New Comment',
    message: 'Emily Johnson commented on TKT-002',
    timestamp: '2024-01-28T09:15:00Z',
    read: true,
    ticketId: 'TKT-002',
  },
  {
    id: 'notif-4',
    type: 'ticket-resolved',
    title: 'Ticket Resolved',
    message: 'Ticket TKT-005 has been resolved',
    timestamp: '2024-01-25T17:30:00Z',
    read: true,
    ticketId: 'TKT-005',
  },
  {
    id: 'notif-5',
    type: 'status-updated',
    title: 'Status Updated',
    message: 'Ticket TKT-002 status changed to In Progress',
    timestamp: '2024-01-28T09:15:00Z',
    read: true,
    ticketId: 'TKT-002',
  },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalTickets: 156,
  openTickets: 42,
  inProgressTickets: 28,
  resolvedTickets: 71,
  closedTickets: 15,
  averageResponseTime: '1.5 hours',
  averageResolutionTime: '4.2 hours',
  resolutionRate: 86,
  ticketsByCategory: {
    'technical': 45,
    'billing': 28,
    'general': 32,
    'account': 19,
    'feature-request': 18,
    'bug-report': 14,
  },
  ticketsByPriority: {
    'critical': 8,
    'high': 35,
    'medium': 68,
    'low': 45,
  },
  ticketsPerDay: [
    { date: '2024-01-22', count: 12 },
    { date: '2024-01-23', count: 18 },
    { date: '2024-01-24', count: 15 },
    { date: '2024-01-25', count: 22 },
    { date: '2024-01-26', count: 14 },
    { date: '2024-01-27', count: 19 },
    { date: '2024-01-28', count: 24 },
  ],
  agentPerformance: [
    {
      agentId: 'agent-1',
      agentName: 'Michael Chen',
      avatar: 'MC',
      ticketsHandled: 142,
      avgResolutionTime: '2.3 hours',
      satisfactionRating: 4.8,
      resolvedToday: 8,
    },
    {
      agentId: 'agent-2',
      agentName: 'Emily Johnson',
      avatar: 'EJ',
      ticketsHandled: 98,
      avgResolutionTime: '1.8 hours',
      satisfactionRating: 4.9,
      resolvedToday: 5,
    },
    {
      agentId: 'agent-3',
      agentName: 'David Wilson',
      avatar: 'DW',
      ticketsHandled: 215,
      avgResolutionTime: '3.1 hours',
      satisfactionRating: 4.6,
      resolvedToday: 12,
    },
  ],
};

// Category labels
export const categoryLabels: Record<TicketCategory, string> = {
  'technical': 'Technical Issue',
  'billing': 'Billing',
  'general': 'General Inquiry',
  'account': 'Account',
  'feature-request': 'Feature Request',
  'bug-report': 'Bug Report',
};

// Priority labels
export const priorityLabels: Record<TicketPriority, string> = {
  'critical': 'Critical',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
};

// Status labels
export const statusLabels: Record<TicketStatus, string> = {
  'open': 'Open',
  'in-progress': 'In Progress',
  'resolved': 'Resolved',
  'closed': 'Closed',
};

// Helper function to get current user based on role
export const getCurrentUser = (role: UserRole): User => {
  return mockUsers.find(u => u.role === role) || mockUsers[0];
};

// Helper function to get tickets for a specific user
export const getTicketsForUser = (userId: string): Ticket[] => {
  return mockTickets.filter(t => t.customerId === userId);
};

// Helper function to get tickets assigned to an agent
export const getTicketsForAgent = (agentId: string): Ticket[] => {
  return mockTickets.filter(t => t.assignedAgentId === agentId);
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper function to format time ago
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
};
