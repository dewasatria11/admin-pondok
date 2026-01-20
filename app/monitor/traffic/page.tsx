"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

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
const formatWindowLabel = (minutes: number) => {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} jam`;
  }
  return `${minutes} menit`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

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
    <div className="royal-page">
      <motion.nav
        className="royal-nav mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="royal-container">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="royal-nav-link">
                ← Kembali
              </Link>
              <div>
                <p className="text-xs uppercase tracking-widest text-text-muted">
                  Traffic Monitor
                </p>
                <h1 className="text-2xl font-bold text-gold-light">
                  HTTP Traffic Pulse
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/monitor" className="royal-button-secondary text-xs px-4 py-2">
                System Monitor
              </Link>
              <div className="text-right text-xs text-text-muted">
                <div>Last update</div>
                <div className="font-mono text-text-primary">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--:--"}
                </div>
              </div>
              <motion.div
                className={`status-dot ${status === "ready"
                  ? "status-ok"
                  : status === "error"
                    ? "status-error"
                    : "status-warning"
                  }`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
        </div>
      </motion.nav>

      <main className="royal-container">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {status === "loading" && (
            <motion.div variants={itemVariants} className="royal-card text-center py-10">
              <motion.div
                className="inline-block w-10 h-10 border-t-2 border-b-2 rounded-full"
                style={{ borderColor: 'var(--gold-base)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="mt-4 text-text-muted">
                Menghubungkan ke Cloudflare analytics...
              </p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div variants={itemVariants} className="royal-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <h2 className="text-lg font-semibold text-red-400 mb-2">
                ⚠️ Gagal memuat data
              </h2>
              <p className="text-sm text-red-300">
                {errorMessage ?? "Periksa kembali token Cloudflare kamu."}
              </p>
              {errorDetails && (
                <pre className="mt-4 overflow-auto rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-xs text-red-100">
                  {errorDetails}
                </pre>
              )}
            </motion.div>
          )}

          {status === "ready" && data && (
            <>
              <motion.section variants={itemVariants} className="royal-grid royal-grid-4 mb-8">
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
                  subtitle={`puncak dalam ${formatWindowLabel(data.windowMinutes)}`}
                  series={rpsSeries}
                  accent="rose"
                />
              </motion.section>

              <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
                <motion.div variants={itemVariants} className="royal-card">
                  <header className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="royal-label">Real-time curve</p>
                      <h2 className="royal-section-title">Request per minute</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">Terakhir</p>
                      <motion.p
                        className="text-lg font-semibold"
                        style={{ color: 'var(--gold-light)' }}
                        key={lastPoint?.requests}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                      >
                        {lastPoint
                          ? numberFormatter.format(lastPoint.requests)
                          : "-"}
                      </motion.p>
                    </div>
                  </header>
                  <div className="mt-6">
                    <Sparkline values={requestsSeries} stroke="#38bdf8" fill="#0ea5e933" />
                  </div>
                  <div className="mt-4 text-xs text-text-muted flex items-center justify-between">
                    <span>Window {data.windowMinutes} menit</span>
                    <span>{series.length} titik data</span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="royal-card">
                  <header className="mb-6">
                    <p className="royal-label">Live Snapshot</p>
                    <h2 className="royal-section-title">Traffic sekarang</h2>
                  </header>
                  <div className="space-y-4 text-sm text-text-secondary">
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
                  <div className="mt-8 rounded-xl border border-border-subtle bg-noir-deep p-4 text-xs text-text-muted">
                    📡 Data diperbarui otomatis setiap 30 detik.
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </main>

      <footer className="royal-footer mt-16">
        Traffic Monitor • Cloudflare Analytics
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
  const accents: Record<typeof accent, { stroke: string; color: string }> = {
    cyan: { stroke: "#22d3ee", color: "#22d3ee" },
    indigo: { stroke: "#6366f1", color: "#6366f1" },
    emerald: { stroke: "#34d399", color: "#34d399" },
    rose: { stroke: "#fb7185", color: "#fb7185" },
  };

  return (
    <motion.div
      className="royal-stat-card"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <p className="royal-label">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <motion.div
            className="text-2xl font-semibold text-text-primary"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
          >
            {value}
          </motion.div>
          <div className="text-xs text-text-muted mt-1">{subtitle}</div>
        </div>
        <motion.div
          className="w-8 h-8 rounded-full"
          style={{ background: `${accents[accent].color}33` }}
          whileHover={{ scale: 1.2 }}
        />
      </div>
      <div className="mt-4">
        <Sparkline values={series} stroke={accents[accent].stroke} fill={`${accents[accent].stroke}22`} />
      </div>
    </motion.div>
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
      <div className="h-16 rounded-xl border border-border-subtle bg-noir-deep"></div>
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
    <motion.svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-16"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <polygon points={areaPoints} fill={fill} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      className="flex items-center justify-between gap-6 border-b border-border-subtle pb-3"
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-text-muted">{label}</span>
      <span className="font-mono text-text-primary font-semibold">{value}</span>
    </motion.div>
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
