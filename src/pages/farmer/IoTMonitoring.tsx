import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Wifi, WifiOff, Thermometer, Droplets, CloudRain, Gauge, Search, Activity, Radio } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

export default function IoTMonitoring() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [sensors, setSensors] = useState<any[]>([]);
  const [pump, setPump] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [latestValues, setLatestValues] = useState<Record<string, number>>({});

  useEffect(() => { if (user) loadParcels(); }, [user]);
  useEffect(() => { if (selectedParcelId) loadSensors(); }, [selectedParcelId]);

  const loadParcels = async () => {
    const { data } = await supabase.from("parcels").select("*").eq("owner_id", user!.id);
    setParcels(data || []);
    if (data?.length) setSelectedParcelId(data[0].id);
  };

  const loadSensors = async () => {
    const { data: sensorsData } = await supabase.from("sensors").select("*").eq("parcel_id", selectedParcelId);
    setSensors(sensorsData || []);
    const { data: pumpData } = await supabase.from("pumps").select("*").eq("parcel_id", selectedParcelId).maybeSingle();
    setPump(pumpData);

    if (sensorsData?.length) {
      const sensorIds = sensorsData.map(s => s.id);
      const { data: readings } = await supabase
        .from("sensor_readings")
        .select("*, sensors!inner(type, name)")
        .in("sensor_id", sensorIds)
        .order("recorded_at", { ascending: false })
        .limit(100);

      if (readings) {
        const latest: Record<string, number> = {};
        const grouped: Record<string, any> = {};
        readings.forEach((r: any) => {
          if (!latest[r.sensors.type]) latest[r.sensors.type] = r.value;
          const time = new Date(r.recorded_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
          if (!grouped[time]) grouped[time] = { time };
          grouped[time][r.sensors.type] = r.value;
        });
        setLatestValues(latest);
        setChartData(Object.values(grouped).reverse());
      }
    } else {
      setLatestValues({});
      setChartData([]);
    }
  };

  const sensorConfig = [
    { type: "humidity", label: "Humidité Sol", icon: Droplets, unit: "%", color: "hsl(200, 80%, 50%)" },
    { type: "temperature", label: "Température", icon: Thermometer, unit: "°C", color: "hsl(0, 80%, 50%)" },
    { type: "rain", label: "Pluie (24h)", icon: CloudRain, unit: "mm", color: "hsl(210, 70%, 60%)" },
  ];

  const filteredSensors = sensors.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Monitoring IoT</h1>
        </div>
        <Select value={selectedParcelId} onValueChange={setSelectedParcelId}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Choisir une parcelle" /></SelectTrigger>
          <SelectContent>
            {parcels.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Live sensor cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sensorConfig.map(cfg => {
          const sensor = sensors.find(s => s.type === cfg.type);
          const value = latestValues[cfg.type];
          return (
            <Card key={cfg.type} className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
                <cfg.icon className="w-full h-full" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{cfg.label}</CardTitle>
                {sensor?.is_active ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <Wifi className="h-3 w-3 mr-1" /> En ligne
                  </Badge>
                ) : (
                  <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" /> Hors ligne</Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{value !== undefined ? `${value}${cfg.unit}` : "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">{sensor?.name || "Non configuré"}</p>
              </CardContent>
            </Card>
          );
        })}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
            <Gauge className="w-full h-full" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pompe</CardTitle>
            {pump?.is_active ? (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pump ? `${pump.flow_rate_lph} L/h` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{pump?.name || "Pas de pompe"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Humidité & Température</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="humidity" stroke="hsl(200, 80%, 50%)" fill="hsl(200, 80%, 50%)" fillOpacity={0.15} name="Humidité (%)" />
                  <Area type="monotone" dataKey="temperature" stroke="hsl(0, 80%, 50%)" fill="hsl(0, 80%, 50%)" fillOpacity={0.15} name="Température (°C)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucune donnée disponible</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CloudRain className="h-5 w-5" /> Pluviométrie</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="rain" stroke="hsl(210, 70%, 60%)" fill="hsl(210, 70%, 60%)" fillOpacity={0.2} name="Pluie (mm)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sensor list */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Capteurs</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un capteur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {filteredSensors.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Aucun capteur trouvé</p>
          ) : (
            <div className="space-y-2">
              {filteredSensors.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {s.is_active ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{s.type}</p>
                    </div>
                  </div>
                  <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Actif" : "Inactif"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
