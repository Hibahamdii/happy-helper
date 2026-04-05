import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import ParcelMap from "@/components/map/ParcelMap";

interface AddParcelDialogProps {
  onAdded: () => void;
}

const CROP_TYPES = ["wheat", "corn", "tomato", "potato", "rice", "soybean", "cotton", "sunflower", "olive", "citrus"];
const SOIL_TYPES = ["sand", "loam", "clay", "silt"];

export default function AddParcelDialog({ onAdded }: AddParcelDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [area, setArea] = useState<number>(1);
  const [cropType, setCropType] = useState("wheat");
  const [soilType, setSoilType] = useState("loam");
  const [pumpFlowRate, setPumpFlowRate] = useState<number>(1000);

  const handleMapClick = (clickLat: number, clickLng: number) => {
    setLat(Math.round(clickLat * 10000) / 10000);
    setLng(Math.round(clickLng * 10000) / 10000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || lat === "" || lng === "") return;

    setLoading(true);
    try {
      // Create parcel
      const { data: parcel, error: parcelError } = await supabase
        .from("parcels")
        .insert({
          name,
          description,
          location_lat: Number(lat),
          location_lng: Number(lng),
          area_hectares: area,
          crop_type: cropType,
          soil_type: soilType,
          owner_id: user.id,
        })
        .select()
        .single();

      if (parcelError) throw parcelError;

      // Create default sensors
      const sensors = [
        { parcel_id: parcel.id, type: "humidity", name: `Capteur Humidité - ${name}` },
        { parcel_id: parcel.id, type: "temperature", name: `Capteur Température - ${name}` },
        { parcel_id: parcel.id, type: "rain", name: `Capteur Pluie - ${name}` },
      ];

      const { error: sensorError } = await supabase.from("sensors").insert(sensors);
      if (sensorError) throw sensorError;

      // Create default pump
      const { error: pumpError } = await supabase.from("pumps").insert({
        parcel_id: parcel.id,
        name: `Pompe - ${name}`,
        flow_rate_lph: pumpFlowRate,
      });
      if (pumpError) throw pumpError;

      toast.success("Parcelle ajoutée avec succès !");
      setOpen(false);
      resetForm();
      onAdded();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setLat("");
    setLng("");
    setArea(1);
    setCropType("wheat");
    setSoilType("loam");
    setPumpFlowRate(1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une Parcelle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle Parcelle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de la parcelle</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Surface (hectares)</Label>
              <Input type="number" step="0.1" min="0.1" value={area} onChange={(e) => setArea(Number(e.target.value))} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de culture</Label>
              <Select value={cropType} onValueChange={setCropType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CROP_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type de sol</Label>
              <Select value={soilType} onValueChange={setSoilType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOIL_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Débit de la pompe (litres/heure)</Label>
            <Input type="number" min="100" value={pumpFlowRate} onChange={(e) => setPumpFlowRate(Number(e.target.value))} required />
          </div>

          <div className="space-y-2">
            <Label>Localisation (cliquez sur la carte ou saisissez les coordonnées)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" step="0.0001" placeholder="Latitude" value={lat} onChange={(e) => setLat(Number(e.target.value))} required />
              <Input type="number" step="0.0001" placeholder="Longitude" value={lng} onChange={(e) => setLng(Number(e.target.value))} required />
            </div>
          </div>

          <ParcelMap
            parcels={[]}
            height="250px"
            onMapClick={handleMapClick}
            selectedPosition={lat !== "" && lng !== "" ? { lat: Number(lat), lng: Number(lng) } : null}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ajout en cours..." : "Ajouter la parcelle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
