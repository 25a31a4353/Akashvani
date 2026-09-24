import React, { useState } from "react";
import type { EnvironmentalContext, ForecastDayDetailed, IndiaLocationContext, PredictedWeatherProblem } from "@shared/india";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Gauge,
  Info,
  Layers,
  MapPin,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sun,
  SunDim,
  Thermometer,
  Users,
  Wind,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getWeatherIcon(iconName?: string, className = "h-5 w-5") {
  switch (iconName) {
    case "Sun":
      return <Sun className={cn(className, "text-amber-500")} />;
    case "SunDim":
      return <SunDim className={cn(className, "text-amber-400")} />;
    case "CloudSun":
      return <CloudSun className={cn(className, "text-sky-500")} />;
    case "Cloud":
      return <Cloud className={cn(className, "text-slate-400")} />;
    case "CloudFog":
      return <CloudFog className={cn(className, "text-slate-400")} />;
    case "CloudDrizzle":
      return <CloudDrizzle className={cn(className, "text-sky-400")} />;
    case "CloudRain":
      return <CloudRain className={cn(className, "text-blue-500")} />;
    case "CloudLightning":
      return <CloudLightning className={cn(className, "text-amber-500 animate-pulse")} />;
    default:
      return <CloudSun className={cn(className, "text-sky-500")} />;
  }
}

