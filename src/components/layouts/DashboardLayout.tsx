import { ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MapPin,
  Droplets,
  Users,
  BarChart3,
  LogOut,
  Leaf,
  CloudRain,
  Settings,
} from "lucide-react";

const farmerMenuItems = [
  { title: "Tableau de bord", url: "/farmer/dashboard", icon: LayoutDashboard },
  { title: "Mes Parcelles", url: "/farmer/parcels", icon: MapPin },
  { title: "Prévisions Irrigation", url: "/farmer/forecast", icon: CloudRain },
];

const adminMenuItems = [
  { title: "Tableau de bord", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Toutes les Parcelles", url: "/admin/parcels", icon: MapPin },
  { title: "Utilisateurs", url: "/admin/users", icon: Users },
  { title: "Statistiques", url: "/admin/stats", icon: BarChart3 },
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
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{user?.email}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                {role === "admin" ? "Admin" : "Agriculteur"}
              </span>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
