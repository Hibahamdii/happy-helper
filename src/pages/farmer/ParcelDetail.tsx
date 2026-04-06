import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Droplets, Thermometer, CloudRain, Gauge, Plus } from "lucide-react";
import ParcelMap from "@/components/map/ParcelMap";
import IrrigationDecisionCard from "@/components/irrigation/IrrigationDecisionCard";
import { makeIrrigationDecision } from "@/lib/irrigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ParcelDetail() {
  const { id } = useParams<{ id: string }>();
  const [parcel, setParcel] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [pump, setPump] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [irrigationLogs, setIrrigationLogs] = useState<any[]>([]);

  // Add reading form
  const [newHumidity, setNewHumidity] = useState<number>(0);
  const [newTemp, setNewTemp] = useState<number>(0);
  const [newRain, setNewRain] = useState<number>(0);

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  const loadAll = async () => {
    const { data: parcelData } = await supabase.from("parcels").select("*").eq("id", id!).maybeSingle();
    setParcel(parcelData);

    const { data: sensorsData } = await supabase.from("sensors").select("*").eq("parcel_id", id!);
    setSensors(sensorsData || []);

    const { data: pumpData } = await supabase.from("pumps").select("*").eq("parcel_id", id!).maybeSingle();
    setPump(pumpData);

    const { data: logsData } = await supabase
      .from("irrigation_logs")
      .select("*")
      .eq("parcel_id", id!)
      .order("created_at", { ascending: false })
      .limit(10);
    setIrrigationLogs(logsData || []);

    // Load readings
    if (sensorsData && sensorsData.length > 0) {
      const sensorIds = sensorsData.map((s) => s.id);
      const { data: readingsData } = await supabase
        .from("sensor_readings")
        .select("*, sensors!inner(type)")
        .in("sensor_id", sensorIds)
        .order("recorded_at", { ascending: false })
        .limit(100);

      setReadings(readingsData || []);

      // Build chart data
      const grouped: Record<string, any> = {};
      (readingsData || []).forEach((r: any) => {
        const time = new Date(r.recorded_at).toLocaleString("fr-FR", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        });
        if (!grouped[time]) grouped[time] = { time };
        grouped[time][r.sensors.type] = r.value;
      });
      setChartData(Object.values(grouped).reverse());
    }
  };

  const addReadings = async () => {
    if (!sensors.length) return;

    try {
      const inserts = sensors.map((s) => ({
        sensor_id: s.id,
        value: s.type === "humidity" ? newHumidity : s.type === "temperature" ? newTemp : newRain,
      }));

      const { error } = await supabase.from("sensor_readings").insert(inserts);
      if (error) throw error;

      toast.success("Lectures ajoutées !");
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getLatestReading = (type: string) => {
    const sensor = sensors.find((s) => s.type === type);
    if (!sensor) return null;
    const reading = readings.find((r: any) => r.sensor_id === sensor.id);
    return reading?.value ?? null;
  };

  const latestHumidity = getLatestReading("humidity");
  const latestTemp = getLatestReading("temperature");
  const latestRain = getLatestReading("rain");

  const decision = parcel && latestHumidity !== null && latestTemp !== null && latestRain !== null && pump
    ? makeIrrigationDecision(
        latestHumidity, latestTemp, latestRain,
        parcel.crop_type, parcel.soil_type, parcel.area_hectares,
        pump.flow_rate_lph, parcel.growth_stage || "vegetative"
      )
    : null;

  if (!parcel) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{parcel.name}</h1>
          <p className="text-muted-foreground">{parcel.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="capitalize">{parcel.crop_type}</Badge>
          <Badge variant="outline">{parcel.area_hectares} ha</Badge>
          <Badge variant="outline" className="capitalize">{parcel.soil_type}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Humidité Sol</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestHumidity !== null ? `${latestHumidity}%` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Température</CardTitle>
            <Thermometer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestTemp !== null ? `${latestTemp}°C` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pluie (24h)</CardTitle>
            <CloudRain className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestRain !== null ? `${latestRain} mm` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pompe</CardTitle>
            <Gauge className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pump ? `${pump.flow_rate_lph} L/h` : "—"}</div>
          </CardContent>
        </Card>
      </div>

      {decision && (
        <IrrigationDecisionCard decision={decision} parcelId={parcel.id} onIrrigated={loadAll} />
      )}

      <Tabs defaultValue="readings">
        <TabsList>
          <TabsTrigger value="readings">Capteurs</TabsTrigger>
          <TabsTrigger value="add">Ajouter Lectures</TabsTrigger>
          <TabsTrigger value="map">Carte</TabsTrigger>
          <TabsTrigger value="history">Historique Irrigation</TabsTrigger>
        </TabsList>

        <TabsContent value="readings">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Capteurs</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={11} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="humidity" stroke="hsl(200, 80%, 50%)" name="Humidité (%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="temperature" stroke="hsl(0, 80%, 50%)" name="Température (°C)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rain" stroke="hsl(142, 64%, 32%)" name="Pluie (mm)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">Aucune lecture disponible. Ajoutez des données de capteurs.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter des Lectures de Capteurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Humidité du sol (%)</Label>
                  <Input type="number" min="0" max="100" value={newHumidity} onChange={(e) => setNewHumidity(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Température (°C)</Label>
                  <Input type="number" min="-20" max="60" value={newTemp} onChange={(e) => setNewTemp(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Pluie dernières 24h (mm)</Label>
                  <Input type="number" min="0" value={newRain} onChange={(e) => setNewRain(Number(e.target.value))} />
                </div>
              </div>
              <Button onClick={addReadings} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Enregistrer les lectures
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardContent className="pt-6">
              <ParcelMap parcels={[parcel]} height="400px" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Irrigations</CardTitle>
            </CardHeader>
            <CardContent>
              {irrigationLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune irrigation enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {irrigationLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">
                          {new Date(log.executed_at).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">{log.notes}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="capitalize">{log.decision_type}</Badge>
                        <p className="text-sm mt-1">{log.water_volume_liters.toLocaleString()} L • {log.duration_minutes} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
