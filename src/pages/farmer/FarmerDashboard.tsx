import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Droplets, Thermometer, CloudRain, Activity, BarChart3 } from "lucide-react";
import ParcelMap from "@/components/map/ParcelMap";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalParcels: 0, totalArea: 0, totalIrrigations: 0, totalWater: 0 });
  const [recentReadings, setRecentReadings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    // Load parcels
    const { data: parcelsData } = await supabase
      .from("parcels")
      .select("*")
      .eq("owner_id", user!.id);

    if (parcelsData) {
      setParcels(parcelsData);
      setStats((s) => ({
        ...s,
        totalParcels: parcelsData.length,
        totalArea: parcelsData.reduce((a, p) => a + (p.area_hectares || 0), 0),
      }));

      // Load irrigation stats
      const parcelIds = parcelsData.map((p) => p.id);
      if (parcelIds.length > 0) {
        const { data: logs } = await supabase
          .from("irrigation_logs")
          .select("*")
          .in("parcel_id", parcelIds);

        if (logs) {
          setStats((s) => ({
            ...s,
            totalIrrigations: logs.length,
            totalWater: logs.reduce((a, l) => a + (l.water_volume_liters || 0), 0),
          }));
        }

        // Load recent sensor readings for chart
        const { data: sensors } = await supabase
          .from("sensors")
          .select("id, type, name")
          .in("parcel_id", parcelIds);

        if (sensors && sensors.length > 0) {
          const sensorIds = sensors.map((s) => s.id);
          const { data: readings } = await supabase
            .from("sensor_readings")
            .select("*, sensors!inner(type, name)")
            .in("sensor_id", sensorIds)
            .order("recorded_at", { ascending: false })
            .limit(50);

          if (readings) {
            // Group by recorded_at for chart
            const grouped = readings.reduce((acc: any, r: any) => {
              const time = new Date(r.recorded_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
              if (!acc[time]) acc[time] = { time };
              acc[time][r.sensors.type] = r.value;
              return acc;
            }, {});
            setRecentReadings(Object.values(grouped).reverse().slice(-20));
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de Bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Parcelles</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParcels}</div>
            <p className="text-xs text-muted-foreground">{stats.totalArea.toFixed(1)} ha au total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Irrigations</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIrrigations}</div>
            <p className="text-xs text-muted-foreground">sessions effectuées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eau Consommée</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalWater / 1000).toFixed(1)} m³</div>
            <p className="text-xs text-muted-foreground">volume total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Capteurs Actifs</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParcels * 3}</div>
            <p className="text-xs text-muted-foreground">humidité, température, pluie</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Carte des Parcelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParcelMap
              parcels={parcels}
              height="350px"
              onParcelClick={(id) => navigate(`/farmer/parcels/${id}`)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Dernières Lectures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReadings.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={recentReadings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="humidity" stroke="hsl(200, 80%, 50%)" name="Humidité (%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="temperature" stroke="hsl(0, 80%, 50%)" name="Température (°C)" strokeWidth={2} />
                  <Line type="monotone" dataKey="rain" stroke="hsl(142, 64%, 32%)" name="Pluie (mm)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                <p>Aucune donnée de capteur disponible. Ajoutez des parcelles et des lectures.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
