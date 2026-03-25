import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, Shield, Headphones, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockNotifications } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const unreadNotifications = mockNotifications.filter(n => !n.read).length;

  // Dériver le rôle depuis user
  const role = user?.role ?? (user?.roles && user.roles[0]) ?? 'company_admin';

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
      case 'super_admin':
      case 'company_admin':
        return <Shield className="h-4 w-4" />;
      case 'agent':
      case 'employee':
        return <Headphones className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Badge couleur selon le rôle
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

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('tickets')) return 'Tickets';
    if (path.includes('create-ticket')) return 'Create Ticket';
    if (path.includes('analytics')) return 'Analytics';
    if (path.includes('settings')) return 'Settings';
    return 'Support Hub';
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
        </div>

        {/* Search bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tickets, users..."
              className="form-input pl-10 h-10 text-sm"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="notification-dot" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                <span className="text-xs font-normal text-muted-foreground">
                  {unreadNotifications} unread
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mockNotifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start py-3">
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                    <span className="font-medium text-sm">{notification.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-4">
                    {notification.message}
                  </p>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-primary text-sm">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
                {/* Avatar avec initiales */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${getRoleColor()}`}>
                  {getInitials(user?.full_name ?? user?.name)}
                </div>
                {/* Nom et rôle (caché sur mobile) */}
                <div className="hidden md:flex flex-col text-left">
                  <p className="text-sm font-medium leading-4">{user?.full_name ?? user?.name ?? 'User'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getRoleIcon()}
                    <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span>{user?.full_name ?? user?.name ?? 'User'}</span>
                <span className="text-xs text-muted-foreground font-normal flex items-center gap-1 mt-1">
                  {getRoleIcon()}
                  {getRoleLabel()}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
