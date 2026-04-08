import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/layouts/DashboardLayout";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import Parcels from "./pages/farmer/Parcels";
import ParcelDetail from "./pages/farmer/ParcelDetail";
import IrrigationForecast from "./pages/farmer/IrrigationForecast";
import IrrigationSchedule from "./pages/farmer/IrrigationSchedule";
import IoTMonitoring from "./pages/farmer/IoTMonitoring";
import Alerts from "./pages/farmer/Alerts";
import FarmerProfile from "./pages/farmer/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminParcels from "./pages/admin/AdminParcels";
import AdminStats from "./pages/admin/AdminStats";
import AdminProfile from "./pages/admin/AdminProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RoleRouter() {
  const { role, loading, user } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</div>;
  if (user && !role) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement du profil...</div>;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/farmer/dashboard" replace />;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

            {/* Farmer routes */}
            <Route path="/farmer/dashboard" element={<ProtectedRoute><DashboardLayout><FarmerDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/farmer/parcels" element={<ProtectedRoute><DashboardLayout><Parcels /></DashboardLayout></ProtectedRoute>} />
            <Route path="/farmer/parcels/:id" element={<ProtectedRoute><DashboardLayout><ParcelDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/farmer/forecast" element={<ProtectedRoute><DashboardLayout><IrrigationForecast /></DashboardLayout></ProtectedRoute>} />
            <Route path="/farmer/schedule" element={<ProtectedRoute><DashboardLayout><IrrigationSchedule /></DashboardLayout></ProtectedRoute>} />
            <Route path="/farmer/iot" element={<ProtectedRoute><DashboardLayout><IoTMonitoring /></DashboardLayout></ProtectedRoute>} />
            <Route path="/farmer/alerts" element={<ProtectedRoute><DashboardLayout><Alerts /></DashboardLayout></ProtectedRoute>} />
            <Route path="/farmer/profile" element={<ProtectedRoute><DashboardLayout><FarmerProfile /></DashboardLayout></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><DashboardLayout><AdminUsers /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/parcels" element={<ProtectedRoute><DashboardLayout><AdminParcels /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/stats" element={<ProtectedRoute><DashboardLayout><AdminStats /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/alerts" element={<ProtectedRoute><DashboardLayout><Alerts /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute><DashboardLayout><AdminProfile /></DashboardLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
