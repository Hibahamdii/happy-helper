const API_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY || "";

export interface WeatherForecast {
  date: string;
  temp_min: number;
  temp_max: number;
  humidity: number;
  rain_mm: number;
  description: string;
  icon: string;
}

export async function getWeatherForecast(lat: number, lng: number): Promise<WeatherForecast[]> {
  if (!API_KEY) {
    // Return simulated data if no API key
    return generateSimulatedForecast();
  }
  
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=fr`;
  const res = await fetch(url);
  if (!res.ok) return generateSimulatedForecast();
  
  const data = await res.json();
  const dailyMap = new Map<string, any>();

  for (const item of data.list) {
    const date = item.dt_txt.split(" ")[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        temps: [],
        humidities: [],
        rain: 0,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
      });
    }
    const day = dailyMap.get(date);
    day.temps.push(item.main.temp);
    day.humidities.push(item.main.humidity);
    day.rain += item.rain?.["3h"] || 0;
  }

  return Array.from(dailyMap.values()).slice(0, 7).map((d) => ({
    date: d.date,
    temp_min: Math.min(...d.temps),
    temp_max: Math.max(...d.temps),
    humidity: Math.round(d.humidities.reduce((a: number, b: number) => a + b, 0) / d.humidities.length),
    rain_mm: Math.round(d.rain * 10) / 10,
    description: d.description,
    icon: d.icon,
  }));
}

function generateSimulatedForecast(): WeatherForecast[] {
  const forecasts: WeatherForecast[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const rain = Math.random() > 0.6 ? Math.round(Math.random() * 15 * 10) / 10 : 0;
    forecasts.push({
      date: date.toISOString().split("T")[0],
      temp_min: 15 + Math.round(Math.random() * 8),
      temp_max: 25 + Math.round(Math.random() * 10),
      humidity: 40 + Math.round(Math.random() * 40),
      rain_mm: rain,
      description: rain > 0 ? "Pluie légère" : "Ensoleillé",
      icon: rain > 0 ? "10d" : "01d",
    });
  }
  return forecasts;
}
