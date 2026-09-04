/**
 * Akashvani Multi-State Real Data Foundation
 * 
 * Centralized typed configuration for all 13 supported states:
 * 1. Assam, 2. Andhra Pradesh, 3. Maharashtra, 4. Karnataka, 5. Bihar, 6. Jharkhand,
 * 7. Mizoram, 8. Odisha, 9. Chhattisgarh, 10. Uttar Pradesh, 11. Rajasthan, 12. Tamil Nadu,
 * 13. Kerala (reference / historical validation)
 * 
 * Separate Source Dimensions:
 * - CEEW 2021 Climate Vulnerability Index
 * - DST Common Framework Climate Vulnerability Assessment
 * - XDI Gross Domestic Climate Risk (2050 built environment projections)
 * - DST 2024 District-Level Climate Risk Assessment
 */

export type SourceClassification =
  | "OFFICIAL"
  | "OBSERVED"
  | "LIVE_API"
  | "MODELLED"
  | "DERIVED"
  | "FIXTURE"
  | "USER_UPLOADED";

export interface DataProvenance {
  sourceName: string;
  sourceUrl?: string;
  sourceType: SourceClassification;
  observedAt: string | null;
  spatialResolution?: string;
  temporalCoverage?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
  provenanceLabel: string;
}

export interface TerrainContext {
  elevationMeters: number | null;
  slopeDegrees: number | null;
  terrainClass: string;
  source: string;
  timestamp: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
  status: "AVAILABLE" | "UNAVAILABLE" | "MODELLED_ESTIMATE";
}

export interface NearbyWaterBody {
  name: string;
  type: string;
  distanceKm?: number;
}

export interface HydrologyContext {
  nearestRiver: string | null;
  riverDistanceKm: number | null;
  basin: string | null;
  subBasin: string | null;
  watershed: string | null;
  nearbyWaterBodies: NearbyWaterBody[];
  floodplainIndicator: boolean | null;
  source: string;
  timestamp: string | null;
  status: "AVAILABLE" | "UNAVAILABLE" | "REGIONAL_MAPPING";
}

export interface InfrastructureFeature {
  id: string;
  name: string;
  type: string;
  category:
    | "hospital"
    | "emergency"
    | "road"
    | "rail"
    | "bridge"
    | "shelter"
    | "water"
    | "other";
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  source: string;
}

export interface CategorizedInfrastructure {
  hospitals: InfrastructureFeature[];
  emergencyFacilities: InfrastructureFeature[];
  roads: InfrastructureFeature[];
  rail: InfrastructureFeature[];
  bridges: InfrastructureFeature[];
  shelters: InfrastructureFeature[];
  waterFacilities: InfrastructureFeature[];
  totalCount: number;
  source: string;
  status: "LIVE_OSM_SAMPLE" | "UNAVAILABLE";
  observedAt: string | null;
}

export interface DistrictInfo {
  name: string;
  code?: string;
  stateCode: string;
  headquarters?: string;
  isFocusDistrict: boolean;
  terrainProfile?: string;
  primaryHazards?: string[];
  censusPopulation2011?: number | null;
  source?: string;
}

export interface StateConfig {
  name: string;
  code: string;
  centroid: [number, number]; // [longitude, latitude]
  defaultZoom: number;
  region: string;
  terrainProfile: string;
  primaryHazards: string[];
  secondaryHazards: string[];
  majorRiverSystems: string[];
  isCoastal: boolean;
  isHilly: boolean;
  historicalCaseCandidates: string[];
  sourceReferences: Record<string, string>;
  focusDistricts: string[];
}

