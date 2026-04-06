import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import ParcelMap from "@/components/map/ParcelMap";
import { SEASONS, SOIL_TYPES, GROWTH_STAGES, WATER_SOURCES, getCropsForSeason, isCropValidForSeason, isRainfed } from "@/lib/agronomic";

interface EditParcelDialogProps {
  parcel: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function EditParcelDialog({ parcel, open, onOpenChange, onUpdated }: EditParcelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [area, setArea] = useState<number>(1);
  const [cropType, setCropType] = useState("wheat");
  const [soilType, setSoilType] = useState("loam");
  const [season, setSeason] = useState("spring");
  const [growthStage, setGrowthStage] = useState("vegetative");
  const [waterSource, setWaterSource] = useState("drip");
  const [pumpFlowRate, setPumpFlowRate] = useState<number>(1000);

  useEffect(() => {
    if (parcel) {
      setName(parcel.name || "");
      setDescription(parcel.description || "");
      setLat(parcel.location_lat);
      setLng(parcel.location_lng);
      setArea(parcel.area_hectares);
      setCropType(parcel.crop_type);
      setSoilType(parcel.soil_type || "loam");
      setSeason(parcel.season || "spring");
      setGrowthStage(parcel.growth_stage || "vegetative");
      setWaterSource(parcel.water_source || "drip");
    }
  }, [parcel]);

  useEffect(() => {
    if (!isCropValidForSeason(cropType, season)) {
      const validCrops = getCropsForSeason(season);
      if (validCrops.length > 0) setCropType(validCrops[0].value);
    }
  }, [season]);

  const handleMapClick = (clickLat: number, clickLng: number) => {
    setLat(Math.round(clickLat * 10000) / 10000);
    setLng(Math.round(clickLng * 10000) / 10000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("parcels")
        .update({
          name, description, location_lat: lat, location_lng: lng,
          area_hectares: area, crop_type: cropType, soil_type: soilType,
          season, growth_stage: growthStage, water_source: waterSource,
        })
        .eq("id", parcel.id);
      if (error) throw error;

      // Update pump flow rate if not rainfed
      if (!isRainfed(waterSource)) {
        await supabase.from("pumps").update({ flow_rate_lph: pumpFlowRate }).eq("parcel_id", parcel.id);
      }

      toast.success("Parcelle mise à jour !");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cropOptions = getCropsForSeason(season);
  const cropInvalid = !isCropValidForSeason(cropType, season);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la Parcelle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Surface (hectares) *</Label>
              <Input type="number" step="0.1" min="0.1" value={area} onChange={e => setArea(Number(e.target.value))} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="rounded-lg border p-4 bg-primary/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">🌿 Informations Agronomiques</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Saison *</Label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEASONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de Culture *</Label>
                <Select value={cropType} onValueChange={setCropType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cropOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {cropInvalid && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Cette culture n'est pas recommandée en {season}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Type de Sol *</Label>
                <Select value={soilType} onValueChange={setSoilType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOIL_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stade de Croissance *</Label>
                <Select value={growthStage} onValueChange={setGrowthStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROWTH_STAGES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-blue-50/50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">💧 Source d'Eau & Irrigation</h3>
            <div className="space-y-2">
              <Label>Source d'Eau *</Label>
              <Select value={waterSource} onValueChange={setWaterSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WATER_SOURCES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isRainfed(waterSource) ? (
              <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/30 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-accent mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Parcelle Pluviale</p>
                  <p className="text-xs text-muted-foreground">Cette parcelle dépend des pluies. Aucune pompe requise.</p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <Label>Débit de la pompe (L/h)</Label>
                <Input type="number" min="100" value={pumpFlowRate} onChange={e => setPumpFlowRate(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">📍 Localisation</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="space-y-2">
                <Label>Latitude *</Label>
                <Input type="number" step="0.0001" value={lat} onChange={e => setLat(Number(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label>Longitude *</Label>
                <Input type="number" step="0.0001" value={lng} onChange={e => setLng(Number(e.target.value))} required />
              </div>
            </div>
            <ParcelMap parcels={[]} height="200px" onMapClick={handleMapClick} selectedPosition={{ lat, lng }} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Mise à jour..." : "Enregistrer les modifications"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
