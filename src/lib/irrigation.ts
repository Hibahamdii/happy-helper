import type { WeatherForecast } from "./weather";
import { getGrowthStageMultiplier } from "./agronomic";

// Crop coefficients (Kc) for different growth stages
const CROP_KC: Record<string, number> = {
  wheat: 1.15,
  corn: 1.2,
  tomato: 1.15,
  potato: 1.15,
  rice: 1.2,
  soybean: 1.15,
  cotton: 1.2,
  sunflower: 1.0,
  olive: 0.7,
  citrus: 0.65,
  default: 1.0,
};

// Soil field capacity and wilting point
const SOIL_PROPERTIES: Record<string, { fieldCapacity: number; wiltingPoint: number }> = {
  sand: { fieldCapacity: 15, wiltingPoint: 5 },
  loam: { fieldCapacity: 30, wiltingPoint: 12 },
  clay: { fieldCapacity: 40, wiltingPoint: 20 },
  silt: { fieldCapacity: 35, wiltingPoint: 15 },
  default: { fieldCapacity: 30, wiltingPoint: 12 },
};

export interface IrrigationDecision {
  needsIrrigation: boolean;
  waterNeeded_mm: number;
  waterNeeded_liters: number;
  irrigationDuration_minutes: number;
  reason: string;
  urgency: "none" | "low" | "medium" | "high" | "critical";
}

export interface ForecastIrrigation {
  date: string;
  et0: number;
  etc: number;
  effectiveRain: number;
  waterDeficit: number;
  needsIrrigation: boolean;
  waterNeeded_liters: number;
  irrigationDuration_minutes: number;
}

/**
 * Calculate reference evapotranspiration (ET0) using simplified Hargreaves method
 */
function calculateET0(tempMin: number, tempMax: number): number {
  const tempMean = (tempMin + tempMax) / 2;
  const Ra = 12; // Extraterrestrial radiation approximation (MJ/m²/day)
  return 0.0023 * (tempMean + 17.8) * Math.sqrt(tempMax - tempMin) * Ra;
}

/**
 * Calculate effective rainfall (portion of rain that benefits the crop)
 */
function effectiveRainfall(rainMm: number): number {
  if (rainMm <= 0) return 0;
  if (rainMm <= 25) return rainMm * 0.8;
  if (rainMm <= 75) return 20 + (rainMm - 25) * 0.6;
  return 50;
}

/**
 * Make irrigation decision based on current sensor data
 */
export function makeIrrigationDecision(
  soilHumidity: number,
  temperature: number,
  rainMm: number,
  cropType: string,
  soilType: string,
  areaHectares: number,
  pumpFlowRateLph: number,
  growthStage: string = "vegetative"
): IrrigationDecision {
  const soil = SOIL_PROPERTIES[soilType] || SOIL_PROPERTIES.default;
  const kc = CROP_KC[cropType] || CROP_KC.default;

  // Calculate ET0 using current temperature, adjusted for growth stage
  const et0 = calculateET0(temperature - 5, temperature + 5);
  const stageMultiplier = getGrowthStageMultiplier(growthStage);
  const etc = et0 * kc * stageMultiplier;

  // Effective rainfall
  const effRain = effectiveRainfall(rainMm);

  // Water deficit in mm
  const waterDeficit = Math.max(0, etc - effRain);

  // Check soil humidity against thresholds
  const humidityThreshold = soil.wiltingPoint + (soil.fieldCapacity - soil.wiltingPoint) * 0.5;
  const criticalThreshold = soil.wiltingPoint + (soil.fieldCapacity - soil.wiltingPoint) * 0.25;

  let needsIrrigation = false;
  let urgency: IrrigationDecision["urgency"] = "none";
  let reason = "";
  let waterNeeded_mm = 0;

  if (soilHumidity <= criticalThreshold) {
    needsIrrigation = true;
    urgency = "critical";
    waterNeeded_mm = soil.fieldCapacity - soilHumidity + waterDeficit;
    reason = `Humidité critique (${soilHumidity}% < ${criticalThreshold}%). Irrigation urgente requise.`;
  } else if (soilHumidity <= humidityThreshold && waterDeficit > 0) {
    needsIrrigation = true;
    urgency = "high";
    waterNeeded_mm = humidityThreshold - soilHumidity + waterDeficit;
    reason = `Humidité basse (${soilHumidity}%) et déficit hydrique de ${waterDeficit.toFixed(1)}mm.`;
  } else if (soilHumidity <= humidityThreshold) {
    needsIrrigation = true;
    urgency = "medium";
    waterNeeded_mm = humidityThreshold - soilHumidity;
    reason = `Humidité sous le seuil (${soilHumidity}% < ${humidityThreshold}%).`;
  } else if (waterDeficit > 2 && soilHumidity < soil.fieldCapacity * 0.75) {
    needsIrrigation = true;
    urgency = "low";
    waterNeeded_mm = waterDeficit;
    reason = `Déficit hydrique modéré (${waterDeficit.toFixed(1)}mm). Irrigation recommandée.`;
  } else {
    needsIrrigation = false;
    urgency = "none";
    reason = `Humidité suffisante (${soilHumidity}%) et pas de déficit hydrique significatif.`;
  }

  // Convert mm to liters: 1mm on 1 hectare = 10,000 liters
  const waterNeeded_liters = waterNeeded_mm * areaHectares * 10000;

  // Duration in minutes
  const irrigationDuration_minutes = pumpFlowRateLph > 0 ? (waterNeeded_liters / pumpFlowRateLph) * 60 : 0;

  return {
    needsIrrigation,
    waterNeeded_mm: Math.round(waterNeeded_mm * 10) / 10,
    waterNeeded_liters: Math.round(waterNeeded_liters),
    irrigationDuration_minutes: Math.round(irrigationDuration_minutes),
    reason,
    urgency,
  };
}

/**
 * Calculate 7-day irrigation forecast
 */
export function calculateForecastIrrigation(
  forecasts: WeatherForecast[],
  cropType: string,
  soilType: string,
  areaHectares: number,
  pumpFlowRateLph: number
): ForecastIrrigation[] {
  const kc = CROP_KC[cropType] || CROP_KC.default;

  return forecasts.map((f) => {
    const et0 = calculateET0(f.temp_min, f.temp_max);
    const etc = et0 * kc;
    const effRain = effectiveRainfall(f.rain_mm);
    const waterDeficit = Math.max(0, etc - effRain);
    const needsIrrigation = waterDeficit > 1;
    const waterNeeded_liters = waterDeficit * areaHectares * 10000;
    const irrigationDuration_minutes = pumpFlowRateLph > 0 ? (waterNeeded_liters / pumpFlowRateLph) * 60 : 0;

    return {
      date: f.date,
      et0: Math.round(et0 * 100) / 100,
      etc: Math.round(etc * 100) / 100,
      effectiveRain: Math.round(effRain * 100) / 100,
      waterDeficit: Math.round(waterDeficit * 100) / 100,
      needsIrrigation,
      waterNeeded_liters: Math.round(waterNeeded_liters),
      irrigationDuration_minutes: Math.round(irrigationDuration_minutes),
    };
  });
}
