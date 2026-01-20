"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TrafficPoint = {
  time: string;
  requests: number;
  bytes: number;
  cachedRequests: number;
  cachedBytes: number;
  rps: number;
};

type TrafficResponse = {
  status: string;
  generatedAt: string;
  windowMinutes: number;
  series: TrafficPoint[];
  totals: {
    requests: number;
    bytes: number;
    cachedRequests: number;
    cachedBytes: number;
  };
  rates: {
    avgRps: number;
    peakRps: number;
    cacheHitPercent: number;
    avgBandwidthBytesPerSec: number;
  };
  error?: string;
  details?: any;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export default function TrafficMonitorPage() {
  const [data, setData] = useState<TrafficResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const fetchTraffic = async () => {
    try {
      const res = await fetch("/api/monitor/traffic", { cache: "no-store" });
      const json = (await res.json()) as TrafficResponse;

      if (!res.ok || json.status !== "ok") {
        setStatus("error");
        setErrorMessage(json.error || "Gagal mengambil data Cloudflare.");
        setErrorDetails(
          json.details ? JSON.stringify(json.details, null, 2) : null
        );
        return;
      }

      setData(json);
      setLastUpdated(new Date());
      setStatus("ready");
      setErrorMessage(null);
      setErrorDetails(null);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error?.message ?? "Gagal mengambil data Cloudflare.");
      setErrorDetails(null);
    }
  };

  useEffect(() => {
    fetchTraffic();
    const interval = setInterval(fetchTraffic, 30000);
    return () => clearInterval(interval);
  }, []);

  const series = data?.series ?? [];

  const lastPoint = series[series.length - 1];
  const requestsSeries = useMemo(
    () => series.map((point) => point.requests),
    [series]
  );
  const rpsSeries = useMemo(
    () => series.map((point) => point.rps),
    [series]
  );
  const bytesSeries = useMemo(
    () => series.map((point) => point.bytes),
    [series]
  );

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 font-sans selection:bg-cyan-500/30">
      <nav className="border-b border-slate-800 bg-[#0b1120]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-slate-400 hover:text-white transition-colors"
              >
                &larr;
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Traffic Monitor
                </p>
                <h1 className="text-2xl font-bold text-white">
                  HTTP Traffic Pulse
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/monitor"
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 hover:border-cyan-500/60 hover:text-white transition"
              >
                System Monitor
              </Link>
              <div className="text-right text-xs text-slate-400">
                <div>Last update</div>
                <div className="font-mono text-slate-200">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--:--"}
                </div>
              </div>
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "ready"
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                    : status === "error"
                      ? "bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                      : "bg-cyan-400 animate-pulse"
                }`}
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {status === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-slate-400">
              Menghubungkan ke Cloudflare analytics...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-8">
            <h2 className="text-lg font-semibold text-rose-200">
              Gagal memuat data
            </h2>
            <p className="mt-2 text-sm text-rose-300">
              {errorMessage ?? "Periksa kembali token Cloudflare kamu."}
            </p>
            {errorDetails && (
              <pre className="mt-4 overflow-auto rounded-lg border border-rose-900/50 bg-rose-950/40 p-4 text-xs text-rose-100">
                {errorDetails}
              </pre>
            )}
          </div>
        )}

        {status === "ready" && data && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <StatCard
                title={`Total Requests (${data.windowMinutes}m)`}
                value={numberFormatter.format(data.totals.requests)}
                subtitle={`${data.rates.avgRps} rps rata-rata`}
                series={requestsSeries}
                accent="cyan"
              />
              <StatCard
                title={`Bandwidth (${data.windowMinutes}m)`}
                value={formatBytes(data.totals.bytes)}
                subtitle={`${formatBytes(
                  data.rates.avgBandwidthBytesPerSec
                )}/s rata-rata`}
                series={bytesSeries}
                accent="indigo"
              />
              <StatCard
                title="Cache Hit"
                value={`${data.rates.cacheHitPercent}%`}
                subtitle={`${numberFormatter.format(
                  data.totals.cachedRequests
                )} cached requests`}
                series={series.map((point) =>
                  point.requests
                    ? Number(
                        ((point.cachedRequests / point.requests) * 100).toFixed(
                          2
                        )
                      )
                    : 0
                )}
                accent="emerald"
              />
              <StatCard
                title="Peak RPS"
                value={`${data.rates.peakRps} rps`}
                subtitle="puncak dalam 30 menit"
                series={rpsSeries}
                accent="rose"
              />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-6">
                <header className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Real-time curve
                    </p>
                    <h2 className="text-xl font-semibold text-white">
                      Request per minute
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Terakhir</p>
                    <p className="text-lg font-semibold text-cyan-300">
                      {lastPoint
                        ? numberFormatter.format(lastPoint.requests)
                        : "-"}
                    </p>
                  </div>
                </header>
                <div className="mt-6">
                  <Sparkline values={requestsSeries} stroke="#38bdf8" fill="#0ea5e933" />
                </div>
                <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Window {data.windowMinutes} menit</span>
                  <span>{series.length} titik data</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-6">
                <header>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Live Snapshot
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    Traffic sekarang
                  </h2>
                </header>
                <div className="mt-6 space-y-4 text-sm text-slate-300">
                  <SnapshotRow
                    label="Request / menit"
                    value={
                      lastPoint
                        ? numberFormatter.format(lastPoint.requests)
                        : "-"
                    }
                  />
                  <SnapshotRow
                    label="RPS"
                    value={lastPoint ? lastPoint.rps.toFixed(2) : "-"}
                  />
                  <SnapshotRow
                    label="Bandwidth / menit"
                    value={lastPoint ? formatBytes(lastPoint.bytes) : "-"}
                  />
                  <SnapshotRow
                    label="Cache hit / menit"
                    value={
                      lastPoint
                        ? `${numberFormatter.format(
                            lastPoint.cachedRequests
                          )} req`
                        : "-"
                    }
                  />
                </div>
                <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
                  Data diperbarui otomatis setiap 30 detik.
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-16 py-8 text-center text-slate-500 text-xs">
        Traffic Monitor &bull; Cloudflare Analytics
      </footer>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  series,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  series: number[];
  accent: "cyan" | "indigo" | "emerald" | "rose";
}) {
  const accents: Record<typeof accent, { stroke: string; glow: string }> = {
    cyan: { stroke: "#22d3ee", glow: "shadow-cyan-500/30" },
    indigo: { stroke: "#6366f1", glow: "shadow-indigo-500/30" },
    emerald: { stroke: "#34d399", glow: "shadow-emerald-500/30" },
    rose: { stroke: "#fb7185", glow: "shadow-rose-500/30" },
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-white">{value}</div>
          <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
        </div>
        <div className={`h-8 w-8 rounded-full bg-slate-900 ${accents[accent].glow}`}></div>
      </div>
      <div className="mt-4">
        <Sparkline values={series} stroke={accents[accent].stroke} fill={`${accents[accent].stroke}22`} />
      </div>
    </div>
  );
}

function Sparkline({
  values,
  stroke,
  fill,
}: {
  values: number[];
  stroke: string;
  fill: string;
}) {
  if (!values.length) {
    return (
      <div className="h-16 rounded-xl border border-slate-800 bg-slate-950/50"></div>
    );
  }

  const width = 100;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const step = width / Math.max(values.length - 1, 1);

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      <polygon points={areaPoints} fill={fill} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-slate-800/60 pb-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[idx]}`;
}