export const STATE_CONFIGURATIONS: Record<string, StateConfig> = {
  AS: {
    name: "Assam",
    code: "AS",
    centroid: [92.9376, 26.2006],
    defaultZoom: 7,
    region: "Northeast",
    terrainProfile: "Floodplain & Brahmaputra Valley flanked by Karbi & Barail hills",
    primaryHazards: ["Riverine Flood", "Riverbank Erosion", "Flash Flood"],
    secondaryHazards: ["Earthquake", "Landslide", "Storm Surge"],
    majorRiverSystems: ["Brahmaputra", "Barak", "Subansiri", "Kopili", "Dihing"],
    isCoastal: false,
    isHilly: true,
    historicalCaseCandidates: [
      "Assam Floods 2022 (Silchar & Dhemaji)",
      "Assam Floods 2020 (Brahmaputra basin inundation)",
    ],
    sourceReferences: {
      climateVulnerability: "CEEW 2021 Climate Vulnerability Index (High exposure)",
      commonFramework: "DST Common Framework Assessment (Eastern Himalayan Region)",
      xdiRisk: "XDI Gross Domestic Climate Risk 2050 (Built environment physical exposure)",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Dhemaji",
      "Nagaon",
      "Dibrugarh",
      "Charaideo",
      "Sivasagar",
      "Golaghat",
      "South Salmara-Mankachar",
    ],
  },
  AP: {
    name: "Andhra Pradesh",
    code: "AP",
    centroid: [79.74, 15.9129],
    defaultZoom: 6.8,
    region: "South Coastal",
    terrainProfile: "Coromandel Coastal Plain, Eastern Ghats escarpment & Rayalaseema plateaus",
    primaryHazards: ["Tropical Cyclone", "Coastal Surge", "Riverine Flood"],
    secondaryHazards: ["Drought (Rayalaseema)", "Heatwave", "Urban Waterlogging"],
    majorRiverSystems: ["Godavari", "Krishna", "Penna", "Tungabhadra", "Nagavali"],
    isCoastal: true,
    isHilly: true,
    historicalCaseCandidates: [
      "Cyclone Hudhud 2014 (Visakhapatnam landfall)",
      "Godavari Floods 2022 (Polavaram & East Godavari inundation)",
    ],
    sourceReferences: {
      climateVulnerability: "CEEW 2021 Climate Vulnerability Index (Top cyclone exposed)",
      commonFramework: "DST Common Framework National Assessment",
      xdiRisk: "XDI Gross Domestic Climate Risk 2050",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "East Godavari",
      "Krishna",
      "Guntur",
      "Vizianagaram",
      "Kakinada region",
      "Visakhapatnam",
    ],
  },
  MH: {
    name: "Maharashtra",
    code: "MH",
    centroid: [75.7139, 19.7515],
    defaultZoom: 6.5,
    region: "Western Deccan",
    terrainProfile: "Konkan Coastal Strip, Western Ghats (Sahyadri) & Deccan Plateau",
    primaryHazards: ["Extreme Precipitation & Urban Flood", "Drought (Marathwada/Vidarbha)", "Cyclone"],
    secondaryHazards: ["Landslide (Konkan Ghats)", "Heatwave"],
    majorRiverSystems: ["Godavari", "Krishna", "Tapi", "Bhima", "Mula-Mutha", "Ulhas"],
    isCoastal: true,
    isHilly: true,
    historicalCaseCandidates: [
      "Mumbai Extreme Deluge July 2005",
      "Kolhapur & Sangli Floods 2019 / 2021",
      "Irshalwadi Landslide 2023",
    ],
    sourceReferences: {
      climateVulnerability: "CEEW 2021 Climate Vulnerability Index",
      xdiRisk: "XDI Gross Domestic Climate Risk 2050 (Top global built environment risk)",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Mumbai",
      "Nashik",
      "Pune",
      "Sangli",
      "Kolhapur",
      "Nanded",
      "Nandurbar",
    ],
  },
  KA: {
    name: "Karnataka",
    code: "KA",
    centroid: [75.7139, 15.3173],
    defaultZoom: 6.5,
    region: "Southern Deccan",
    terrainProfile: "Karavali Coastal Belt, Malnad Western Ghats & Bayaluseeme Plains",
    primaryHazards: ["Drought (North Interior)", "Riverine Flood", "Urban Inundation"],
    secondaryHazards: ["Landslide (Kodagu/Chikkamagaluru)", "Coastal Erosion"],
    majorRiverSystems: ["Krishna", "Kaveri", "Sharavathi", "Tungabhadra", "Netravati"],
    isCoastal: true,
    isHilly: true,
    historicalCaseCandidates: [
      "Kodagu Landslides & Floods 2018",
      "North Karnataka Krishna Basin Inundation 2019",
      "Bengaluru Urban Deluge September 2022",
    ],
    sourceReferences: {
      climateVulnerability: "CEEW 2021 Climate Vulnerability Index",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Bengaluru",
      "Kalaburagi",
      "Bidar",
      "Mysuru",
      "Chamarajanagar",
      "Kodagu",
      "Dakshina Kannada",
    ],
  },
  BR: {
    name: "Bihar",
    code: "BR",
    centroid: [85.3131, 25.0961],
    defaultZoom: 7,
    region: "Indo-Gangetic Plain",
    terrainProfile: "Flat Alluvial Floodplains divided by the Ganga into North and South Bihar",
    primaryHazards: ["Recurrent Riverine Flood", "River Avulsion", "Drought (South Bihar)"],
    secondaryHazards: ["Severe Lightning / Thunderstorm", "Heatwave", "Cold Wave"],
    majorRiverSystems: ["Ganga", "Kosi", "Gandak", "Bagmati", "Kamala", "Son"],
    isCoastal: false,
    isHilly: false,
    historicalCaseCandidates: [
      "Kosi River Avulsion & Flood 2008 (Kushaha breach)",
      "North Bihar Multi-River Deluge 2017 & 2019",
    ],
    sourceReferences: {
      climateVulnerability: "CEEW 2021 Climate Vulnerability Index (Top state vulnerability)",
      commonFramework: "DST Common Framework Climate Vulnerability Assessment",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Patna",
      "Darbhanga",
      "Sitamarhi",
      "Madhepura",
      "Khagaria",
      "Araria",
      "West Champaran",
    ],
  },
  JH: {
    name: "Jharkhand",
    code: "JH",
    centroid: [85.2799, 23.6102],
    defaultZoom: 7,
    region: "Chota Nagpur Plateau",
    terrainProfile: "Undulating Chota Nagpur Plateau with dissected scarps and valleys",
    primaryHazards: ["Agricultural Drought", "Severe Lightning", "Flash Flood in Gorges"],
    secondaryHazards: ["Forest Fire", "Heatwave", "Industrial Mine-Tailings Runoff"],
    majorRiverSystems: ["Subarnarekha", "Damodar", "Koel", "Kharkai", "Barakar"],
    isCoastal: false,
    isHilly: true,
    historicalCaseCandidates: [
      "Jharkhand Severe Drought 2022 (226 blocks affected)",
      "Damodar Basin Flash Inundation 2021",
    ],
    sourceReferences: {
      commonFramework: "DST Common Framework Climate Vulnerability Assessment (High vulnerability tier)",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Ranchi",
      "Jamshedpur",
      "Dhanbad",
      "Dumka",
      "Palamu",
      "Hazaribagh",
    ],
  },
  MZ: {
    name: "Mizoram",
    code: "MZ",
    centroid: [92.9376, 23.1645],
    defaultZoom: 7.5,
    region: "Northeast / Lushai Hills",
    terrainProfile: "North-South steep anticlinal ridges, narrow gorges and high slope instability",
    primaryHazards: ["Rain-Induced Landslide", "Flash Flood in Narrow Valleys", "Earthquake"],
    secondaryHazards: ["Severe Cyclonic Wind Impact", "Road Isolation"],
    majorRiverSystems: ["Tlawng", "Chhimtuipui (Kaladan)", "Tut", "Tuivawl"],
    isCoastal: false,
    isHilly: true,
    historicalCaseCandidates: [
      "Aizawl Cyclone Remal Landslides May 2024",
      "Mizoram Monsoon Landslide Disasters 2017",
    ],
    sourceReferences: {
      commonFramework: "DST Common Framework Climate Vulnerability Assessment (Top hill vulnerability)",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Aizawl",
      "Lunglei",
      "Champhai",
      "Lawngtlai",
    ],
  },
  OD: {
    name: "Odisha",
    code: "OD",
    centroid: [84.8035, 20.9517],
    defaultZoom: 6.8,
    region: "Eastern Coastal",
    terrainProfile: "Coastal Alluvial Delta, Northern Plateau & Eastern Ghats Rolling Hills",
    primaryHazards: ["Very Severe Cyclonic Storm", "Storm Surge", "Mahanadi Basin Flood"],
    secondaryHazards: ["Heatwave", "Lightning", "Drought (Western Odisha)"],
    majorRiverSystems: ["Mahanadi", "Brahmani", "Baitarani", "Rushikulya", "Subarnarekha"],
    isCoastal: true,
    isHilly: true,
    historicalCaseCandidates: [
      "Odisha Super Cyclone 1999 (Jagatsinghpur)",
      "Extremely Severe Cyclonic Storm Fani 2019 (Puri)",
      "Mahanadi Delta Floods 2020",
    ],
    sourceReferences: {
      commonFramework: "DST Common Framework Climate Vulnerability Assessment",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Puri",
      "Kendrapara",
      "Cuttack",
      "Ganjam",
      "Baleswar",
      "Gajapati",
      "Kandhamal",
    ],
  },
  CT: {
    name: "Chhattisgarh",
    code: "CT",
    centroid: [81.8661, 21.2787],
    defaultZoom: 6.7,
    region: "Central Highlands",
    terrainProfile: "Mahanadi Plain (Rice Bowl) surrounded by Northern Hills & Bastar Plateau",
    primaryHazards: ["Agricultural Drought", "Riverine Flash Flood", "Extreme Heat"],
    secondaryHazards: ["Lightning", "Forest Fire", "Erosion"],
    majorRiverSystems: ["Mahanadi", "Shivnath", "Indravati", "Hasdeo", "Arpa"],
    isCoastal: false,
    isHilly: true,
    historicalCaseCandidates: [
      "Mahanadi Basin Inundation 2020",
      "Chhattisgarh Prolonged Drought & Forest Fires 2018",
    ],
    sourceReferences: {
      commonFramework: "DST Common Framework Climate Vulnerability Assessment",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Raipur",
      "Bilaspur",
      "Bastar",
      "Durg",
      "Korba",
      "Raigarh",
    ],
  },
  UP: {
    name: "Uttar Pradesh",
    code: "UP",
    centroid: [80.9462, 26.8467],
    defaultZoom: 6.5,
    region: "Northern Plains",
    terrainProfile: "Vast flat Indo-Gangetic Alluvial Plain with Terai sub-Himalayan belt",
    primaryHazards: ["Riverine Flood (Ganga-Ghaghara-Rapti)", "Extreme Heatwave", "Cold Wave"],
    secondaryHazards: ["Drought (Bundelkhand)", "Severe Thunderstorm / Lightning"],
    majorRiverSystems: ["Ganga", "Yamuna", "Ghaghara", "Rapti", "Gomti", "Betwa"],
    isCoastal: false,
    isHilly: false,
    historicalCaseCandidates: [
      "Eastern UP Ghaghara & Rapti Deluge 2021 (Gorakhpur)",
      "Bundelkhand Recurrent Severe Drought 2015–2019",
      "Prayagraj Ganga-Yamuna Flood September 2022",
    ],
    sourceReferences: {
      xdiRisk: "XDI Gross Domestic Climate Risk 2050 (High absolute built environment risk)",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Gorakhpur",
      "Ballia",
      "Prayagraj",
      "Varanasi",
      "Lucknow",
      "Moradabad",
      "Budaun",
    ],
  },
  RJ: {
    name: "Rajasthan",
    code: "RJ",
    centroid: [74.2179, 27.0238],
    defaultZoom: 6.2,
    region: "Thar / Arid Northwest",
    terrainProfile: "Thar Desert, semi-arid sandy plains, divided by the Aravalli mountain range",
    primaryHazards: ["Severe Meteorological Drought", "Extreme Heatwave (50°C+)", "Desert Flash Flood"],
    secondaryHazards: ["Dust Storm / Andhi", "Cold Wave (Desert winter)"],
    majorRiverSystems: ["Chambal", "Luni", "Banas", "Mahi", "Sabarmati"],
    isCoastal: false,
    isHilly: true,
    historicalCaseCandidates: [
      "Barmer & Jalore Flash Floods 2017 & 2006",
      "Churu & Phalodi Severe Heatwave May 2024",
    ],
    sourceReferences: {
      districtRisk: "DST 2024 District-Level Climate Risk Assessment (Top drought hazard)",
      xdiRisk: "XDI Gross Domestic Climate Risk 2050",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Jaipur",
      "Jodhpur",
      "Jaisalmer",
      "Barmer",
      "Ajmer",
      "Nagaur",
      "Kota",
    ],
  },
  TN: {
    name: "Tamil Nadu",
    code: "TN",
    centroid: [78.6569, 11.1271],
    defaultZoom: 6.8,
    region: "Southern Coromandel",
    terrainProfile: "Coromandel Coastal Plain, Cauvery Delta & Western Ghats rain-shadow hills",
    primaryHazards: ["Northeast Monsoon Deluge & Urban Flood", "Cyclone", "Cauvery Delta Drought"],
    secondaryHazards: ["Coastal Surge", "Landslide (Nilgiris)"],
    majorRiverSystems: ["Kaveri", "Vaigai", "Palar", "Thamirabarani", "Bhavani"],
    isCoastal: true,
    isHilly: true,
    historicalCaseCandidates: [
      "Chennai Floods December 2015",
      "Cyclone Gaja 2018 (Cauvery Delta)",
      "South Tamil Nadu Extreme Inundation December 2023 (Tirunelveli)",
    ],
    sourceReferences: {
      xdiRisk: "XDI Gross Domestic Climate Risk 2050",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
      administrative: "geoBoundaries ADM1 & Census of India 2011",
    },
    focusDistricts: [
      "Chennai",
      "Nagapattinam",
      "Thanjavur",
      "Tirunelveli",
      "Virudhunagar",
      "Vellore",
      "Nilgiris",
    ],
  },
  KL: {
    name: "Kerala",
    code: "KL",
    centroid: [76.2711, 10.8505],
    defaultZoom: 7.2,
    region: "Malabar Coast",
    terrainProfile: "Highland Western Ghats, undulating Midlands & Arabian Sea Lowlands",
    primaryHazards: ["Extreme Monsoon Rainfall & Landslide", "Riverine Flood", "Coastal Erosion"],
    secondaryHazards: ["Dam Inflow Surge", "Waterlogging"],
    majorRiverSystems: ["Periyar", "Bharathappuzha", "Pamba", "Chaliyar", "Kabini"],
    isCoastal: true,
    isHilly: true,
    historicalCaseCandidates: [
      "Kerala Mega Floods 2018 (35 dams opened)",
      "Wayanad Chooralmala Landslides July 2024",
      "Kavalappara & Puthumala Landslides August 2019",
    ],
    sourceReferences: {
      administrative: "geoBoundaries ADM2 & Census of India 2011 (Embedded reference)",
      historicalValidation: "DIVA Kerala scenario dataset & Kerala State Disaster Management Authority",
      districtRisk: "DST 2024 District-Level Climate Risk Assessment",
    },
    focusDistricts: [
      "Wayanad",
      "Ernakulam",
      "Alappuzha",
      "Idukki",
      "Kozhikode",
    ],
  },
};

