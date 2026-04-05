import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Droplets, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AddParcelDialog from "@/components/parcels/AddParcelDialog";
import ParcelMap from "@/components/map/ParcelMap";

export default function Parcels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadParcels();
  }, [user]);

  const loadParcels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("parcels")
      .select("*")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false });
    setParcels(data || []);
    setLoading(false);
  };

  const deleteParcel = async (id: string) => {
    if (!confirm("Supprimer cette parcelle et toutes ses données ?")) return;
    const { error } = await supabase.from("parcels").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Parcelle supprimée");
      loadParcels();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mes Parcelles</h1>
        <AddParcelDialog onAdded={loadParcels} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carte</CardTitle>
        </CardHeader>
        <CardContent>
          <ParcelMap
            parcels={parcels}
            height="300px"
            onParcelClick={(id) => navigate(`/farmer/parcels/${id}`)}
          />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : parcels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Aucune parcelle</p>
            <p className="text-muted-foreground">Ajoutez votre première parcelle pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parcels.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <Badge variant="secondary">{p.crop_type}</Badge>
                </div>
                <CardDescription>{p.description || "Pas de description"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surface</span>
                    <span className="font-medium">{p.area_hectares} ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sol</span>
                    <span className="font-medium capitalize">{p.soil_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position</span>
                    <span className="font-medium text-xs">
                      {p.location_lat.toFixed(4)}, {p.location_lng.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/farmer/parcels/${p.id}`)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteParcel(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
