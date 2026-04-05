import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Droplets, Activity } from "lucide-react";
import ParcelMap from "@/components/map/ParcelMap";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, parcels: 0, irrigations: 0, totalWater: 0 });
  const [parcels, setParcels] = useState<any[]>([]);
  const [cropDistribution, setCropDistribution] = useState<any[]>([]);
  const [irrigationByDay, setIrrigationByDay] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: profiles } = await supabase.from("profiles").select("id");
    const { data: parcelsData } = await supabase.from("parcels").select("*");
    const { data: logs } = await supabase.from("irrigation_logs").select("*");

    setParcels(parcelsData || []);

    setStats({
      users: profiles?.length || 0,
      parcels: parcelsData?.length || 0,
      irrigations: logs?.length || 0,
      totalWater: (logs || []).reduce((a, l) => a + (l.water_volume_liters || 0), 0),
    });

    // Crop distribution
    const cropMap: Record<string, number> = {};
    (parcelsData || []).forEach((p) => {
      cropMap[p.crop_type] = (cropMap[p.crop_type] || 0) + 1;
    });
    setCropDistribution(Object.entries(cropMap).map(([name, value]) => ({ name, value })));

    // Irrigation by day
    const dayMap: Record<string, number> = {};
    (logs || []).forEach((l) => {
      const day = new Date(l.executed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      dayMap[day] = (dayMap[day] || 0) + l.water_volume_liters;
    });
    setIrrigationByDay(Object.entries(dayMap).map(([day, liters]) => ({ day, liters: Math.round(liters) })));
  };

  const COLORS = ["hsl(142, 64%, 32%)", "hsl(200, 80%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 80%, 50%)", "hsl(270, 60%, 50%)"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Administrateur</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.users}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Parcelles</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.parcels}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Irrigations</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.irrigations}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Eau Totale</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{(stats.totalWater / 1000).toFixed(1)} m³</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Carte de toutes les Parcelles</CardTitle></CardHeader>
          <CardContent>
            <ParcelMap parcels={parcels} height="350px" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribution des Cultures</CardTitle></CardHeader>
          <CardContent>
            {cropDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={cropDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                    {cropDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucune parcelle enregistrée</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Consommation d'Eau par Jour</CardTitle></CardHeader>
        <CardContent>
          {irrigationByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={irrigationByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} label={{ value: "Litres", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Bar dataKey="liters" fill="hsl(142, 64%, 32%)" name="Litres" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Aucune donnée d'irrigation</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
