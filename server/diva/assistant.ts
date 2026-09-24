import { invokeLLM } from "../_core/llm";

export interface ResqStructuredContext {
  locationName: string;
  category?: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  primaryHazard?: string;
  secondaryHazards?: string[];
  classificationZone?: string; // RED, ORANGE, YELLOW, GREEN, UNAVAILABLE
  classificationScore?: number | null;
  classificationReasons?: string[];
  exposedHabitations?: Array<{
    name: string;
    population?: number | null;
    exposureLevel?: string;
    hazardType?: string;
    distanceKm?: number;
  }>;
  relocationPriority?: string;
  facilitiesAvailable?: number;
  facilityBreakdown?: {
    hospitals: number;
    shelters: number;
    emergency: number;
  };
  facilityCapacityVerified: boolean;
  facilityCapacityNote?: string;
  selectedDestination?: {
    name: string;
    role?: string;
    suitability?: string;
    distanceKm?: number | null;
  } | null;
  evacuationRoute?: {
    isRoadRoute: boolean;
    distanceKm?: number | null;
    travelTimeMinutes?: number | null;
    sourceNote?: string;
  } | null;
  weatherConditions?: {
    temperatureC?: number | null;
    precipitationMm?: number | null;
    airQualityAqi?: number | null;
    status?: string;
  };
  unavailableData?: string[];
}

export interface AssistantExplanation {
  headline: string;
  primaryHazardExplanation: string;
  secondaryHazardsExplanation: string;
  classificationRationale: string;
  exposedHabitationsSummary: string;
  relocationPrioritySummary: string;
  facilitiesSummary: string;
  facilityCapacitySummary: string;
  selectedDestinationSummary: string;
  routeSummary: string;
  unavailableDataSummary: string;
  responderChecklist: string[];
  isDeterministicFallback: boolean;
  model: string;
  grounding: string;
  disclaimer: string;
  generatedAt: string;
}

