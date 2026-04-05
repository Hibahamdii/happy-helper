import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Sun, Droplets, Clock, Thermometer } from "lucide-react";
import { getWeatherForecast, type WeatherForecast } from "@/lib/weather";
import { calculateForecastIrrigation, type ForecastIrrigation } from "@/lib/irrigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function IrrigationForecast() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>("");
  const [weather, setWeather] = useState<WeatherForecast[]>([]);
  const [forecast, setForecast] = useState<ForecastIrrigation[]>([]);
  const [pump, setPump] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadParcels();
  }, [user]);

  useEffect(() => {
    if (selectedParcelId) loadForecast();
  }, [selectedParcelId]);

  const loadParcels = async () => {
    const { data } = await supabase.from("parcels").select("*").eq("owner_id", user!.id);
    setParcels(data || []);
    if (data && data.length > 0) setSelectedParcelId(data[0].id);
  };

  const loadForecast = async () => {
    const parcel = parcels.find((p) => p.id === selectedParcelId);
    if (!parcel) return;

    setLoading(true);

    const { data: pumpData } = await supabase.from("pumps").select("*").eq("parcel_id", selectedParcelId).maybeSingle();
    setPump(pumpData);

    const weatherData = await getWeatherForecast(parcel.location_lat, parcel.location_lng);
    setWeather(weatherData);

    if (pumpData) {
      const forecastData = calculateForecastIrrigation(
        weatherData,
        parcel.crop_type,
        parcel.soil_type,
        parcel.area_hectares,
        pumpData.flow_rate_lph
      );
      setForecast(forecastData);
    }

    setLoading(false);
  };

  const chartData = forecast.map((f) => ({
    date: new Date(f.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    "ET crop (mm)": f.etc,
    "Pluie effective (mm)": f.effectiveRain,
    "Déficit (mm)": f.waterDeficit,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prévisions d'Irrigation</h1>
        <Select value={selectedParcelId} onValueChange={setSelectedParcelId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Choisir une parcelle" />
          </SelectTrigger>
          <SelectContent>
            {parcels.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement des prévisions...</p>
      ) : (
        <>
          {/* Weather forecast cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {weather.map((w) => (
              <Card key={w.date}>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    {new Date(w.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                  </p>
                  {w.rain_mm > 0 ? (
                    <CloudRain className="h-8 w-8 mx-auto my-2 text-blue-500" />
                  ) : (
                    <Sun className="h-8 w-8 mx-auto my-2 text-yellow-500" />
                  )}
                  <p className="text-sm font-bold">{w.temp_min}° / {w.temp_max}°</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Droplets className="h-3 w-3 inline mr-1" />{w.rain_mm} mm
                  </p>
                  <p className="text-xs text-muted-foreground">{w.humidity}% hum.</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Bilan Hydrique Prévisionnel (7 jours)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} label={{ value: "mm", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ET crop (mm)" fill="hsl(0, 80%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pluie effective (mm)" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Déficit (mm)" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Forecast table */}
          <Card>
            <CardHeader>
              <CardTitle>Plan d'Irrigation Recommandé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.map((f) => (
                  <div key={f.date} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">
                          {new Date(f.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ET₀: {f.et0} mm • ETc: {f.etc} mm • Pluie eff.: {f.effectiveRain} mm
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {f.needsIrrigation ? (
                        <>
                          <Badge className="bg-orange-100 text-orange-800">
                            <Droplets className="h-3 w-3 mr-1" />
                            {f.waterNeeded_liters.toLocaleString()} L
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            <Clock className="h-3 w-3 mr-1" />
                            {f.irrigationDuration_minutes} min
                          </Badge>
                        </>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Pas d'irrigation nécessaire</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
