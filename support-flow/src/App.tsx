import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Login from "./pages/Login";
// import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/customer/CreateTicket";
import MyTickets from "./pages/customer/MyTickets";
import ResolvedTickets from "./pages/customer/ResolvedTickets";
import History from "./pages/customer/History";
import TicketDetails from "./pages/TicketDetails";
import NotFound from "./pages/NotFound";

// Layout
import DashboardLayout from "./components/layout/DashboardLayout";
import RegisterPage from "./pages/Register";
import ManageCompanies from "./pages/admin/ManageCompanies";
import CreateOrganization from "./pages/admin/CreateOrganization";
import OrganizationDetail from "./pages/admin/OrganizationDetail";
import ManageAgents from "./pages/company_admin/ManageAgents";
import AgentDetail from "./pages/company_admin/AgentDetail";
import ManageClients from "./pages/company_admin/ManageClients";
import ClientDetail from "./pages/company_admin/ClientDetail";
import ManageCategories from "./pages/company_admin/ManageCategories";
import ManageDepartments from '@/pages/company_admin/ManageDepartments';
import WorklistPage      from '@/pages/customer/WorklistPage';
import ManageWorkflows from "./pages/admin/ManageWorkflows";
import TicketsTreeView from "./pages/TicketsTreeView";
import Dashboard from '@/pages/Dashboard';
// import ClientDetail from "./pages/company_admin/ClientDetail";
// import CreateClient from "./pages/company_admin/CreateClient";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Auth route wrapper (redirects if already authenticated)
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <AuthRoute>
          <Login />
        </AuthRoute>
      } />
      
      {/* Redirect root to login or dashboard */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Routes */}
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes with layout */}
      <Route element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Customer routes */}
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/tickets/tree" element={<TicketsTreeView />} />
        <Route path="/tickets/:id" element={<TicketDetails />} />
        <Route path="/tickets/resolved" element={<ResolvedTickets />} />
        <Route path="/create-ticket" element={<CreateTicket />} />
        <Route path="/history" element={<History />} />
       

        
        {/* Agent routes */}
        <Route path="/agent/tickets" element={<MyTickets />} />
        <Route path="/agent/pending" element={<MyTickets />} />
        
        {/* Admin routes */}
        <Route path="/admin/tickets" element={<MyTickets />} />
        <Route path="/admin/companies" element={<ManageCompanies />} />
        <Route path="/admin/companies/create" element={<CreateOrganization />} />
        <Route path="/admin/companies/:id" element={<OrganizationDetail />} />
        <Route path="/admin/analytics" element={<Dashboard />} />
        <Route path="/admin/agents" element={<ManageAgents  />} />
        <Route path="/admin/agents/:id"      element={<AgentDetail />} />
        <Route path="/admin/clients" element={<ManageClients  />} />
        <Route path="/admin/categories" element={<ManageCategories  />} />
        <Route path="/admin/clients/:id" element={<ClientDetail />} />
        <Route path="/admin/departments" element={<ManageDepartments />} />
        <Route path="/worklist"          element={<WorklistPage />} />
        <Route path="/admin/workflows" element={<ManageWorkflows />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* <Route path="/admin/clients/:id"     element={<ClientDetail />} />
        <Route path="/admin/clients/create" element={<CreateClient />} /> */}
        
        {/* Settings */}
        <Route path="/settings" element={<Dashboard />} />
      </Route>
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