export function buildDeterministicExplanation(ctx: ResqStructuredContext): AssistantExplanation {
  const primary = ctx.primaryHazard || (ctx.classificationZone === "RED" ? "Severe Multi-Hazard Exposure" : "Geographic Hazard Sensitivity");
  const secondaries = ctx.secondaryHazards?.length ? ctx.secondaryHazards.join(", ") : "No secondary triggers identified within active monitoring perimeter";
  const zone = ctx.classificationZone || "UNAVAILABLE";
  const score = ctx.classificationScore != null ? `${ctx.classificationScore}/100` : "Not scored";
  
  const reasons = ctx.classificationReasons?.length
    ? ctx.classificationReasons.join(". ")
    : `Location classified as ${zone} Zone based on regional seismic, geological, and hydrologic baselines.`;

  const exposedHab = ctx.exposedHabitations?.length
    ? `${ctx.exposedHabitations[0].name} (${ctx.exposedHabitations[0].exposureLevel || "Exposed"}, approx ${ctx.exposedHabitations[0].population ? ctx.exposedHabitations[0].population.toLocaleString("en-IN") + " people" : "unverified census population"})`
    : `No specific vulnerable habitation points isolated within immediate hazard footprint; district exposure screening active.`;

  const prio = ctx.relocationPriority || (zone === "RED" ? "Immediate" : zone === "ORANGE" ? "High" : "Moderate");

  const facCount = ctx.facilitiesAvailable ?? 0;
  const facBreakdown = ctx.facilityBreakdown
    ? `${ctx.facilityBreakdown.shelters} shelters/relief centres, ${ctx.facilityBreakdown.hospitals} hospitals, ${ctx.facilityBreakdown.emergency} emergency stations`
    : `${facCount} OpenStreetMap facilities identified`;

  const capVerified = ctx.facilityCapacityVerified
    ? "Verified shelter capacity available from local administrative registry."
    : "UNVERIFIED: OpenStreetMap records contain facility locations only; physical shelter capacity is unverified (strictly null).";

  const dest = ctx.selectedDestination
    ? `${ctx.selectedDestination.name} (${ctx.selectedDestination.suitability || "Suitable candidate"}, ${ctx.selectedDestination.distanceKm ? ctx.selectedDestination.distanceKm + " km" : "distance calculated on route"})`
    : "No verified safe-haven destination selected. Relocation screening required.";

  const route = ctx.evacuationRoute?.isRoadRoute
    ? `Verified roadway evacuation route via OSRM (${ctx.evacuationRoute.distanceKm ?? "—"} km, ~${ctx.evacuationRoute.travelTimeMinutes ?? "—"} min driving). Network roadway geometry.`
    : "Verified road route unavailable. Do not use straight-line geometry for emergency navigation.";

  const unavail = ctx.unavailableData?.length
    ? ctx.unavailableData.join("; ")
    : "Census habitation population unverified from real-time feeds; facility bed/shelter capacity unverified.";

  const checklist = [
    `1. Inspect physical access along ${ctx.selectedDestination?.name || "designated safe-haven"} roadway corridor.`,
    `2. Contact local district disaster management authority (DDMA) to confirm real shelter readiness.`,
    `3. Do NOT route mass evacuees to hospitals — reserve medical centres strictly for triage.`,
    `4. Monitor real-time rainfall & river gauges at ${ctx.locationName} for flash changes.`,
    `5. Confirm whether ground warnings match modelled ${zone} zone classification before issuing public directives.`,
  ];

  return {
    headline: `${ctx.locationName}: ${zone} Zone Assessment (${score})`,
    primaryHazardExplanation: `Primary hazard: ${primary}. Assessed from authoritative hazard spatial datasets.`,
    secondaryHazardsExplanation: `Secondary hazard factors: ${secondaries}.`,
    classificationRationale: reasons,
    exposedHabitationsSummary: exposedHab,
    relocationPrioritySummary: `Relocation priority is evaluated as ${prio}.`,
    facilitiesSummary: facBreakdown,
    facilityCapacitySummary: capVerified,
    selectedDestinationSummary: dest,
    routeSummary: route,
    unavailableDataSummary: `Data status & limitations: ${unavail}`,
    responderChecklist: checklist,
    isDeterministicFallback: true,
    model: "resq-deterministic-grounded-engine",
    grounding: "SUPPLIED RESQ STRUCTURED ANALYSIS ONLY",
    disclaimer: "AI-generated decision support. Grounded strictly in structured ResQ analysis. Not official government warning or advice.",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateResqExplanation(ctx: ResqStructuredContext): Promise<AssistantExplanation> {
  const fallback = buildDeterministicExplanation(ctx);
  
  try {
    const prompt = `You are the ResQ Disaster Intelligence Assistant. Explain the following structured analysis for ${ctx.locationName}.
Strict Rules:
- Ground strictly in the supplied JSON.
- Never invent risk scores, coordinates, or hazard claims.
- Never cite unverified capacity as verified.
- Emphasize that hospitals are medical facilities, not mass-evacuation shelters.
- State that this is decision support and not official government advice.

SUPPLIED ANALYSIS:
${JSON.stringify(ctx, null, 2)}`;

    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 1100,
      messages: [
        {
          role: "system",
          content: "You are the ResQ AI Decision Support Assistant. Produce a strictly grounded JSON response explaining the disaster assessment for incident commanders."
        },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resq_assistant_explanation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              headline: { type: "string" },
              primaryHazardExplanation: { type: "string" },
              secondaryHazardsExplanation: { type: "string" },
              classificationRationale: { type: "string" },
              exposedHabitationsSummary: { type: "string" },
              relocationPrioritySummary: { type: "string" },
              facilitiesSummary: { type: "string" },
              facilityCapacitySummary: { type: "string" },
              selectedDestinationSummary: { type: "string" },
              routeSummary: { type: "string" },
              unavailableDataSummary: { type: "string" },
              responderChecklist: { type: "array", items: { type: "string" } },
            },
            required: [
              "headline",
              "primaryHazardExplanation",
              "secondaryHazardsExplanation",
              "classificationRationale",
              "exposedHabitationsSummary",
              "relocationPrioritySummary",
              "facilitiesSummary",
              "facilityCapacitySummary",
              "selectedDestinationSummary",
              "routeSummary",
              "unavailableDataSummary",
              "responderChecklist",
            ],
            additionalProperties: false,
          }
        }
      }
    });

    const raw = response.choices[0]?.message.content;
    if (typeof raw !== "string") return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      isDeterministicFallback: false,
      model: "gpt-5-mini (ResQ Grounded)",
      grounding: "SUPPLIED RESQ STRUCTURED ANALYSIS ONLY",
      disclaimer: "AI-generated decision support. Grounded strictly in structured ResQ analysis. Not official government warning or advice.",
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}
