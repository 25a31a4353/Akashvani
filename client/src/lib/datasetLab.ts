import * as XLSX from "xlsx";
import shp from "shpjs";
import * as toGeoJSON from "@tmcw/togeojson";
import { fromArrayBuffer } from "geotiff";
import type { DatasetFormat, DatasetMapping, GeometryFeatureCollection } from "@shared/historical";

export type ParsedDataset = { file: File; format: DatasetFormat; schema: string[]; mapping: DatasetMapping; data: GeometryFeatureCollection; records?: Record<string, unknown>[]; parserNote?: string };

const aliases: Record<string, string[]> = {
  latitude: ["latitude", "lat", "y", "northing"], longitude: ["longitude", "lon", "lng", "long", "x", "easting"],
  population: ["population", "pop", "population_total", "pop_density", "population_density"], rainfall: ["rainfall", "rain_mm", "precipitation", "precip", "rain"],
  temperature: ["temperature", "temp", "temperature_c"], elevation: ["elevation", "dem", "altitude"], slope: ["slope", "slope_deg"],
  timestamp: ["timestamp", "date", "time", "datetime"], actual_population: ["affected_population", "actual_population", "population_affected"],
};

export function inferFormat(fileName: string): DatasetFormat {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "csv") return "CSV"; if (["xlsx", "xls"].includes(extension ?? "")) return "XLSX"; if (["geojson", "json"].includes(extension ?? "")) return "GEOJSON"; if (extension === "zip") return "SHP_ZIP"; if (["tif", "tiff"].includes(extension ?? "")) return "GEOTIFF"; if (extension === "kml") return "KML"; if (extension === "kmz") return "KMZ"; return "OTHER";
}

export function detectMapping(fields: string[]): DatasetMapping {
  const lowered = fields.map(field => ({ raw: field, normalized: field.toLowerCase().replace(/[\s-]+/g, "_") }));
  return Object.fromEntries(Object.entries(aliases).map(([canonical, candidates]) => [canonical, lowered.find(field => candidates.includes(field.normalized))?.raw ?? null]));
}

function asFeatureCollection(input: unknown): GeometryFeatureCollection {
  if (input && typeof input === "object" && (input as { type?: string }).type === "FeatureCollection") return input as GeometryFeatureCollection;
  if (input && typeof input === "object" && (input as { type?: string }).type === "Feature") return { type: "FeatureCollection", features: [input as GeometryFeatureCollection["features"][number]] };
  return { type: "FeatureCollection", features: [] };
}

export function recordsToFeatures(records: Record<string, unknown>[], mapping: DatasetMapping): GeometryFeatureCollection {
  const latitudeField = mapping.latitude; const longitudeField = mapping.longitude;
  if (!latitudeField || !longitudeField) return { type: "FeatureCollection", features: records.slice(0, 2_000).map(properties => ({ type: "Feature", properties, geometry: { type: "GeometryCollection", coordinates: [] } })) };
  return { type: "FeatureCollection", features: records.slice(0, 2_000).map((properties, index) => {
    const normalized = Object.fromEntries(Object.entries(mapping).filter((entry): entry is [string, string] => Boolean(entry[1])).map(([canonical, source]) => [canonical, properties[source]]));
    return { type: "Feature" as const, properties: { ...properties, ...normalized, _row: index + 1 }, geometry: { type: "Point" as const, coordinates: [Number(properties[longitudeField]), Number(properties[latitudeField])] } };
  }) };
}

export async function parseDatasetFile(file: File): Promise<ParsedDataset> {
  const format = inferFormat(file.name);
  if (format === "GEOJSON") { const data = asFeatureCollection(JSON.parse(await file.text())); const schema = Object.keys(data.features[0]?.properties ?? {}); return { file, format, schema, mapping: detectMapping(schema), data }; }
  if (format === "CSV" || format === "XLSX") { const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }); const schema = Object.keys(records[0] ?? {}); const mapping = detectMapping(schema); return { file, format, schema, mapping, records, data: recordsToFeatures(records, mapping) }; }
  if (format === "SHP_ZIP") { const parsed = await shp(await file.arrayBuffer()); const data = Array.isArray(parsed) ? asFeatureCollection(parsed[0]) : asFeatureCollection(parsed); const schema = Object.keys(data.features[0]?.properties ?? {}); return { file, format, schema, mapping: detectMapping(schema), data }; }
  if (format === "KML") { const xml = new DOMParser().parseFromString(await file.text(), "text/xml"); const data = asFeatureCollection(toGeoJSON.kml(xml)); const schema = Object.keys(data.features[0]?.properties ?? {}); return { file, format, schema, mapping: detectMapping(schema), data }; }
  if (format === "GEOTIFF") { const image = await (await fromArrayBuffer(await file.arrayBuffer())).getImage(); const schema = ["raster_width", "raster_height", "bbox"]; return { file, format, schema, mapping: detectMapping(schema), data: { type: "FeatureCollection", features: [] }, parserNote: `GeoTIFF metadata read: ${image.getWidth()} × ${image.getHeight()} pixels. Raster coverage is retained as an artifact; vector hazard comparison requires a vectorized observed or predicted layer.` }; }
  return { file, format, schema: [], mapping: {}, data: { type: "FeatureCollection", features: [] }, parserNote: format === "KMZ" ? "KMZ storage is supported; unpack to KML or GeoJSON for in-browser geometry validation." : "This file type is retained as a source artifact but needs a compatible spatial adapter before replay." };
}

export async function readBase64(file: File) { return String(await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); })).split(",")[1] ?? ""; }
