import type { EnvironmentalContext, ForecastDayDetailed, IndiaLocation, PredictedWeatherProblem, TerrainContext, WeatherPredictionReport } from "@shared/india";

export function decodeWmoWeather(code: number | null): { label: string; icon: string; severity: "calm" | "moderate" | "severe" | "extreme" } {
  if (code === null || code === undefined) {
    return { label: "Fair / Variable", icon: "CloudSun", severity: "calm" };
  }
  switch (code) {
    case 0:
      return { label: "Clear Sky", icon: "Sun", severity: "calm" };
    case 1:
      return { label: "Mainly Clear", icon: "SunDim", severity: "calm" };
    case 2:
      return { label: "Partly Cloudy", icon: "CloudSun", severity: "calm" };
    case 3:
      return { label: "Overcast", icon: "Cloud", severity: "calm" };
    case 45:
    case 48:
      return { label: "Fog / Depositing Rime Fog", icon: "CloudFog", severity: "moderate" };
    case 51:
      return { label: "Light Drizzle", icon: "CloudDrizzle", severity: "calm" };
    case 53:
      return { label: "Moderate Drizzle", icon: "CloudDrizzle", severity: "moderate" };
    case 55:
      return { label: "Dense Drizzle", icon: "CloudDrizzle", severity: "moderate" };
    case 56:
    case 57:
      return { label: "Freezing Drizzle", icon: "CloudSnow", severity: "moderate" };
    case 61:
      return { label: "Slight Rain", icon: "CloudRain", severity: "moderate" };
    case 63:
      return { label: "Moderate Rain", icon: "CloudRain", severity: "moderate" };
    case 65:
      return { label: "Heavy Rain", icon: "CloudRain", severity: "severe" };
    case 66:
    case 67:
      return { label: "Freezing Rain", icon: "CloudSnow", severity: "severe" };
    case 71:
      return { label: "Slight Snowfall", icon: "CloudSnow", severity: "moderate" };
    case 73:
      return { label: "Moderate Snowfall", icon: "CloudSnow", severity: "moderate" };
    case 75:
      return { label: "Heavy Snowfall", icon: "CloudSnow", severity: "severe" };
    case 77:
      return { label: "Snow Grains", icon: "CloudSnow", severity: "calm" };
    case 80:
      return { label: "Slight Rain Showers", icon: "CloudRain", severity: "moderate" };
    case 81:
      return { label: "Moderate Rain Showers", icon: "CloudRain", severity: "severe" };
    case 82:
      return { label: "Violent Rain Showers", icon: "CloudRain", severity: "extreme" };
    case 85:
    case 86:
      return { label: "Snow Showers", icon: "CloudSnow", severity: "severe" };
    case 95:
      return { label: "Thunderstorm", icon: "CloudLightning", severity: "severe" };
    case 96:
      return { label: "Thunderstorm with Slight Hail", icon: "CloudLightning", severity: "extreme" };
    case 99:
      return { label: "Thunderstorm with Heavy Hail", icon: "CloudLightning", severity: "extreme" };
    default:
      return { label: `Weather code ${code}`, icon: "CloudSun", severity: "calm" };
  }
}

const HILLY_OR_LANDSLIDE_PRONE_REGIONS = [
  "wayanad", "idukki", "kottayam", "pathanamthitta", "joshimath", "chamoli",
  "uttarkashi", "rudraprayag", "dehradun", "shimla", "mandi", "kullu", "kinnaur",
  "munnar", "darjeeling", "nilgiris", "kodagu", "dindigul", "chikkamagaluru",
  "gangtok", "east sikkim", "west sikkim"
];

function isHillyOrLandslideProne(location: IndiaLocation, terrain?: TerrainContext): boolean {
  const nameLower = (location.name || "").toLowerCase();
  const stateLower = (location.address.state || "").toLowerCase();
  const districtLower = (location.address.district || "").toLowerCase();

  const matchesKnown = HILLY_OR_LANDSLIDE_PRONE_REGIONS.some(region =>
    nameLower.includes(region) || districtLower.includes(region)
  );
  if (matchesKnown) return true;

  if (stateLower.includes("himachal") || stateLower.includes("uttarakhand") || stateLower.includes("sikkim")) {
    return true;
  }

  if (terrain && (((terrain.elevationMeters ?? 0) > 600) || ((terrain.slopeDegrees ?? 0) > 14))) {
    return true;
  }

  return false;
}

