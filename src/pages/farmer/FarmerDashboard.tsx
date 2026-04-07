import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Droplets, Thermometer, Activity, BarChart3, Leaf, TrendingUp, Calendar } from "lucide-react";
import ParcelMap from "@/components/map/ParcelMap";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getCropImage } from "@/lib/cropImages";
import heroImg from "@/assets/hero-irrigation.jpg";
import { CROP_TYPES } from "@/lib/agronomic";

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

  const getCropLabel = (val: string) => CROP_TYPES.find(c => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <img src={heroImg} alt="Irrigation" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 flex items-center px-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">Bienvenue sur IrriSmart 🌿</h1>
            <p className="text-primary-foreground/90 mt-2 text-lg">Gérez vos parcelles et optimisez votre irrigation intelligemment</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Parcelles", value: stats.totalParcels, sub: `${stats.totalArea.toFixed(1)} ha`, icon: MapPin, gradient: "from-emerald-500/10 to-emerald-500/5" },
          { label: "Irrigations", value: stats.totalIrrigations, sub: "sessions", icon: Droplets, gradient: "from-blue-500/10 to-blue-500/5" },
          { label: "Eau Consommée", value: `${(stats.totalWater / 1000).toFixed(1)} m³`, sub: "volume total", icon: Activity, gradient: "from-cyan-500/10 to-cyan-500/5" },
          { label: "Capteurs Actifs", value: stats.totalParcels * 3, sub: "humidité, temp, pluie", icon: Thermometer, gradient: "from-orange-500/10 to-orange-500/5" },
        ].map((s, i) => (
          <Card key={i} className={`bg-gradient-to-br ${s.gradient} border-none shadow-md hover:shadow-lg transition-shadow`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="h-5 w-5 text-primary" />
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Parcels Quick View + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Parcels */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              Mes Parcelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parcels.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune parcelle. Ajoutez-en une !</p>
            ) : (
              <div className="space-y-3">
                {parcels.slice(0, 4).map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/farmer/parcels/${p.id}`)}
                  >
                    <img
                      src={getCropImage(p.crop_type)}
                      alt={p.crop_type}
                      className="h-12 w-12 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{getCropLabel(p.crop_type)} • {p.area_hectares} ha</p>
                    </div>
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Dernières Lectures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReadings.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={recentReadings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="humidity" stroke="hsl(200, 80%, 50%)" name="Humidité (%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="temperature" stroke="hsl(0, 80%, 50%)" name="Température (°C)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="rain" stroke="hsl(142, 64%, 32%)" name="Pluie (mm)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
                <p>Aucune donnée de capteur</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Carte des Parcelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParcelMap parcels={parcels} height="350px" onParcelClick={(id) => navigate(`/farmer/parcels/${id}`)} />
        </CardContent>
      </Card>
    </div>
  );
}
