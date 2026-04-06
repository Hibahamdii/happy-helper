import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Phone, Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminProfile() {
  const { user, role } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ users: 0, parcels: 0, irrigations: 0 });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
    }
  };

  const loadStats = async () => {
    const { data: profiles } = await supabase.from("profiles").select("id");
    const { data: parcels } = await supabase.from("parcels").select("id");
    const { data: logs } = await supabase.from("irrigation_logs").select("id");
    setStats({
      users: profiles?.length || 0,
      parcels: parcels?.length || 0,
      irrigations: logs?.length || 0,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour !");
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Mon Profil Admin</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle>{fullName || "Administrateur"}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-3 w-3" /> {user?.email}
                <Badge className="ml-2 bg-primary text-primary-foreground">Admin</Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-primary">{stats.users}</p><p className="text-sm text-muted-foreground">Utilisateurs</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-primary">{stats.parcels}</p><p className="text-sm text-muted-foreground">Parcelles</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-primary">{stats.irrigations}</p><p className="text-sm text-muted-foreground">Irrigations</p></CardContent></Card>
      </div>
    </div>
  );
}
