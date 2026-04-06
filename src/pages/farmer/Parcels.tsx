import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Trash2, Eye, Search, Pencil, Droplets, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AddParcelDialog from "@/components/parcels/AddParcelDialog";
import EditParcelDialog from "@/components/parcels/EditParcelDialog";
import ParcelMap from "@/components/map/ParcelMap";
import { SEASONS, GROWTH_STAGES, WATER_SOURCES, CROP_TYPES } from "@/lib/agronomic";

const getLabel = (list: { value: string; label: string }[], val: string) =>
  list.find(i => i.value === val)?.label || val;

export default function Parcels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editParcel, setEditParcel] = useState<any>(null);

  useEffect(() => { if (user) loadParcels(); }, [user]);

  const loadParcels = async () => {
    setLoading(true);
    const { data } = await supabase.from("parcels").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
    setParcels(data || []);
    setLoading(false);
  };

  const deleteParcel = async (id: string) => {
    if (!confirm("Supprimer cette parcelle et toutes ses données ?")) return;
    const { error } = await supabase.from("parcels").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Parcelle supprimée"); loadParcels(); }
  };

  const filtered = parcels.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.crop_type.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Mes Parcelles</h1>
        <AddParcelDialog onAdded={loadParcels} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, culture, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader><CardTitle>Carte</CardTitle></CardHeader>
        <CardContent>
          <ParcelMap parcels={filtered} height="300px" onParcelClick={id => navigate(`/farmer/parcels/${id}`)} />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{search ? "Aucun résultat" : "Aucune parcelle"}</p>
            <p className="text-muted-foreground">{search ? "Essayez un autre terme" : "Ajoutez votre première parcelle."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <div className="flex gap-1">
                    <Badge variant="secondary">{getLabel(CROP_TYPES, p.crop_type)}</Badge>
                  </div>
                </div>
                <CardDescription>{p.description || "Pas de description"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surface</span>
                    <span className="font-medium">{p.area_hectares} ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sol</span>
                    <span className="font-medium">{getLabel([...WATER_SOURCES], p.soil_type) || p.soil_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saison</span>
                    <span className="font-medium">{getLabel(SEASONS, p.season || "spring")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stade</span>
                    <span className="font-medium">{getLabel(GROWTH_STAGES, p.growth_stage || "vegetative")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Eau</span>
                    <span className="font-medium">{getLabel(WATER_SOURCES, p.water_source || "drip")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position</span>
                    <span className="font-medium text-xs">{p.location_lat?.toFixed(4)}, {p.location_lng?.toFixed(4)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/farmer/parcels/${p.id}`)}>
                    <Eye className="h-4 w-4 mr-1" /> Détails
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditParcel(p)}>
                    <Pencil className="h-4 w-4" />
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

      {editParcel && (
        <EditParcelDialog
          parcel={editParcel}
          open={!!editParcel}
          onOpenChange={(open) => { if (!open) setEditParcel(null); }}
          onUpdated={loadParcels}
        />
      )}
    </div>
  );
}
