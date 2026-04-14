import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, Shield, Headphones, User, Building, Tag, Building2,Inbox, ListChecks, Workflow, LayoutList, GitBranch, Layers, Zap    } from 'lucide-react';
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  History, 
  BarChart3, 
  Users, 
  Settings,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['client', 'employee', 'super_admin'] },
  { label: 'My Tickets', icon: Ticket, path: '/tickets', roles: ['client', 'employee'] },
  { label: 'Create Ticket', icon: PlusCircle, path: '/create-ticket', roles: ['client'] },
  { label: 'Resolved Tickets', icon: CheckCircle, path: '/tickets/resolved', roles: ['client'] },
  { label: 'History', icon: History, path: '/history', roles: ['client'] },
  
  
 
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics', roles: ['super_admin'] },
  { label: 'Manage Organizations', icon: Building, path: '/admin/companies', roles: ['super_admin'] },
  { label: 'Manage Agents', icon: Users, path: '/admin/agents', roles: [ 'company_admin'] },
  { label: 'Manage Clients', icon: Users, path: '/admin/clients', roles: ['super_admin', 'company_admin'] },
  { label: 'Manage Categories', icon: Tag, path: '/admin/categories', roles: ['super_admin', 'company_admin'] },
  { label: 'Manage Departments', icon: Building2, path: '/admin/departments', roles: [ 'company_admin'] },
  { label: 'Manage Tickets', icon: Ticket, path: '/admin/tickets', roles: ['super_admin', 'company_admin'] },
  { label: 'Worklist', icon: ListChecks, path: '/worklist', roles: ['company_admin'] }, 
  { label: 'Manage Workflow', icon: Workflow, path: '/admin/workflows', roles: ['company_admin'] }, 
  { label: 'Workflow Tickets', icon: GitBranch , path: '/tickets/tree', roles: ['company_admin'] }, 

  // { label: 'All Tickets', icon: Ticket, path: '/admin/tickets', roles: ['super_admin', 'company_admin'] },
  // { label: 'Pending Tickets', icon: Clock, path: '/agent/pending', roles: ['employee', 'company_admin'] },
  // { label: 'Assigned Tickets', icon: Ticket, path: '/agent/tickets', roles: ['employee', 'company_admin'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['client', 'employee', 'super_admin', 'company_admin'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth(); // removed destructuring of non-existent `role`
  const location = useLocation();

  // derive role safely from user
  const role = user?.role ?? (user?.roles && user.roles[0]) ?? 'client';

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  // Générer les initiales depuis le nom
    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };
  
    // Icône selon le rôle
    const getRoleIcon = () => {
      switch (role) {
        case 'admin':
          return <Shield className="h-4 w-4" />;
        case 'agent':
        case 'employee':
          return <Headphones className="h-4 w-4" />;
        default:
          return <User className="h-4 w-4" />;
      }
    };
  
  const getRoleColor = () => {
    switch (role) {
      case 'super_admin':
      case 'company_admin':
        return 'bg-destructive text-destructive-foreground';
      case 'agent':
      case 'employee':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };
  // Label du rôle
  const getRoleLabel = () => {
    switch (role) {
      case 'agent':
      case 'employee':
        return 'Agent';
      case 'company_admin':
        return 'Company Admin';
      case 'super_admin':
        return 'Admin';
      default:
        return 'Customer';
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">SupportHub</h1>
              <p className="text-xs text-muted-foreground">Ticket System</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {/* Avatar avec initiales */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${getRoleColor()}`}>
              {getInitials(user?.full_name ?? user?.name)}
            </div>
            {/* Nom et rôle */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.full_name ?? user?.name ?? 'User'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {getRoleIcon()}
                <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn('nav-item', isActive && 'active')}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