export interface NormalizedLocationContext {
  state: StateConfig | null;
  district: DistrictInfo | null;
  locality: string | null;
  category: "State" | "District" | "City" | "Locality" | "Place";
  latitude: number;
  longitude: number;
  boundingBox: [number, number, number, number] | null;
  boundaryStatus: "LOADED" | "UNAVAILABLE" | "BOUNDING_BOX_FALLBACK";
  population: number | null;
  populationStatus: "available" | "unavailable" | "modelled";
  populationSource: string;
  terrain: TerrainContext;
  hydrology: HydrologyContext;
  infrastructure: CategorizedInfrastructure;
  provenance: DataProvenance;
}

export function getStateByCode(code: string): StateConfig | undefined {
  return STATE_CONFIGURATIONS[code.toUpperCase()];
}

export function getStateByName(name: string): StateConfig | undefined {
  const normalized = name.trim().toLowerCase();
  return Object.values(STATE_CONFIGURATIONS).find(
    s => s.name.toLowerCase() === normalized
  );
}

export function getAllStates(): StateConfig[] {
  return Object.values(STATE_CONFIGURATIONS);
}

export function getStateFocusDistricts(stateCode: string): DistrictInfo[] {
  const state = getStateByCode(stateCode);
  if (!state) return [];
  return state.focusDistricts.map(name => ({
    name,
    stateCode: state.code,
    isFocusDistrict: true,
    source: `${state.name} Phase 3.1 prototype focus district list`,
  }));
}
