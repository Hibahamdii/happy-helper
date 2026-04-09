import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Trash2, Pencil, MapPin, Droplets, Sprout } from "lucide-react";
import ParcelMap from "@/components/map/ParcelMap";
import EditParcelDialog from "@/components/parcels/EditParcelDialog";
import { CROP_TYPES, SOIL_TYPES, SEASONS, GROWTH_STAGES, WATER_SOURCES } from "@/lib/agronomic";
import { getCropImage } from "@/lib/cropImages";

const getLabel = (list: { value: string; label: string }[], val: string) =>
  list.find((i) => i.value === val)?.label || val;

export default function AdminParcels() {
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editParcel, setEditParcel] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  useEffect(() => {
    loadParcels();
  }, []);

  const loadParcels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("parcels")
      .select("*, profiles!parcels_owner_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setParcels(data || []);
    setLoading(false);
  };

  const deleteParcel = async (id: string, name: string) => {
    if (!confirm(`Supprimer la parcelle "${name}" et toutes ses données associées ?`)) return;
    try {
      // Delete related data first
      await supabase.from("irrigation_logs").delete().eq("parcel_id", id);
      await supabase.from("irrigation_schedules").delete().eq("parcel_id", id);
      await supabase.from("alerts").delete().eq("parcel_id", id);
      
      // Delete sensor readings then sensors
      const { data: sensors } = await supabase.from("sensors").select("id").eq("parcel_id", id);
      if (sensors && sensors.length > 0) {
        const sensorIds = sensors.map((s) => s.id);
        await supabase.from("sensor_readings").delete().in("sensor_id", sensorIds);
      }
      await supabase.from("sensors").delete().eq("parcel_id", id);
      await supabase.from("pumps").delete().eq("parcel_id", id);

      const { error } = await supabase.from("parcels").delete().eq("id", id);
      if (error) throw error;
      toast.success("Parcelle supprimée");
      loadParcels();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = parcels.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.crop_type.toLowerCase().includes(search.toLowerCase()) ||
      (p.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalArea = parcels.reduce((a, p) => a + (p.area_hectares || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Toutes les Parcelles</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "cards" ? "default" : "outline"}
            onClick={() => setViewMode("cards")}
          >
            Cartes
          </Button>
          <Button
            size="sm"
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
          >
            Tableau
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Parcelles</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{parcels.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Surface Totale</CardTitle>
            <Sprout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalArea.toFixed(1)} ha</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Cultures Différentes</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(parcels.map((p) => p.crop_type)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, culture, propriétaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Map */}
      <Card>
        <CardHeader><CardTitle>Carte</CardTitle></CardHeader>
        <CardContent>
          <ParcelMap parcels={filtered} height="350px" />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : viewMode === "cards" ? (
        /* Cards view */
        filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{search ? "Aucun résultat" : "Aucune parcelle"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={getCropImage(p.crop_type)}
                    alt={p.crop_type}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      <p className="text-white/80 text-sm">{p.profiles?.full_name || "—"}</p>
                    </div>
                    <Badge className="bg-white/20 text-white backdrop-blur-sm border-none">
                      {getLabel(CROP_TYPES, p.crop_type)}
                    </Badge>
                  </div>
                </div>
                <CardContent className="pt-4">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surface</span>
                      <span className="font-medium">{p.area_hectares} ha</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sol</span>
                      <span className="font-medium">{getLabel(SOIL_TYPES, p.soil_type || "loam")}</span>
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
                      <span className="text-muted-foreground flex items-center gap-1"><Droplets className="h-3 w-3" /> Eau</span>
                      <span className="font-medium">{getLabel(WATER_SOURCES, p.water_source || "drip")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Position</span>
                      <span className="font-medium text-xs">{p.location_lat.toFixed(4)}, {p.location_lng.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditParcel(p)}>
                      <Pencil className="h-4 w-4 mr-1" /> Modifier
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteParcel(p.id, p.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Table view */
        <Card>
          <CardHeader>
            <CardTitle>Liste des Parcelles ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Culture</TableHead>
                  <TableHead>Surface</TableHead>
                  <TableHead>Sol</TableHead>
                  <TableHead>Saison</TableHead>
                  <TableHead>Stade</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Aucune parcelle trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.profiles?.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{getLabel(CROP_TYPES, p.crop_type)}</Badge>
                      </TableCell>
                      <TableCell>{p.area_hectares} ha</TableCell>
                      <TableCell>{getLabel(SOIL_TYPES, p.soil_type || "loam")}</TableCell>
                      <TableCell>{getLabel(SEASONS, p.season || "spring")}</TableCell>
                      <TableCell>{getLabel(GROWTH_STAGES, p.growth_stage || "vegetative")}</TableCell>
                      <TableCell className="text-xs">{p.location_lat.toFixed(4)}, {p.location_lng.toFixed(4)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditParcel(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteParcel(p.id, p.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
