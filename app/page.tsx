"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const CONFIRM_TEXT = "HAPUS SEMUA";

type WipeResult = {
  ok: boolean;
  storage?: { bucket: string; deletedFiles: number };
  db?: { truncated: boolean };
  error?: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -8,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export default function HomePage() {
  const [token, setToken] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<WipeResult | null>(null);

  const canSubmit = useMemo(() => {
    return (
      token.trim().length > 0 &&
      confirmText.trim().toUpperCase() === CONFIRM_TEXT &&
      status !== "loading"
    );
  }, [token, confirmText, status]);

  const handleWipe = async () => {
    if (!canSubmit) return;

    setStatus("loading");
    setMessage("Menjalankan wipe...");
    setResult(null);

    try {
      const response = await fetch("/api/admin/wipe", {
        method: "POST",
        headers: {
          "x-admin-token": token.trim(),
        },
      });

      const payload = (await response.json()) as WipeResult;

      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Wipe gagal dijalankan.");
        return;
      }

      setResult(payload);
      setStatus("done");
      setMessage("Wipe selesai dijalankan.");
      setConfirmText("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Terjadi error tak terduga."
      );
    }
  };

  return (
    <div className="royal-page">
      <motion.div
        className="royal-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Section */}
        <motion.header variants={itemVariants} className="mb-12 text-center">
          <motion.div
            className="inline-block mb-4"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <span className="text-6xl">👑</span>
          </motion.div>
          <h1 className="royal-title">Admin Pondok</h1>
          <p className="royal-subtitle max-w-2xl mx-auto">
            Enterprise-grade administration dashboard with Royal Noir Gold
            aesthetics
          </p>
        </motion.header>

        {/* Quick Access Cards */}
        <motion.section variants={itemVariants} className="mb-12">
          <div className="royal-grid royal-grid-3">
            {/* Seeder Card */}
            <motion.div
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <Link href="/seeder" className="block">
                <div className="royal-card h-full">
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      className="text-4xl"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      🤖
                    </motion.div>
                    <span className="royal-badge">Utility</span>
                  </div>
                  <h3 className="royal-section-title mb-2">Data Seeder</h3>
                  <p className="royal-subtitle mb-4">
                    Generate dummy data pendaftar & file secara otomatis untuk
                    testing
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gold-light font-semibold">
                    <span>Buka Seeder</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* System Monitor Card */}
            <motion.div
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <Link href="/monitor" className="block">
                <div className="royal-card h-full">
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      className="text-4xl"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      📊
                    </motion.div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="status-dot status-ok"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span className="royal-badge">Live</span>
                    </div>
                  </div>
                  <h3 className="royal-section-title mb-2">System Monitor</h3>
                  <p className="royal-subtitle mb-4">
                    Real-time health check: Database, Storage & Latency metrics
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gold-light font-semibold">
                    <span>Buka Dashboard</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Traffic Monitor Card */}
            <motion.div
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <Link href="/monitor/traffic" className="block">
                <div className="royal-card h-full">
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      className="text-4xl"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      📈
                    </motion.div>
                    <span className="royal-badge">Analytics</span>
                  </div>
                  <h3 className="royal-section-title mb-2">Traffic Monitor</h3>
                  <p className="royal-subtitle mb-4">
                    HTTP traffic pulse dengan Cloudflare analytics integration
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gold-light font-semibold">
                    <span>Lihat Traffic</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Admin Wipe Section */}
        <motion.section variants={itemVariants} className="royal-card">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">⚠️</span>
              <h2 className="royal-section-title m-0">Admin Wipe Console</h2>
            </div>
            <p className="royal-subtitle">
              Dashboard ini hanya untuk operasi wipe. Pastikan kamu paham risiko
              sebelum menekan tombol.
            </p>
          </div>

          {/* Info Grid */}
          <div className="royal-grid royal-grid-3 mb-8">
            <motion.div
              className="royal-stat-card"
              whileHover={{ scale: 1.02 }}
            >
              <p className="royal-label mb-2">Bucket Target</p>
              <p className="text-text-secondary font-mono text-sm">
                pendaftar-files
              </p>
              <span className="text-xs text-text-muted">(recursive delete)</span>
            </motion.div>

            <motion.div
              className="royal-stat-card"
              whileHover={{ scale: 1.02 }}
            >
              <p className="royal-label mb-2">Database Target</p>
              <p className="text-text-secondary font-mono text-sm">
                public.pembayaran
              </p>
              <p className="text-text-secondary font-mono text-sm">
                public.pendaftar
              </p>
            </motion.div>

            <motion.div
              className="royal-stat-card"
              whileHover={{ scale: 1.02 }}
            >
              <p className="royal-label mb-2">Status Terakhir</p>
              <p className="text-text-secondary text-sm">
                {result?.ok
                  ? `${result.storage?.deletedFiles ?? 0} file dihapus`
                  : "Belum ada aksi"}
              </p>
            </motion.div>
          </div>

          {/* Danger Zone */}
          <motion.div
            className="p-6 rounded-2xl border-2 border-dashed"
            style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}
            whileHover={{ borderColor: "rgba(239, 68, 68, 0.5)" }}
          >
            <h3 className="text-xl font-bold text-red-400 mb-3">
              ⚡ Zona Bahaya
            </h3>
            <p className="royal-subtitle mb-6">
              Wipe akan menghapus semua file di Storage dan mengosongkan tabel
              pembayaran serta pendaftar. Aksi ini tidak dapat dibatalkan.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="admin-token" className="royal-label block mb-2">
                  Admin Token
                </label>
                <input
                  id="admin-token"
                  type="password"
                  placeholder="Masukkan x-admin-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="royal-input"
                />
              </div>

              <div>
                <label htmlFor="confirm-text" className="royal-label block mb-2">
                  Ketik &quot;{CONFIRM_TEXT}&quot; untuk konfirmasi
                </label>
                <input
                  id="confirm-text"
                  type="text"
                  placeholder={CONFIRM_TEXT}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="royal-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <motion.button
                className="royal-button"
                onClick={handleWipe}
                disabled={!canSubmit}
                whileHover={canSubmit ? { scale: 1.05 } : {}}
                whileTap={canSubmit ? { scale: 0.95 } : {}}
                style={{
                  background: !canSubmit
                    ? "#4a5568"
                    : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                }}
              >
                {status === "loading" ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      ⏳
                    </motion.span>
                    Menghapus...
                  </>
                ) : (
                  <>🗑️ Wipe Sekarang</>
                )}
              </motion.button>

              <div className="flex items-center gap-3">
                <motion.div
                  className={`status-dot ${status === "loading"
                      ? "status-warning"
                      : status === "done"
                        ? "status-ok"
                        : status === "error"
                          ? "status-error"
                          : "status-idle"
                    }`}
                  animate={status === "loading" ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm text-text-secondary">
                  <strong className="text-text-primary">Status:</strong>{" "}
                  {message || "Siap menjalankan wipe."}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Footer */}
        <motion.footer variants={itemVariants} className="royal-footer mt-16">
          <p>Admin Pondok • Royal Noir Gold Edition</p>
          <p className="text-xs mt-2">Powered by Next.js & Supabase</p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
