/**
 * ResQ Decision Intelligence Engine V3.1 — Calibration Benchmark Registry
 * 
 * Sourced from authoritative datasets (ISRO, CWC, IMD, BIS, GSI, NRSC).
 * Used during engine calibration and baseline verification.
 */

export type GroundTruthStatus = "VERIFIED" | "PROBABLE" | "UNAVAILABLE";

export interface ValidationBenchmark {
  id: string;
  name: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  slopeDegrees: number | null;
  elevationMeters: number | null;
  groundTruthPrimaryHazard: string[];
  groundTruthTiers: string[];
  groundTruthSource: string;
  groundTruthStatus: GroundTruthStatus;
  notes: string;
}

export const CALIBRATION_BENCHMARKS: ValidationBenchmark[] = [
  {
    id: "CAL-AS-DIB",
    name: "Dibrugarh",
    stateCode: "AS",
    latitude: 27.4728,
    longitude: 94.912,
    slopeDegrees: 2,
    elevationMeters: 108,
    groundTruthPrimaryHazard: ["FLOOD", "RIVERBANK_EROSION"],
    groundTruthTiers: ["RED", "ORANGE"],
    groundTruthSource: "CWC Brahmaputra Flood Forecasting; Brahmaputra Board bankline surveys 2022",
    groundTruthStatus: "VERIFIED",
    notes: "Brahmaputra annual flood corridor; Rohmoria active scouring reach",
  },
  {
    id: "CAL-BR-KHA",
    name: "Khagaria",
    stateCode: "BR",
    latitude: 25.5,
    longitude: 86.48,
    slopeDegrees: 1,
    elevationMeters: 36,
    groundTruthPrimaryHazard: ["FLOOD", "RIVERBANK_EROSION"],
    groundTruthTiers: ["RED"],
    groundTruthSource: "Bihar FMISC; CWC Ganga Division flood records 2019-2022",
    groundTruthStatus: "VERIFIED",
    notes: "Kosi-Ganga confluence; catastrophic 2007 river migration",
  },
  {
    id: "CAL-MH-SAN",
    name: "Sangli",
    stateCode: "MH",
    latitude: 16.85,
    longitude: 74.58,
    slopeDegrees: 2,
    elevationMeters: 550,
    groundTruthPrimaryHazard: ["FLOOD"],
    groundTruthTiers: ["ORANGE", "RED"],
    groundTruthSource: "CWC Irwin Bridge gauge (CWC-MH-SAN); NRSC 2019 satellite mapping; Maharashtra disaster records",
    groundTruthStatus: "VERIFIED",
    notes: "Upper Krishna flooding; 2019 event: 900+ villages, 100,000+ displaced",
  },
  {
    id: "CAL-KL-WAY",
    name: "Wayanad",
    stateCode: "KL",
    latitude: 11.6854,
    longitude: 76.132,
    slopeDegrees: 28,
    elevationMeters: 920,
    groundTruthPrimaryHazard: ["LANDSLIDE"],
    groundTruthTiers: ["RED", "ORANGE"],
    groundTruthSource: "ISRO Landslide Atlas 2023 (Rank #13/147); Kerala SDMA",
    groundTruthStatus: "VERIFIED",
    notes: "Slope >25 degrees; ISRO rank #13; 2019 mass wasting",
  },
  {
    id: "CAL-UK-CHA",
    name: "Chamoli",
    stateCode: "UK",
    latitude: 30.55,
    longitude: 79.56,
    slopeDegrees: 34,
    elevationMeters: 1890,
    groundTruthPrimaryHazard: ["LANDSLIDE", "SEISMIC"],
    groundTruthTiers: ["RED"],
    groundTruthSource: "BIS IS 1893:2016 Zone V; NRSC 2021 GLOF mapping; GSI Himalayan mass movement inventory",
    groundTruthStatus: "VERIFIED",
    notes: "BIS Zone V; 2021 Rishi Ganga GLOF; Joshimath subsidence 2023",
  },
  {
    id: "CAL-MZ-AIZ",
    name: "Aizawl",
    stateCode: "MZ",
    latitude: 23.7271,
    longitude: 92.7176,
    slopeDegrees: 24,
    elevationMeters: 1130,
    groundTruthPrimaryHazard: ["LANDSLIDE", "SEISMIC"],
    groundTruthTiers: ["RED", "ORANGE"],
    groundTruthSource: "BIS IS 1893:2016 Zone V; Mizoram SDMA records; ISRO NE India atlas",
    groundTruthStatus: "VERIFIED",
    notes: "Indo-Burma subduction; steep anticlinal ridges; high monsoon landslide frequency",
  },
  {
    id: "CAL-OD-PUR",
    name: "Puri",
    stateCode: "OD",
    latitude: 19.8135,
    longitude: 85.8312,
    slopeDegrees: 1,
    elevationMeters: 6,
    groundTruthPrimaryHazard: ["CYCLONE", "FLOOD"],
    groundTruthTiers: ["ORANGE", "RED"],
    groundTruthSource: "IMD Cyclone Division (Phailin 2013, Fani 2019 best tracks); NRSC storm surge maps",
    groundTruthStatus: "VERIFIED",
    notes: "Fani 2019 Category 5 direct landfall 2km south; low elevation coastal plain",
  },
  {
    id: "CAL-AP-VIS",
    name: "Visakhapatnam",
    stateCode: "AP",
    latitude: 17.6868,
    longitude: 83.2185,
    slopeDegrees: 4,
    elevationMeters: 14,
    groundTruthPrimaryHazard: ["CYCLONE"],
    groundTruthTiers: ["ORANGE", "RED"],
    groundTruthSource: "IMD Cyclone Division; NRSC Hudhud 2014 satellite assessment",
    groundTruthStatus: "VERIFIED",
    notes: "Hudhud 2014 Category 4 direct landfall; eastern seaboard cyclone corridor",
  },
  {
    id: "CAL-TN-CHE",
    name: "Chennai",
    stateCode: "TN",
    latitude: 13.0827,
    longitude: 80.2707,
    slopeDegrees: 1,
    elevationMeters: 8,
    groundTruthPrimaryHazard: ["CYCLONE", "FLOOD", "EXTREME_RAINFALL"],
    groundTruthTiers: ["ORANGE", "RED"],
    groundTruthSource: "IMD NE Monsoon records; 2015 Chennai mega-floods NRSC satellite mapping",
    groundTruthStatus: "VERIFIED",
    notes: "Coromandel coastal plain; 2015 100-year flood; recurrent NE monsoon inundation",
  },
  {
    id: "CAL-RJ-JOD",
    name: "Jodhpur",
    stateCode: "RJ",
    latitude: 26.2389,
    longitude: 73.0243,
    slopeDegrees: 2,
    elevationMeters: 231,
    groundTruthPrimaryHazard: ["DROUGHT", "EXTREME_HEAT", "FLOOD"],
    groundTruthTiers: ["GREEN", "ORANGE"],
    groundTruthSource: "DST National Climate Vulnerability Framework; IMD Climatological Normals 1971-2020; BIS IS 1893:2016 Zone II",
    groundTruthStatus: "VERIFIED",
    notes: "Arid Thar desert baseline; BIS Zone II; no active emergency trigger",
  },
];
