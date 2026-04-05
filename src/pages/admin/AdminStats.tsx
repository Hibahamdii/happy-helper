import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

export default function AdminStats() {
  const [waterByParcel, setWaterByParcel] = useState<any[]>([]);
  const [irrigationTypes, setIrrigationTypes] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: parcels } = await supabase.from("parcels").select("id, name");
    const { data: logs } = await supabase.from("irrigation_logs").select("*");

    if (parcels && logs) {
      const byParcel = parcels.map((p) => {
        const parcelLogs = logs.filter((l) => l.parcel_id === p.id);
        return {
          name: p.name,
          liters: Math.round(parcelLogs.reduce((a, l) => a + l.water_volume_liters, 0)),
          count: parcelLogs.length,
        };
      }).filter((p) => p.liters > 0);
      setWaterByParcel(byParcel);

      const typeMap: Record<string, number> = {};
      logs.forEach((l) => {
        typeMap[l.decision_type] = (typeMap[l.decision_type] || 0) + 1;
      });
      setIrrigationTypes(Object.entries(typeMap).map(([name, value]) => ({
        name: name === "manual" ? "Manuel" : name === "automatic" ? "Automatique" : "Planifié",
        value,
      })));
    }
  };

  const COLORS = ["hsl(142, 64%, 32%)", "hsl(200, 80%, 50%)", "hsl(38, 92%, 50%)"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Statistiques</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Consommation d'Eau par Parcelle</CardTitle></CardHeader>
          <CardContent>
            {waterByParcel.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={waterByParcel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="liters" fill="hsl(142, 64%, 32%)" name="Litres" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Types d'Irrigation</CardTitle></CardHeader>
          <CardContent>
            {irrigationTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={irrigationTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                    {irrigationTypes.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