function getUvBadge(uv?: number | null) {
  if (uv === null || uv === undefined) return { label: "Unavailable", color: "bg-slate-100 text-slate-700" };
  if (uv < 3) return { label: "Low (Safe)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (uv < 6) return { label: "Moderate", color: "bg-amber-50 text-amber-700 border-amber-200" };
  if (uv < 8) return { label: "High Risk", color: "bg-orange-50 text-orange-700 border-orange-200" };
  if (uv < 11) return { label: "Very High", color: "bg-rose-50 text-rose-700 border-rose-200" };
  return { label: "Extreme", color: "bg-purple-50 text-purple-700 border-purple-200" };
}

function getAqiBadge(aqi?: number | null) {
  if (aqi === null || aqi === undefined) return { label: "Unavailable", color: "bg-slate-100 text-slate-700" };
  if (aqi <= 50) return { label: "Good (0–50)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (aqi <= 100) return { label: "Moderate", color: "bg-amber-50 text-amber-700 border-amber-200" };
  if (aqi <= 150) return { label: "Sensitive Groups", color: "bg-orange-50 text-orange-700 border-orange-200" };
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-rose-50 text-rose-700 border-rose-200" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-50 text-purple-700 border-purple-200" };
  return { label: "Hazardous", color: "bg-red-100 text-red-800 border-red-300" };
}

function getSeverityBadge(severity: PredictedWeatherProblem["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return "border-red-300 bg-red-50 text-red-700 font-extrabold";
    case "HIGH":
      return "border-orange-300 bg-orange-50 text-orange-700 font-bold";
    case "MODERATE":
      return "border-amber-300 bg-amber-50 text-amber-700 font-semibold";
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
}

export function LiveWeatherCommandCenter({ context }: { context: IndiaLocationContext }) {
  const { location, environment } = context;
  const [selectedForecastIndex, setSelectedForecastIndex] = useState<number>(0);

  const predictions = environment.predictions;
  const problems = predictions?.predictedProblems ?? [];
  const overallRisk = predictions?.overallRiskLevel ?? "LOW";
  const activeDay = environment.forecast[selectedForecastIndex] || environment.forecast[0];

  const observedDateStr = environment.observedAt
    ? new Date(environment.observedAt).toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Live telemetry connected";

  return (
    <section
      data-testid="live-weather-command-center"
      className="mt-4 overflow-hidden rounded-3xl border border-[#c3dde3] bg-[#fbfdfd] shadow-[0_16px_40px_rgba(20,55,75,0.06)]"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 border-b border-[#e2eff2] bg-gradient-to-r from-[#edf7f9] via-white to-[#f4fafb] p-4 sm:flex-row sm:items-center sm:justify-between lg:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#163d59] text-white shadow-md shadow-[#163d59]/20">
            <Radio className="h-5 w-5 animate-pulse text-[#8de0eb]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1b768a]">
                Live Weather & Predictive Problem Center
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Feed Active
              </span>
            </div>
            <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-[#163c58]">
              {location.name}
              <span className="ml-2 text-xs font-semibold text-[#66828f]">
                ({location.category} · {location.address.district ?? location.address.state ?? "India"})
              </span>
            </h2>
            <p className="mt-0.5 text-[11px] text-[#718b96]">
              Real-time atmospheric telemetry and AI hazard forecast · Observed {observedDateStr}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {location.population && (
            <div className="flex items-center gap-1.5 rounded-xl border border-[#d2e4e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#305566] shadow-sm">
              <Users className="h-3.5 w-3.5 text-[#1b768a]" />
              <span>{location.population.toLocaleString("en-IN")} residents</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#d2e4e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#305566] shadow-sm">
            <MapPin className="h-3.5 w-3.5 text-[#1b768a]" />
            <span>{location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Telemetry + Predictive Center */}
      <div className="p-4 lg:p-6">
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left Column: Live Weather Telemetry Gauges (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            {/* Current Weather Card */}
            <div className="relative overflow-hidden rounded-2xl border border-[#bfdce2] bg-gradient-to-br from-white to-[#f0f8fa] p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#698894]">Current Temperature</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight text-[#13384f]">
                      {environment.temperatureC !== null ? `${environment.temperatureC.toFixed(1)}°` : "—"}
                    </span>
                    <span className="text-sm font-semibold text-[#5a7683]">C</span>
                    {environment.apparentTemperatureC != null && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700 ring-1 ring-orange-200">
                        Feels like {environment.apparentTemperatureC.toFixed(1)}°C
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
                    {getWeatherIcon(
                      environment.weatherCode !== null && environment.weatherCode !== undefined
                        ? (environment.weatherCode >= 95 ? "CloudLightning" : environment.weatherCode >= 61 ? "CloudRain" : environment.weatherCode === 0 ? "Sun" : "CloudSun")
                        : "CloudSun",
                      "h-7 w-7"
                    )}
                  </div>
                  <span className="mt-1.5 text-right text-xs font-bold text-[#234b5e]">
                    {environment.weatherDescription ?? "Fair Weather"}
                  </span>
                </div>
              </div>

              {/* Live Metric Pills Grid */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {/* Humidity */}
                <div className="rounded-xl border border-[#d6e7eb] bg-white p-2.5 transition hover:border-[#b7dbe2]">
                  <div className="flex items-center gap-1.5 text-[#1b768a]">
                    <Droplets className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Humidity</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#1a3d52]">
                    {environment.relativeHumidityPct !== null && environment.relativeHumidityPct !== undefined
                      ? `${environment.relativeHumidityPct}%`
                      : "—"}
                  </p>
                  <p className="text-[9px] text-[#718b96]">Relative moisture</p>
                </div>

                {/* Surface Precipitation */}
                <div className="rounded-xl border border-[#d6e7eb] bg-white p-2.5 transition hover:border-[#b7dbe2]">
                  <div className="flex items-center gap-1.5 text-[#1b768a]">
                    <CloudRain className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Precip</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#1a3d52]">
                    {environment.precipitationMm !== null ? `${environment.precipitationMm} mm` : "0.0 mm"}
                  </p>
                  <p className="text-[9px] text-[#718b96]">Surface rainfall</p>
                </div>

                {/* Wind & Gusts */}
                <div className="rounded-xl border border-[#d6e7eb] bg-white p-2.5 transition hover:border-[#b7dbe2]">
                  <div className="flex items-center gap-1.5 text-[#1b768a]">
                    <Wind className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Wind</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#1a3d52]">
                    {environment.windSpeedKph !== null && environment.windSpeedKph !== undefined
                      ? `${Math.round(environment.windSpeedKph)}`
                      : "—"}{" "}
                    <span className="text-[10px] font-medium text-[#718b96]">km/h</span>
                  </p>
                  <p className="text-[9px] text-[#718b96]">
                    Gusts: {environment.windGustKph ? `${Math.round(environment.windGustKph)} km/h` : "Mild"}
                  </p>
                </div>

                {/* Surface Pressure */}
                <div className="rounded-xl border border-[#d6e7eb] bg-white p-2.5 transition hover:border-[#b7dbe2]">
                  <div className="flex items-center gap-1.5 text-[#1b768a]">
                    <Gauge className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Pressure</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#1a3d52]">
                    {environment.surfacePressureHpa
                      ? `${Math.round(environment.surfacePressureHpa)}`
                      : "1012"}{" "}
                    <span className="text-[10px] font-medium text-[#718b96]">hPa</span>
                  </p>
                  <p className="text-[9px] text-[#718b96]">Barometric level</p>
                </div>

                {/* UV Index */}
                {(() => {
                  const uvBadge = getUvBadge(environment.uvIndex);
                  return (
                    <div className="rounded-xl border border-[#d6e7eb] bg-white p-2.5 transition hover:border-[#b7dbe2]">
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Sun className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase">UV Index</span>
                      </div>
                      <p className="mt-1 text-sm font-extrabold text-[#1a3d52]">
                        {environment.uvIndex !== null && environment.uvIndex !== undefined
                          ? environment.uvIndex.toFixed(1)
                          : "—"}
                      </p>
                      <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.2 text-[8px] font-bold border", uvBadge.color)}>
                        {uvBadge.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Air Quality (AQI) */}
                {(() => {
                  const aqiBadge = getAqiBadge(environment.usAqi);
                  return (
                    <div className="rounded-xl border border-[#d6e7eb] bg-white p-2.5 transition hover:border-[#b7dbe2]">
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <Droplets className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase">Air Quality</span>
                      </div>
                      <p className="mt-1 text-sm font-extrabold text-[#1a3d52]">
                        {environment.usAqi !== null ? `AQI ${environment.usAqi}` : "—"}
                      </p>
                      <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.2 text-[8px] font-bold border", aqiBadge.color)}>
                        {aqiBadge.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Micro summary note */}
            <div className="flex items-center gap-2 rounded-xl bg-[#eef7f9] p-3 text-[11px] leading-snug text-[#456b7c]">
              <Info className="h-4 w-4 shrink-0 text-[#1b768a]" />
              <span>
                Telemetry sampled via Open-Meteo High-Resolution Numerical Weather Prediction model. Refreshed continuously.
              </span>
            </div>
          </div>

          {/* Right Column: Predictive Problem Engine (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            {/* Risk Synthesis Banner */}
            <div
              className={cn(
                "rounded-2xl border p-4 shadow-sm transition",
                overallRisk === "CRITICAL"
                  ? "border-red-300 bg-gradient-to-r from-red-50 via-rose-50 to-white"
                  : overallRisk === "HIGH"
                  ? "border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-white"
                  : overallRisk === "MODERATE"
                  ? "border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-white"
                  : "border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-white"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-xl",
                      overallRisk === "CRITICAL"
                        ? "bg-red-600 text-white"
                        : overallRisk === "HIGH"
                        ? "bg-orange-600 text-white"
                        : overallRisk === "MODERATE"
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-600 text-white"
                    )}
                  >
                    {overallRisk === "CRITICAL" || overallRisk === "HIGH" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#496b79]">
                      AI Predictive Hazard Assessment
                    </p>
                    <h3 className="text-sm font-extrabold text-[#153a50]">
                      {predictions?.primaryThreat ?? "Normal Baseline Atmospheric Profile"}
                    </h3>
                  </div>
                </div>

                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wide uppercase shadow-sm ring-1",
                    overallRisk === "CRITICAL"
                      ? "bg-red-600 text-white ring-red-700"
                      : overallRisk === "HIGH"
                      ? "bg-orange-600 text-white ring-orange-700"
                      : overallRisk === "MODERATE"
                      ? "bg-amber-500 text-white ring-amber-600"
                      : "bg-emerald-600 text-white ring-emerald-700"
                  )}
                >
                  {overallRisk} RISK LEVEL
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#416270]">
                {predictions?.summaryNarrative}
              </p>
            </div>

            {/* Individual Predicted Problems */}
            {problems.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5f7d8c]">
                  Anticipated Problems & Operational Directives ({problems.length} Detected)
                </p>

                {problems.map((prob) => (
                  <div
                    key={prob.id}
                    className="overflow-hidden rounded-2xl border border-[#cbe1e6] bg-white p-4 shadow-sm transition hover:border-[#1b768a]/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#edf6f8] text-[#1b768a]">
                          {prob.category === "FLASH_FLOOD" ? (
                            <CloudRain className="h-4 w-4" />
                          ) : prob.category === "LANDSLIDE" ? (
                            <Layers className="h-4 w-4" />
                          ) : prob.category === "HEATWAVE" ? (
                            <Sun className="h-4 w-4 text-orange-500" />
                          ) : prob.category === "SQUALL_GALE" ? (
                            <Wind className="h-4 w-4" />
                          ) : (
                            <Zap className="h-4 w-4 text-amber-500" />
                          )}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#1a3e54]">{prob.title}</h4>
                          <p className="text-[10px] font-medium text-[#76909c]">
                            Horizon: <span className="font-semibold text-[#305566]">{prob.triggerHorizon}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                          <span>{prob.probabilityPct}% Prob</span>
                        </div>
                        <span
                          className={cn(
                            "rounded-lg border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                            getSeverityBadge(prob.severity)
                          )}
                        >
                          {prob.severity}
                        </span>
                      </div>
                    </div>

                    {/* Probability Progress Bar */}
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            prob.severity === "CRITICAL"
                              ? "bg-red-500"
                              : prob.severity === "HIGH"
                              ? "bg-orange-500"
                              : "bg-amber-500"
                          )}
                          style={{ width: `${prob.probabilityPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Ground Evidence */}
                    <div className="mt-2.5 rounded-xl bg-[#f7fbfc] p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#5f7d8c]">
                        Causal Telemetry Trigger:
                      </p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-[#4b6d7c]">
                        {prob.causalFactors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Anticipated Impact */}
                    <p className="mt-2 text-[10px] leading-relaxed text-[#597887]">
                      <span className="font-bold text-[#23495d]">Anticipated Impact:</span> {prob.anticipatedImpact}
                    </p>

                    {/* Action Directives */}
                    <div className="mt-2 border-t border-[#edf4f6] pt-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#1b768a]">
                        Recommended Authority Directives:
                      </p>
                      <div className="mt-1 space-y-1">
                        {prob.immediateDirectives.map((dir, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px] text-[#345768]">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1b768a]" />
                            <span>{dir}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cfe3e7] bg-[#f8fcfc] p-6 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600" />
                <h4 className="mt-2 text-xs font-bold text-[#1a3d52]">No Severe Weather Threats Detected</h4>
                <p className="mt-1 text-[11px] text-[#718b96]">
                  Current weather patterns indicate low probability of flash floods, landslides, or squalls over the next 48 hours.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: 7-Day Weather Forecast */}
        <div className="mt-6 border-t border-[#e2eff2] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1b768a]">
                7-Day Weather Forecast
              </p>
              <h3 className="mt-0.5 text-sm font-extrabold text-[#163c58]">
                Meteorological Outlook for {location.name}
              </h3>
            </div>
            <p className="text-[10px] text-[#718b96]">
              Click any day to inspect specific operational thresholds
            </p>
          </div>

          {environment.forecast.length > 0 ? (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
              {environment.forecast.map((day, idx) => {
                const isSelected = idx === selectedForecastIndex;
                const d = new Date(`${day.date}T00:00:00`);
                const weekday = idx === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" });
                const dateNum = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                const uvBadge = getUvBadge(day.uvIndexMax);

                return (
                  <button
                    type="button"
                    key={day.date}
                    onClick={() => setSelectedForecastIndex(idx)}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-3 text-left transition",
                      isSelected
                        ? "border-[#1b768a] bg-[#f0f8fa] shadow-md ring-2 ring-[#1b768a]/20"
                        : "border-[#d8e8ec] bg-white hover:border-[#b4d9e0] hover:bg-[#fafdfd]"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#1a3e54]">{weekday}</span>
                        <span className="text-[9px] font-medium text-[#7a95a1]">{dateNum}</span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        {getWeatherIcon(
                          day.weatherCode !== null && day.weatherCode !== undefined
                            ? (day.weatherCode >= 95 ? "CloudLightning" : day.weatherCode >= 61 ? "CloudRain" : day.weatherCode === 0 ? "Sun" : "CloudSun")
                            : "CloudSun",
                          "h-5 w-5"
                        )}
                        <span className="text-[10px] font-bold leading-tight text-[#22475a] line-clamp-1">
                          {day.weatherDescription ?? "Fair"}
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-[#14394f]">
                          {day.temperatureMaxC !== null ? `${Math.round(day.temperatureMaxC)}°` : "—"}
                        </span>
                        <span className="text-xs font-semibold text-[#7c95a0]">
                          / {day.temperatureMinC !== null ? `${Math.round(day.temperatureMinC)}°` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-[#e8f1f3] pt-2 text-[9px]">
                      {/* Rain % & Sum */}
                      <div className="flex items-center justify-between text-[#577685]">
                        <span className="flex items-center gap-1">
                          <CloudRain className="h-3 w-3 text-[#1b768a]" /> Rain
                        </span>
                        <span className="font-bold text-[#1d4357]">
                          {day.precipitationProbability ?? 0}% ({day.precipitationSumMm ?? 0} mm)
                        </span>
                      </div>

                      {/* Wind */}
                      <div className="flex items-center justify-between text-[#577685]">
                        <span className="flex items-center gap-1">
                          <Wind className="h-3 w-3 text-[#1b768a]" /> Wind
                        </span>
                        <span className="font-semibold text-[#1d4357]">
                          {day.windSpeedMaxKph ? `${Math.round(day.windSpeedMaxKph)} km/h` : "—"}
                        </span>
                      </div>

                      {/* UV index */}
                      {day.uvIndexMax !== null && day.uvIndexMax !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#577685]">UV Max</span>
                          <span className={cn("rounded px-1 text-[8px] font-bold", uvBadge.color)}>
                            {day.uvIndexMax.toFixed(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[#d1e1e4] bg-white p-4 text-center text-xs text-[#758a94]">
              Multi-day forecast telemetry is being fetched for this district.
            </div>
          )}

          {/* Active Day Focused Deep Dive */}
          {activeDay && (
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfe2e7] bg-[#f2f9fb] p-3.5 text-xs text-[#2c5264]">
              <div className="flex items-center gap-2">
                <span className="font-bold">Focused Outlook:</span>
                <span>
                  {new Date(`${activeDay.date}T00:00:00`).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <span className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-bold text-[#1b768a] shadow-xs">
                  {activeDay.weatherDescription}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <span>
                  <strong>Range:</strong> {activeDay.temperatureMinC ?? "—"}°C to {activeDay.temperatureMaxC ?? "—"}°C
                </span>
                <span>
                  <strong>Precipitation:</strong> {activeDay.precipitationProbability ?? 0}% probability · {activeDay.precipitationSumMm ?? 0} mm total
                </span>
                <span>
                  <strong>Peak Gusts:</strong> {activeDay.windGustMaxKph ?? "—"} km/h
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
