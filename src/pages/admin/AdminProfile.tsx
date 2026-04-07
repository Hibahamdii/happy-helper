import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Phone, Save, Shield, Camera, Users, MapPin, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import heroImg from "@/assets/hero-irrigation.jpg";

export default function AdminProfile() {
  const { user, role } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ users: 0, parcels: 0, irrigations: 0 });

  useEffect(() => {
    if (user) { loadProfile(); loadStats(); }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setAvatarUrl(data.avatar_url || "");
    }
  };

  const loadStats = async () => {
    const { count: usersCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const { count: parcelsCount } = await supabase.from("parcels").select("id", { count: "exact", head: true });
    const { count: irrigCount } = await supabase.from("irrigation_logs").select("id", { count: "exact", head: true });
    setStats({ users: usersCount || 0, parcels: parcelsCount || 0, irrigations: irrigCount || 0 });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filePath = `${user!.id}/avatar.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user!.id);
    setAvatarUrl(publicUrl + "?t=" + Date.now());
    toast.success("Photo mise à jour !");
    setUploading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour !");
    setLoading(false);
  };

  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "AD";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden h-40">
        <img src={heroImg} alt="Header" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/70 to-primary/30" />
      </div>

      <Card className="shadow-lg -mt-16 relative z-10 mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold">{fullName || "Administrateur"}</h2>
              <p className="text-muted-foreground flex items-center gap-2 justify-center sm:justify-start mt-1">
                <Mail className="h-4 w-4" /> {user?.email}
              </p>
              <Badge variant="secondary" className="mt-2"><Shield className="h-3 w-3 mr-1" />Administrateur</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Utilisateurs", value: stats.users, color: "text-violet-600" },
          { icon: MapPin, label: "Parcelles", value: stats.parcels, color: "text-emerald-600" },
          { icon: BarChart3, label: "Irrigations", value: stats.irrigations, color: "text-blue-600" },
        ].map((s, i) => (
          <Card key={i} className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213 ..." />
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />{loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
