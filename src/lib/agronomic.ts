// Agronomic rules: seasons, crops, growth stages, water needs

export const SEASONS = [
  { value: "spring", label: "Printemps 🌱" },
  { value: "summer", label: "Été ☀️" },
  { value: "autumn", label: "Automne 🍂" },
  { value: "winter", label: "Hiver ❄️" },
];

export const CROP_TYPES = [
  { value: "tomato", label: "Tomate 🍅" },
  { value: "potato", label: "Pomme de terre 🥔" },
  { value: "corn", label: "Maïs 🌽" },
  { value: "sunflower", label: "Tournesol 🌻" },
  { value: "soybean", label: "Soja 🫘" },
  { value: "pepper", label: "Poivron 🫑" },
  { value: "cucumber", label: "Concombre 🥒" },
  { value: "carrot", label: "Carotte 🥕" },
  { value: "broccoli", label: "Brocoli 🥦" },
  { value: "wheat", label: "Blé 🌾" },
  { value: "rice", label: "Riz 🍚" },
  { value: "olive", label: "Olive 🫒" },
  { value: "citrus", label: "Agrumes 🍊" },
  { value: "cotton", label: "Coton" },
];

export const SOIL_TYPES = [
  { value: "sand", label: "Sable 🏖️" },
  { value: "loam", label: "Limon 🌍" },
  { value: "clay", label: "Argile 🧱" },
  { value: "silt", label: "Limon fin" },
];

export const GROWTH_STAGES = [
  { value: "seeding", label: "Semis 🌱" },
  { value: "vegetative", label: "Végétatif 🌿" },
  { value: "flowering", label: "Floraison 🌸" },
  { value: "fruiting", label: "Fructification 🍎" },
  { value: "maturation", label: "Maturation 🌾" },
  { value: "harvest", label: "Récolte 🚜" },
];

export const WATER_SOURCES = [
  { value: "rainfed", label: "Pluviale (Pluie uniquement) 🌧️" },
  { value: "well", label: "Nappe phréatique (Puits) 💧" },
  { value: "canal", label: "Canal d'irrigation 🏞️" },
  { value: "drip", label: "Goutte-à-goutte 💦" },
  { value: "sprinkler", label: "Asperseur 🌊" },
];

// Crops valid per season
export const CROP_SEASON_COMPATIBILITY: Record<string, string[]> = {
  spring: ["tomato", "potato", "corn", "sunflower", "soybean", "pepper", "cucumber", "carrot", "broccoli", "wheat", "rice"],
  summer: ["tomato", "corn", "sunflower", "soybean", "pepper", "cucumber", "cotton", "rice"],
  autumn: ["potato", "carrot", "broccoli", "wheat", "olive", "citrus"],
  winter: ["wheat", "carrot", "broccoli", "olive", "citrus"],
};

// Growth stage Kc multiplier (relative to base Kc)
export const GROWTH_STAGE_KC_MULTIPLIER: Record<string, number> = {
  seeding: 0.4,
  vegetative: 0.7,
  flowering: 1.0,
  fruiting: 1.15,
  maturation: 0.8,
  harvest: 0.3,
};

// Min days between irrigations per crop (some plants shouldn't be irrigated daily)
export const CROP_IRRIGATION_INTERVAL: Record<string, number> = {
  tomato: 2,
  potato: 3,
  corn: 3,
  sunflower: 4,
  soybean: 3,
  pepper: 2,
  cucumber: 1,
  carrot: 3,
  broccoli: 2,
  wheat: 5,
  rice: 1,
  olive: 7,
  citrus: 5,
  cotton: 4,
};

export function isCropValidForSeason(crop: string, season: string): boolean {
  const validCrops = CROP_SEASON_COMPATIBILITY[season];
  if (!validCrops) return true;
  return validCrops.includes(crop);
}

export function getCropsForSeason(season: string) {
  const validCrops = CROP_SEASON_COMPATIBILITY[season] || [];
  return CROP_TYPES.filter(c => validCrops.includes(c.value));
}

export function isRainfed(waterSource: string): boolean {
  return waterSource === "rainfed";
}

export function getGrowthStageMultiplier(stage: string): number {
  return GROWTH_STAGE_KC_MULTIPLIER[stage] || 1.0;
}

export function getIrrigationIntervalDays(cropType: string): number {
  return CROP_IRRIGATION_INTERVAL[cropType] || 3;
}
