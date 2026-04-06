import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, AlertTriangle, Info, Droplets, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const typeIcons: Record<string, any> = {
  warning: AlertTriangle,
  critical: AlertTriangle,
  info: Info,
  irrigation: Droplets,
};

const typeColors: Record<string, string> = {
  warning: "bg-accent/10 text-accent border-accent/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-primary/10 text-primary border-primary/30",
  irrigation: "bg-blue-100 text-blue-800 border-blue-300",
};

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadAlerts();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` },
        () => loadAlerts()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadAlerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setAlerts(data || []);
    setLoading(false);
  };

  const markRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    loadAlerts();
  };

  const markAllRead = async () => {
    await supabase.from("alerts").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    loadAlerts();
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("alerts").delete().eq("id", id);
    loadAlerts();
  };

  const filtered = alerts.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.message.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Alertes</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</Badge>
          )}
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          <Check className="h-4 w-4 mr-2" /> Tout marquer comme lu
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans les alertes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Aucune alerte</p>
            <p className="text-muted-foreground">Vous recevrez des notifications ici.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const Icon = typeIcons[alert.type] || Info;
            const colorClass = typeColors[alert.type] || typeColors.info;
            return (
              <Card key={alert.id} className={`transition-all ${!alert.is_read ? "border-l-4 border-l-primary shadow-md" : "opacity-75"}`}>
                <CardContent className="flex items-start gap-4 py-4">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{alert.title}</p>
                      {!alert.is_read && <Badge variant="default" className="text-xs">Nouveau</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(alert.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!alert.is_read && (
                      <Button size="icon" variant="ghost" onClick={() => markRead(alert.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => deleteAlert(alert.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
