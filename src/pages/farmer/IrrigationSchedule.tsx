import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Calendar, Clock, Droplets, AlertTriangle, Info, Sparkles, Loader2 } from "lucide-react";
import { getIrrigationIntervalDays, isRainfed, GROWTH_STAGE_KC_MULTIPLIER } from "@/lib/agronomic";
import { getCropImage } from "@/lib/cropImages";
import heroImg from "@/assets/hero-irrigation.jpg";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// Best irrigation hours by growth stage
function getOptimalStartTime(growthStage: string): string {
  switch (growthStage) {
    case "seeding": return "07:00";
    case "vegetative": return "06:00";
    case "flowering": return "05:30";
    case "fruiting": return "06:00";
    case "maturation": return "07:00";
    case "harvest": return "08:00";
    default: return "06:00";
  }
}

// Duration based on growth stage multiplier and crop type
function getOptimalDuration(growthStage: string, cropType: string): number {
  const mult = GROWTH_STAGE_KC_MULTIPLIER[growthStage] || 1.0;
  const base = cropType === "rice" ? 45 : cropType === "cucumber" ? 20 : 30;
  return Math.round(base * mult);
}

export default function IrrigationSchedule() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (user) loadParcels(); }, [user]);
  useEffect(() => { if (selectedParcelId) loadSchedules(); }, [selectedParcelId]);

  const loadParcels = async () => {
    const { data } = await supabase.from("parcels").select("*").eq("owner_id", user!.id);
    setParcels(data || []);
    if (data?.length) setSelectedParcelId(data[0].id);
  };

  const loadSchedules = async () => {
    const { data } = await supabase
      .from("irrigation_schedules")
      .select("*")
      .eq("parcel_id", selectedParcelId)
      .order("day_of_week");
    setSchedules(data || []);
  };

  const selectedParcel = parcels.find(p => p.id === selectedParcelId);
  const parcelIsRainfed = selectedParcel && isRainfed(selectedParcel.water_source || "drip");
  const irrigationInterval = selectedParcel ? getIrrigationIntervalDays(selectedParcel.crop_type) : 3;
  const maxIrrigationsPerWeek = Math.floor(7 / irrigationInterval);

  const generateSchedule = useCallback(async () => {
    if (!selectedParcel) return;
    setGenerating(true);

    // Delete existing schedules for this parcel
    await supabase.from("irrigation_schedules").delete().eq("parcel_id", selectedParcelId);

    const interval = getIrrigationIntervalDays(selectedParcel.crop_type);
    const startTime = getOptimalStartTime(selectedParcel.growth_stage || "vegetative");
    const duration = getOptimalDuration(selectedParcel.growth_stage || "vegetative", selectedParcel.crop_type);

    // Generate days spaced by interval, starting from Monday (1)
    const scheduleDays: number[] = [];
    let day = 1; // Monday
    while (scheduleDays.length < maxIrrigationsPerWeek && day <= 7) {
      scheduleDays.push(day % 7); // convert to 0-6 (Sunday=0)
      day += interval;
    }

    const inserts = scheduleDays.map(d => ({
      parcel_id: selectedParcelId,
      day_of_week: d,
      start_time: startTime,
      duration_minutes: duration,
      is_active: true,
    }));

    const { error } = await supabase.from("irrigation_schedules").insert(inserts);
    if (error) toast.error(error.message);
    else toast.success(`Planning généré : ${inserts.length} irrigations/semaine`);

    await loadSchedules();
    setGenerating(false);
  }, [selectedParcel, selectedParcelId, maxIrrigationsPerWeek]);

  const toggleSchedule = async (id: string, isActive: boolean) => {
    await supabase.from("irrigation_schedules").update({ is_active: !isActive }).eq("id", id);
    loadSchedules();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("irrigation_schedules").delete().eq("id", id);
    toast.success("Planification supprimée");
    loadSchedules();
  };

  const activeDays = schedules.filter(s => s.is_active).length;
  const tooManyIrrigations = activeDays > maxIrrigationsPerWeek;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-40">
        <img
          src={selectedParcel ? getCropImage(selectedParcel.crop_type) : heroImg}
          alt="Schedule"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/30 flex items-center px-8">
          <div>
            <div className="flex items-center gap-3">
              <Calendar className="h-7 w-7 text-primary-foreground" />
              <h1 className="text-3xl font-bold text-primary-foreground">Planning d'Irrigation</h1>
            </div>
            <p className="text-primary-foreground/80 mt-1">Généré automatiquement selon le type de culture et le stade de croissance</p>
          </div>
        </div>
      </div>

      {/* Parcel Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedParcelId} onValueChange={setSelectedParcelId}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Choisir une parcelle" /></SelectTrigger>
          <SelectContent>
            {parcels.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  <img src={getCropImage(p.crop_type)} className="h-5 w-5 rounded object-cover" alt="" />
                  {p.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!parcelIsRainfed && selectedParcel && (
          <Button onClick={generateSchedule} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Générer le Planning
          </Button>
        )}
      </div>

      {parcelIsRainfed && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <div>
              <p className="font-semibold">Parcelle Pluviale</p>
              <p className="text-sm text-muted-foreground">Cette parcelle dépend des pluies. L'irrigation automatique n'est pas disponible.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!parcelIsRainfed && selectedParcel && (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Info className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Recommandation pour {selectedParcel.crop_type}</p>
                <p className="text-sm text-muted-foreground">
                  Irriguer tous les <strong>{irrigationInterval} jours</strong> ({maxIrrigationsPerWeek} fois/semaine) •
                  Durée optimale: <strong>{getOptimalDuration(selectedParcel.growth_stage || "vegetative", selectedParcel.crop_type)} min</strong>
                  {tooManyIrrigations && <span className="text-destructive ml-1">⚠️ Trop d'irrigations !</span>}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Visual */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Vue Hebdomadaire</CardTitle>
              <CardDescription>Le planning est généré automatiquement selon les règles agronomiques</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, idx) => {
                  const daySchedules = schedules.filter(s => s.day_of_week === idx);
                  const hasSchedule = daySchedules.length > 0;
                  return (
                    <div key={idx} className={`rounded-xl border p-3 text-center min-h-[120px] transition-colors ${hasSchedule ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-muted/30"}`}>
                      <p className="font-medium text-sm mb-2">{day.slice(0, 3)}</p>
                      {daySchedules.map(s => (
                        <div key={s.id} className="mb-1">
                          <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {s.start_time?.slice(0, 5)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
                        </div>
                      ))}
                      {!hasSchedule && <p className="text-xs text-muted-foreground mt-6">—</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Schedule List */}
          <Card className="shadow-md">
            <CardHeader><CardTitle>Détails des Planifications</CardTitle></CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Cliquez sur "Générer le Planning" pour créer automatiquement le programme d'irrigation.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedules.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Droplets className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{DAYS[s.day_of_week]}</p>
                          <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} • {s.duration_minutes} minutes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={s.is_active} onCheckedChange={() => toggleSchedule(s.id, s.is_active)} />
                        <Button size="sm" variant="ghost" onClick={() => deleteSchedule(s.id)} className="text-destructive hover:text-destructive">
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
