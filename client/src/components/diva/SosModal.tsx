import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Radio,
  ShieldAlert,
  Volume2,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Web Audio API emergency 2-tone confirmation beep
export function playLocalConfirmationBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.16);

    // Second tone (1320 Hz - E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (err) {
    console.warn("[ResQ Audio] Web Audio confirmation beep failed:", err);
  }
}

export type SosStatus = "IDLE" | "TRANSMITTING" | "SENT" | "ACKNOWLEDGED" | "RESOLVED" | "FAILED";

export interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  fallbackLatitude?: number;
  fallbackLongitude?: number;
  fallbackLocationName?: string;
  defaultLocation?: {
    latitude: number;
    longitude: number;
    name: string;
    district?: string;
    state?: string;
  };
}

export function SosModal({
  isOpen,
  onClose,
  fallbackLatitude,
  fallbackLongitude,
  fallbackLocationName,
  defaultLocation,
}: SosModalProps) {
  const effectiveFallbackLat = fallbackLatitude ?? defaultLocation?.latitude;
  const effectiveFallbackLon = fallbackLongitude ?? defaultLocation?.longitude;
  const effectiveFallbackName = fallbackLocationName ?? defaultLocation?.name;
  const { t } = useLanguage();
  const [category, setCategory] = useState<string>("EVACUATION");
  const [notes, setNotes] = useState<string>("");
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"FETCHING" | "DEVICE_GPS" | "FALLBACK_SELECTED" | "PERMISSION_DENIED">("FETCHING");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [status, setStatus] = useState<SosStatus>("IDLE");
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const [beepPlayed, setBeepPlayed] = useState(false);
  const [isDemoSimulation, setIsDemoSimulation] = useState(false);

  const createSosMutation = trpc.diva.sos.create.useMutation();
  const updateStatusMutation = trpc.diva.sos.updateStatus.useMutation();

  // Request location when modal opens
  useEffect(() => {
    if (!isOpen) {
      setStatus("IDLE");
      setBeepPlayed(false);
      setActiveSosId(null);
      setIsDemoSimulation(false);
      return;
    }

    setLocationStatus("FETCHING");
    setLocationError(null);

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          });
          setLocationStatus("DEVICE_GPS");
        },
        (err) => {
          console.warn("[ResQ SOS] Geolocation error:", err.message);
          setLocationStatus("PERMISSION_DENIED");
          setLocationError(err.code === 1 ? t.locationPermissionDenied : "Could not retrieve GPS coordinates.");
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
      );
    } else {
      setLocationStatus("PERMISSION_DENIED");
      setLocationError("Geolocation is not supported by your browser/device.");
    }
  }, [isOpen, t.locationPermissionDenied]);

  if (!isOpen) return null;

  const currentLat = deviceCoords?.lat ?? (locationStatus !== "PERMISSION_DENIED" ? effectiveFallbackLat : null);
  const currentLon = deviceCoords?.lon ?? (locationStatus !== "PERMISSION_DENIED" ? effectiveFallbackLon : null);
  const locationSourceLabel = deviceCoords
    ? `DEVICE GPS (Accuracy ±${deviceCoords.accuracy ?? 15}m)`
    : effectiveFallbackLat && locationStatus !== "PERMISSION_DENIED"
    ? `SELECTED REGIONAL LOCATION (${effectiveFallbackName || "Active Map"})`
    : "COORDINATES UNAVAILABLE";

  const categories = [
    { id: "EVACUATION", label: t.catEvacuation, icon: AlertTriangle, color: "border-red-500 bg-red-50 text-red-700" },
    { id: "MEDICAL", label: t.catMedical, icon: Zap, color: "border-rose-500 bg-rose-50 text-rose-700" },
    { id: "FLOOD", label: t.catFlood, icon: Radio, color: "border-blue-500 bg-blue-50 text-blue-700" },
    { id: "LANDSLIDE", label: t.catLandslide, icon: ShieldAlert, color: "border-amber-500 bg-amber-50 text-amber-700" },
    { id: "CYCLONE", label: t.catCyclone, icon: Radio, color: "border-indigo-500 bg-indigo-50 text-indigo-700" },
    { id: "OTHER", label: t.catOther, icon: Bell, color: "border-slate-500 bg-slate-50 text-slate-700" },
  ];

  const handleTransmit = async () => {
    setStatus("TRANSMITTING");

    // 1. Play local confirmation beep immediately on the client device
    playLocalConfirmationBeep();
    setBeepPlayed(true);

    // 2. Check network connectivity
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("FAILED");
      return;
    }

    try {
      const res = await createSosMutation.mutateAsync({
        category,
        latitude: currentLat,
        longitude: currentLon,
        locationSource: locationSourceLabel,
        isSimulated: false,
        notes: notes.trim() || undefined,
      });

      setActiveSosId(res.id);
      setStatus("SENT");
    } catch (err) {
      console.error("[ResQ SOS] Dispatch transmission failed:", err);
      setStatus("FAILED");
    }
  };

  const handleSimulateAcknowledge = async () => {
    if (!activeSosId) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: activeSosId,
        status: "ACKNOWLEDGED",
        isSimulated: true,
      });
      setStatus("ACKNOWLEDGED");
      setIsDemoSimulation(true);
    } catch (err) {
      console.warn("Simulate acknowledge failed:", err);
    }
  };

  const handleSimulateResolve = async () => {
    if (!activeSosId) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: activeSosId,
        status: "RESOLVED",
        isSimulated: true,
      });
      setStatus("RESOLVED");
      setIsDemoSimulation(true);
    } catch (err) {
      console.warn("Simulate resolve failed:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-red-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur shadow-inner">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
              </span>
              <div>
                <h2 id="sos-modal-title" className="text-base font-bold tracking-tight">
                  {t.sosTitle}
                </h2>
                <p className="text-[11px] text-red-100 font-medium">{t.sosSubtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              aria-label={t.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Status Progression Alert if transmitted */}
          {status !== "IDLE" && (
            <div
              className={cn(
                "rounded-xl p-4 border transition-all",
                status === "SENT"
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : status === "ACKNOWLEDGED"
                  ? "bg-blue-50 border-blue-300 text-blue-900"
                  : status === "RESOLVED"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-red-50 border-red-300 text-red-900"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {status === "SENT" && <Clock className="h-5 w-5 text-amber-600 animate-spin" />}
                  {status === "ACKNOWLEDGED" && <Radio className="h-5 w-5 text-blue-600 animate-pulse" />}
                  {status === "RESOLVED" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {status === "FAILED" && <WifiOff className="h-5 w-5 text-red-600" />}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      {status === "SENT"
                        ? t.sosSent
                        : status === "ACKNOWLEDGED"
                        ? t.sosAcknowledged
                        : status === "RESOLVED"
                        ? t.sosResolved
                        : t.sosFailed}
                    </span>
                    {activeSosId && (
                      <span className="text-[10px] font-mono text-slate-600 block mt-0.5">
                        Ref: {activeSosId}
                      </span>
                    )}
                  </div>
                </div>

                {isDemoSimulation && (
                  <span className="rounded bg-purple-100 border border-purple-300 px-2 py-0.5 text-[9px] font-extrabold text-purple-800">
                    {t.demoSimulationBadge}
                  </span>
                )}
              </div>

              {/* Distinction: Local Beep vs Responder Delivery */}
              <div className="mt-3 pt-3 border-t border-black/10 text-[11px] space-y-1.5">
                {beepPlayed && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{t.localBeepPlayed}</span>
                  </div>
                )}
                <p className="text-[10.5px] leading-relaxed text-slate-700">
                  ⚠️ <strong>Important distinction:</strong> {t.localBeepNotice}
                </p>
                {status === "FAILED" && (
                  <p className="text-red-700 font-medium">{t.networkUnavailable}</p>
                )}
              </div>

              {/* Demo Responder Status Step Simulation Controls */}
              {status !== "FAILED" && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-black/5">
                  {status === "SENT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSimulateAcknowledge}
                      className="h-7 text-[10px] font-bold border-blue-300 bg-white hover:bg-blue-50 text-blue-800"
                    >
                      [SIMULATE RESPONDER ACKNOWLEDGEMENT]
                    </Button>
                  )}
                  {status === "ACKNOWLEDGED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSimulateResolve}
                      className="h-7 text-[10px] font-bold border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800"
                    >
                      [SIMULATE DISPATCH RESOLVED]
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Controls (active before transmit, or reviewable) */}
          {status === "IDLE" && (
            <>
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {t.emergencyCategory}
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    const isSelected = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                          isSelected
                            ? "border-red-600 bg-red-50 text-red-900 shadow-md ring-2 ring-red-500/20 font-bold"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                        )}
                      >
                        <Icon className={cn("h-5 w-5 mb-1.5", isSelected ? "text-red-600" : "text-slate-500")} />
                        <span className="text-[11px] leading-tight">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Verification Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold flex items-center gap-1.5">
                    <Crosshair className="h-3.5 w-3.5 text-slate-600" />
                    Dispatch Coordinates
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded",
                      locationStatus === "DEVICE_GPS"
                        ? "bg-emerald-100 text-emerald-800"
                        : locationStatus === "PERMISSION_DENIED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {locationStatus === "DEVICE_GPS" ? "GPS VERIFIED" : locationStatus}
                  </span>
                </div>

                <p className="font-mono text-slate-800 text-[11px]">
                  {currentLat != null && currentLon != null
                    ? `${currentLat.toFixed(5)}°N, ${currentLon.toFixed(5)}°E`
                    : "No coordinates available"}
                </p>

                <p className="text-[10px] text-slate-500">Source: {locationSourceLabel}</p>

                {locationError && (
                  <p className="text-[10px] font-medium text-red-600 mt-1">
                    ⚠️ {locationError}
                  </p>
                )}
              </div>

              {/* Message / Details */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Urgent Situation Details (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe number of persons, immediate danger, injuries or road cut-offs…"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 rounded-xl text-xs font-semibold">
            {t.close}
          </Button>

          {status === "IDLE" ? (
            <Button
              onClick={handleTransmit}
              disabled={createSosMutation.isPending}
              className="h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-wide shadow-lg shadow-red-600/20"
            >
              {createSosMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {t.sendingSos}
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                  {t.sendSos}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => setStatus("IDLE")}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs font-bold text-red-700 border-red-300 bg-red-50"
            >
              Transmit New SOS
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