export function predictProblemsFromWeather(
  env: {
    temperatureC: number | null;
    apparentTemperatureC?: number | null;
    relativeHumidityPct?: number | null;
    precipitationMm: number | null;
    surfacePressureHpa?: number | null;
    windSpeedKph?: number | null;
    windGustKph?: number | null;
    windDirectionDeg?: number | null;
    uvIndex?: number | null;
    weatherCode: number | null;
    usAqi: number | null;
    pm25: number | null;
    forecast: ForecastDayDetailed[];
  },
  location: IndiaLocation,
  terrain?: TerrainContext
): WeatherPredictionReport {
  const problems: PredictedWeatherProblem[] = [];
  const nextDay = env.forecast[0];
  const next2Days = env.forecast.slice(0, 2);

  const maxProb = Math.max(...next2Days.map(d => d.precipitationProbability ?? 0), 0);
  const maxRainSum = Math.max(...next2Days.map(d => d.precipitationSumMm ?? 0), env.precipitationMm ?? 0);
  const maxWindGust = Math.max(...next2Days.map(d => d.windGustMaxKph ?? 0), env.windGustKph ?? 0);
  const maxTemp = Math.max(...next2Days.map(d => d.temperatureMaxC ?? 0), env.temperatureC ?? 0);
  const maxApparentTemp = Math.max(
    ...next2Days.map(d => d.apparentTemperatureMaxC ?? d.temperatureMaxC ?? 0),
    env.apparentTemperatureC ?? env.temperatureC ?? 0
  );
  const maxUv = Math.max(...next2Days.map(d => d.uvIndexMax ?? 0), env.uvIndex ?? 0);

  const isThunderstorm = [95, 96, 99].includes(env.weatherCode ?? -1) ||
    next2Days.some(d => [95, 96, 99].includes(d.weatherCode ?? -1));
  const hasHail = [96, 99].includes(env.weatherCode ?? -1) ||
    next2Days.some(d => [96, 99].includes(d.weatherCode ?? -1));
  const isViolentRain = [65, 82].includes(env.weatherCode ?? -1) ||
    next2Days.some(d => [65, 82].includes(d.weatherCode ?? -1));

  // 1. Flash Flood & Urban Waterlogging Hazard
  if ((maxRainSum >= 12 && maxProb >= 60) || isThunderstorm || isViolentRain || (env.precipitationMm ?? 0) >= 6) {
    const isCritical = maxRainSum >= 40 || hasHail || env.weatherCode === 82;
    const isHigh = maxRainSum >= 20 || isThunderstorm || maxProb >= 75;
    const severity = isCritical ? "CRITICAL" : isHigh ? "HIGH" : "MODERATE";

    const causalFactors: string[] = [];
    if (maxProb > 0) causalFactors.push(`High precipitation probability (${maxProb}%)`);
    if (maxRainSum > 0) causalFactors.push(`Anticipated rainfall volume (${maxRainSum.toFixed(1)} mm)`);
    if (isThunderstorm) causalFactors.push(hasHail ? "Convective storm system with hail activity" : "Active thunderstorm dynamics");
    if ((env.precipitationMm ?? 0) > 0) causalFactors.push(`Active current surface rainfall (${env.precipitationMm} mm)`);

    problems.push({
      id: "pred-flash-flood",
      category: "FLASH_FLOOD",
      title: "Flash Flood & Waterlogging Risk",
      severity,
      triggerHorizon: "Immediate to Next 24 Hours",
      probabilityPct: Math.min(Math.max(maxProb, isThunderstorm ? 80 : 65), 96),
      causalFactors,
      anticipatedImpact: "Rapid stormwater runoff exceeding local municipal drainage thresholds; flash inundation of underpasses, culverts, and low-lying habitations.",
      immediateDirectives: [
        "Pre-position high-capacity dewatering pump sets at known bottleneck depressions.",
        "Alert municipal flood control cell and dispatch quick-reaction clearing teams to stormwater drains.",
        "Issue safety advisories to habitations within 200m of natural river/stream corridors."
      ]
    });
  }

  // 2. Landslide & Slope Failure Hazard (Hilly / Mountainous regions)
  const isHilly = isHillyOrLandslideProne(location, terrain);
  if (isHilly && (maxRainSum >= 15 || maxProb >= 65 || (env.precipitationMm ?? 0) >= 8 || isThunderstorm)) {
    const isCritical = maxRainSum >= 45 || (isThunderstorm && maxRainSum >= 25);
    const severity = isCritical ? "CRITICAL" : "HIGH";

    const causalFactors: string[] = [
      `Steep topographical slope profile and vulnerable hill geomorphology`,
      `Cumulative moisture saturation forecast (${maxRainSum.toFixed(1)} mm)`
    ];
    if (maxProb >= 65) causalFactors.push(`High rainfall probability (${maxProb}%) triggering pore-water pressure spike`);

    problems.push({
      id: "pred-landslide",
      category: "LANDSLIDE",
      title: "Slope Instability & Debris Flow Warning",
      severity,
      triggerHorizon: "Next 12 to 36 Hours",
      probabilityPct: Math.min(Math.max(maxProb - 5, 70), 92),
      causalFactors,
      anticipatedImpact: "Shear failure along weathered regolith layers, mudslides across mountain highways, potential isolation of uphill hamlets.",
      immediateDirectives: [
        "Restrict night-time vehicular transit on high-gradient ghat corridors.",
        "Initiate preventive evacuation of vulnerable households located directly under steep cut-slopes.",
        "Position heavy earth-moving equipment at strategic junction nodes for rapid debris clearance."
      ]
    });
  }

  // 3. Extreme Heatwave & Dehydration Emergency
  if (maxApparentTemp >= 37 || maxTemp >= 38 || (maxTemp >= 35 && maxUv >= 7.5)) {
    const isCritical = maxApparentTemp >= 42 || maxTemp >= 43;
    const isHigh = maxApparentTemp >= 39 || maxTemp >= 40;
    const severity = isCritical ? "CRITICAL" : isHigh ? "HIGH" : "MODERATE";

    const causalFactors: string[] = [];
    if (maxApparentTemp >= 37) causalFactors.push(`Elevated apparent temperature index (feels like ${maxApparentTemp.toFixed(1)}°C)`);
    if (maxTemp >= 37) causalFactors.push(`High ambient peak temperature (${maxTemp.toFixed(1)}°C)`);
    if (maxUv >= 7) causalFactors.push(`Intense solar radiation (UV Index ${maxUv.toFixed(1)})`);

    problems.push({
      id: "pred-heatwave",
      category: "HEATWAVE",
      title: "Extreme Heatwave & Thermal Stress Advisory",
      severity,
      triggerHorizon: "Daytime Peak (11:00 to 16:00 IST)",
      probabilityPct: Math.min(Math.round(85 + (maxApparentTemp - 37) * 2), 98),
      causalFactors,
      anticipatedImpact: "Acute risk of heatstroke, severe dehydration among outdoor workers, infants and elderly; electrical grid transformer overheating.",
      immediateDirectives: [
        "Enforce mandatory rest pauses and shade provision for construction and outdoor laborers between 12:00 and 15:30.",
        "Set up dedicated municipal drinking water kiosks and Oral Rehydration Salt (ORS) distribution hubs.",
        "Keep district hospital emergency wards stocked with saline drips and ice packs."
      ]
    });
  }

  // 4. Squall, Gale & Wind Damage Hazard
  if (maxWindGust >= 38 || (env.windSpeedKph ?? 0) >= 30) {
    const isCritical = maxWindGust >= 60;
    const isHigh = maxWindGust >= 45;
    const severity = isCritical ? "CRITICAL" : isHigh ? "HIGH" : "MODERATE";

    const causalFactors: string[] = [
      `Peak gust velocity modelled at ${maxWindGust.toFixed(1)} km/h`,
      `Atmospheric pressure gradient flux`
    ];

    problems.push({
      id: "pred-squall-gale",
      category: "SQUALL_GALE",
      title: "Gale & Severe Squall Structural Alert",
      severity,
      triggerHorizon: "Next 6 to 18 Hours",
      probabilityPct: Math.min(Math.round(70 + maxWindGust / 2), 95),
      causalFactors,
      anticipatedImpact: "Uprooting of shallow-rooted roadside trees, collapse of unsecured tin roofs or hoardings, snap risk to overhead powerlines.",
      immediateDirectives: [
        "Advise coastal and inland fisherfolk to suspend boat navigation and secure craft.",
        "Inspect and reinforce temporary structural scaffoldings, billboards, and overhead cables.",
        "Deploy forest and power distribution quick-response teams equipped with mechanized tree-cutters."
      ]
    });
  }

  // 5. Severe Thunderstorm & Lightning Hazard
  if (isThunderstorm) {
    const severity = hasHail ? "CRITICAL" : "HIGH";
    problems.push({
      id: "pred-thunderstorm-lightning",
      category: "THUNDERSTORM_LIGHTNING",
      title: hasHail ? "Severe Hailstorm & Lightning Danger" : "Thunderstorm & Cloud-to-Ground Lightning Risk",
      severity,
      triggerHorizon: "Immediate Next 6 Hours",
      probabilityPct: Math.min(Math.max(maxProb, 80), 95),
      causalFactors: [
        hasHail ? "Deep convective vertical storm cell with hail generation" : "Active atmospheric convective instability",
        `High moisture convergence with elevated precipitation likelihood (${maxProb}%)`
      ],
      anticipatedImpact: "Lethal cloud-to-ground lightning discharge in open areas, crop bruising, damage to solar panel arrays and rooftop structures.",
      immediateDirectives: [
        "Broadcast immediate 'Stay Indoors' warnings via public address systems and SMS alerts.",
        "Advise agricultural workers to immediately evacuate open fields and avoid seeking shelter under isolated trees.",
        "Verify grounding/surge arrestors on municipal telemetry and emergency communication towers."
      ]
    });
  }

  // 6. Air Quality & Smog Emergency
  if ((env.usAqi ?? 0) >= 150 || (env.pm25 ?? 0) >= 55) {
    const isCritical = (env.usAqi ?? 0) >= 250 || (env.pm25 ?? 0) >= 120;
    const severity = isCritical ? "CRITICAL" : "HIGH";

    problems.push({
      id: "pred-air-pollution",
      category: "AIR_POLLUTION",
      title: "Hazardous Particulate Smog & Respiratory Alert",
      severity,
      triggerHorizon: "Ongoing / Morning Hours",
      probabilityPct: 90,
      causalFactors: [
        `Elevated particulate matter: PM2.5 at ${env.pm25?.toFixed(1)} µg/m³`,
        `US Air Quality Index recorded at ${env.usAqi} (Unhealthy category)`
      ],
      anticipatedImpact: "Acute respiratory distress, exacerbation of COPD and asthma, severe reduction in early morning driving visibility.",
      immediateDirectives: [
        "Advise vulnerable citizens to avoid strenuous outdoor activity and wear certified N95 masks.",
        "Deploy mechanical road sweepers and water sprinkling mist tankers on heavy traffic corridors.",
        "Alert pediatric and chest clinics for an influx of respiratory consultations."
      ]
    });
  }

  // Determine overall severity
  let overallRiskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" = "LOW";
  if (problems.some(p => p.severity === "CRITICAL")) {
    overallRiskLevel = "CRITICAL";
  } else if (problems.some(p => p.severity === "HIGH")) {
    overallRiskLevel = "HIGH";
  } else if (problems.some(p => p.severity === "MODERATE")) {
    overallRiskLevel = "MODERATE";
  }

  // Determine primary threat
  const primaryProblem = problems.find(p => p.severity === overallRiskLevel) || problems[0];
  const primaryThreat = primaryProblem ? primaryProblem.title : "Calm / Baseline Weather Outlook";

  // Synthesize grounded narrative
  let summaryNarrative: string;
  if (problems.length === 0) {
    summaryNarrative = `Real-time meteorological indicators for ${location.name} show stable atmospheric conditions with mild winds (${(env.windSpeedKph ?? 0).toFixed(0)} km/h) and low precipitation probability (${maxProb}%). No imminent severe weather hazard is detected for the next 48 hours.`;
  } else {
    const problemNames = problems.map(p => p.title).join("; ");
    summaryNarrative = `Live telemetry for ${location.name} indicates active hazards: ${problemNames}. Peak risk window is concentrated over ${primaryProblem?.triggerHorizon.toLowerCase() ?? "the upcoming 24 hours"} with probability reaching ${primaryProblem?.probabilityPct ?? 75}%. Immediate operational readiness recommended.`;
  }

  return {
    overallRiskLevel,
    summaryNarrative,
    primaryThreat,
    predictedProblems: problems,
    generatedAt: new Date().toISOString()
  };
}
