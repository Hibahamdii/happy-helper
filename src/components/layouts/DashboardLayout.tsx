import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, MapPin, Droplets, Users, BarChart3, LogOut, Leaf, CloudRain,
  Bell, User, Radio, Calendar,
} from "lucide-react";

const farmerMenuItems = [
  { title: "Tableau de bord", url: "/farmer/dashboard", icon: LayoutDashboard },
  { title: "Mes Parcelles", url: "/farmer/parcels", icon: MapPin },
  { title: "Prévisions Irrigation", url: "/farmer/forecast", icon: CloudRain },
  { title: "Planning Irrigation", url: "/farmer/schedule", icon: Calendar },
  { title: "Monitoring IoT", url: "/farmer/iot", icon: Radio },
  { title: "Alertes", url: "/farmer/alerts", icon: Bell },
  { title: "Mon Profil", url: "/farmer/profile", icon: User },
];

const adminMenuItems = [
  { title: "Tableau de bord", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Toutes les Parcelles", url: "/admin/parcels", icon: MapPin },
  { title: "Utilisateurs", url: "/admin/users", icon: Users },
  { title: "Statistiques", url: "/admin/stats", icon: BarChart3 },
  { title: "Alertes", url: "/admin/alerts", icon: Bell },
  { title: "Mon Profil", url: "/admin/profile", icon: User },
];

function SidebarNav({ role }: { role: string }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const items = role === "admin" ? adminMenuItems : farmerMenuItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            <span>IrriSmart</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  <span>Déconnexion</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };
    load();

    const channel = supabase
      .channel("bell-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const alertsUrl = role === "admin" ? "/admin/alerts" : "/farmer/alerts";

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => navigate(alertsUrl)}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SidebarNav role={role || "farmer"} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">IrriSmart</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {role === "admin" ? "Admin" : "Agriculteur"}
              </Badge>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
