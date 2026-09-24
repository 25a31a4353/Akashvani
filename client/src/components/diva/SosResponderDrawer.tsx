import React from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SosResponderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SosResponderDrawer({ isOpen, onClose }: SosResponderDrawerProps) {
  const { t } = useLanguage();
  const dispatchesQuery = trpc.diva.sos.list.useQuery(undefined, {
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });

  const updateStatusMutation = trpc.diva.sos.updateStatus.useMutation({
    onSuccess: () => {
      dispatchesQuery.refetch();
    },
  });

  if (!isOpen) return null;

  const dispatches = dispatchesQuery.data ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="responder-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/90 text-white">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <div>
              <h2 id="responder-drawer-title" className="text-sm font-bold tracking-tight">
                {t.responderDashboard}
              </h2>
              <p className="text-[10px] text-slate-400">Live Incident Commander Dispatch Log</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatchesQuery.refetch()}
              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Refresh log"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", dispatchesQuery.isFetching && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label={t.close}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dispatch Records List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {dispatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <ShieldAlert className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No active SOS dispatches</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">
                Distress signals transmitted by users with verified coordinates will register immediately here.
              </p>
            </div>
          ) : (
            dispatches.map((d) => {
              const isSent = d.status === "SENT";
              const isAck = d.status === "ACKNOWLEDGED";
              const isRes = d.status === "RESOLVED";

              return (
                <div
                  key={d.id}
                  className={cn(
                    "rounded-xl border p-3.5 text-xs transition-all",
                    isSent
                      ? "border-amber-300 bg-amber-50/50 shadow-sm"
                      : isAck
                      ? "border-blue-300 bg-blue-50/40"
                      : "border-slate-200 bg-slate-50 opacity-80"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 text-[11px]">{d.id}</span>
                        <span className="rounded bg-red-100 text-red-800 font-extrabold text-[9px] px-1.5 py-0.2">
                          {d.category}
                        </span>
                        {d.isSimulated === "true" && (
                          <span className="rounded bg-purple-100 text-purple-800 font-bold text-[8.5px] px-1">
                            SIMULATED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(d.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}{" "}
                        · {new Date(d.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                        isSent
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : isAck
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      )}
                    >
                      {d.status}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1 text-[10.5px] text-slate-700 bg-white/70 rounded-lg p-2 border border-black/5">
                    <p>
                      <strong>Coordinates:</strong>{" "}
                      {d.latitude && d.longitude
                        ? `${Number(d.latitude).toFixed(5)}°N, ${Number(d.longitude).toFixed(5)}°E`
                        : "Unavailable"}
                    </p>
                    <p className="text-[9.5px] text-slate-500">
                      <strong>Source:</strong> {d.locationSource}
                    </p>
                    {d.notes && (
                      <p className="text-[10px] text-slate-800 italic mt-1 pt-1 border-t border-slate-100">
                        "{d.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions for Incident Commander */}
                  <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                    {isSent && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: d.id,
                            status: "ACKNOWLEDGED",
                            isSimulated: d.isSimulated === "true",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className="h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold"
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        {t.acknowledgeDispatch}
                      </Button>
                    )}
                    {(isSent || isAck) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: d.id,
                            status: "RESOLVED",
                            isSimulated: d.isSimulated === "true",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className="h-7 rounded-lg border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                        {t.resolveDispatch}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
