import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CustomerDashboard from './customer/CustomerDashboard';
import AgentDashboard from './agent/AgentDashboard';
import AdminDashboard from './admin/AdminDashboard';
import CompanyAdminDashboard from './company_admin/CompanyAdminDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? (user?.roles && user.roles[0]) ?? 'company_admin';


  switch (role) {
    case 'employee':
      return <AgentDashboard />;
    case 'super_admin':
      return <AdminDashboard />;
    case 'company_admin':
      return <CompanyAdminDashboard />;
    default:
      return <CustomerDashboard />;
  }
};

export default Dashboard;
