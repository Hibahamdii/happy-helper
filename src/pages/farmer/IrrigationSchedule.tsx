import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Calendar, Clock, Plus, Trash2, Droplets, AlertTriangle, Info } from "lucide-react";
import { getIrrigationIntervalDays, isRainfed } from "@/lib/agronomic";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function IrrigationSchedule() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New schedule form
  const [newDay, setNewDay] = useState("1");
  const [newTime, setNewTime] = useState("06:00");
  const [newDuration, setNewDuration] = useState(30);

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

  const addSchedule = async () => {
    if (!selectedParcelId) return;
    setLoading(true);
    const { error } = await supabase.from("irrigation_schedules").insert({
      parcel_id: selectedParcelId,
      day_of_week: parseInt(newDay),
      start_time: newTime,
      duration_minutes: newDuration,
    });
    if (error) toast.error(error.message);
    else { toast.success("Planification ajoutée !"); loadSchedules(); }
    setLoading(false);
  };

  const toggleSchedule = async (id: string, isActive: boolean) => {
    await supabase.from("irrigation_schedules").update({ is_active: !isActive }).eq("id", id);
    loadSchedules();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("irrigation_schedules").delete().eq("id", id);
    toast.success("Planification supprimée");
    loadSchedules();
  };

  // Check if too many irrigations per week for this crop
  const activeDays = schedules.filter(s => s.is_active).length;
  const maxIrrigationsPerWeek = Math.floor(7 / irrigationInterval);
  const tooManyIrrigations = activeDays > maxIrrigationsPerWeek;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Planning d'Irrigation</h1>
        </div>
        <Select value={selectedParcelId} onValueChange={setSelectedParcelId}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Choisir une parcelle" /></SelectTrigger>
          <SelectContent>
            {parcels.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {parcelIsRainfed && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <div>
              <p className="font-semibold">Parcelle Pluviale</p>
              <p className="text-sm text-muted-foreground">Cette parcelle dépend des pluies. Aucune pompe requise. L'irrigation automatique n'est pas disponible.</p>
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
                  Irriguer tous les <strong>{irrigationInterval} jours</strong> maximum ({maxIrrigationsPerWeek} fois/semaine).
                  {tooManyIrrigations && <span className="text-destructive ml-1">⚠️ Trop d'irrigations planifiées !</span>}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly view */}
          <Card>
            <CardHeader>
              <CardTitle>Vue Hebdomadaire</CardTitle>
              <CardDescription>Planifiez les jours et heures d'irrigation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-6">
                {DAYS.map((day, idx) => {
                  const daySchedules = schedules.filter(s => s.day_of_week === idx);
                  const hasSchedule = daySchedules.length > 0;
                  return (
                    <div key={idx} className={`rounded-lg border p-3 text-center min-h-[120px] ${hasSchedule ? "bg-primary/5 border-primary/30" : ""}`}>
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
                      {!hasSchedule && <p className="text-xs text-muted-foreground mt-4">—</p>}
                    </div>
                  );
                })}
              </div>

              {/* Add schedule form */}
              <div className="flex items-end gap-4 flex-wrap border-t pt-4">
                <div className="space-y-2">
                  <Label>Jour</Label>
                  <Select value={newDay} onValueChange={setNewDay}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Heure</Label>
                  <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-[130px]" />
                </div>
                <div className="space-y-2">
                  <Label>Durée (min)</Label>
                  <Input type="number" min={5} value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} className="w-[100px]" />
                </div>
                <Button onClick={addSchedule} disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" /> Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule list */}
          <Card>
            <CardHeader><CardTitle>Toutes les Planifications</CardTitle></CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune planification. Ajoutez-en une ci-dessus.</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Droplets className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{DAYS[s.day_of_week]}</p>
                          <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} • {s.duration_minutes} minutes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={s.is_active} onCheckedChange={() => toggleSchedule(s.id, s.is_active)} />
                        <Button size="icon" variant="ghost" onClick={() => deleteSchedule(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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
