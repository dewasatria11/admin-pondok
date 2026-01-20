"use client";

import { useMemo, useState } from "react";

const CONFIRM_TEXT = "HAPUS SEMUA";

type WipeResult = {
  ok: boolean;
  storage?: { bucket: string; deletedFiles: number };
  db?: { truncated: boolean };
  error?: string;
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
    <main className="page">
      <section className="panel">
        <header className="header">
          <span className="badge">Admin Wipe Console</span>
          <h1 className="title">Admin Pondok</h1>
          <p className="subtitle">
            Dashboard ini hanya untuk operasi wipe. Pastikan kamu paham risiko
            sebelum menekan tombol.
          </p>
        </header>

        <div className="content-grid">
          <div className="info-card">
            <h3>Bucket target</h3>
            <p>pendaftar-files (recursive delete)</p>
          </div>
          <div className="info-card">
            <h3>Database target</h3>
            <p>public.pembayaran &amp; public.pendaftar</p>
          </div>
          <div className="info-card">
            <h3>Status terakhir</h3>
            <p>
              {result?.ok
                ? `${result.storage?.deletedFiles ?? 0} file dihapus`
                : "Belum ada aksi"}
            </p>
          </div>
        </div>

        <section className="danger-zone">
          <h2 className="danger-title">Zona Bahaya</h2>
          <p className="danger-text">
            Wipe akan menghapus semua file di Storage dan mengosongkan tabel
            pembayaran serta pendaftar. Aksi ini tidak dapat dibatalkan. "hapus-semua-2026-super-rahasia"
          </p>

          <div className="form-grid">
            <label htmlFor="admin-token">Admin token</label>
            <input
              id="admin-token"
              type="password"
              placeholder="Masukkan x-admin-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />

            <label htmlFor="confirm-text">
              Ketik &quot;{CONFIRM_TEXT}&quot; untuk konfirmasi
            </label>
            <input
              id="confirm-text"
              type="text"
              placeholder={CONFIRM_TEXT}
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
          </div>

          <div className="actions">
            <button
              className="wipe-button"
              onClick={handleWipe}
              disabled={!canSubmit}
            >
              {status === "loading" ? "Menghapus..." : "Wipe Sekarang"}
            </button>
            <div className="status">
              <strong>Status:</strong> {message || "Siap menjalankan wipe."}
            </div>
          </div>
        </section>
      </section>
      <section className="panel" style={{ marginTop: '2rem' }}>
        <header className="header">
          <span className="badge" style={{ backgroundColor: '#0f172a', color: 'white' }}>Utility Tools</span>
          <h2 className="title" style={{ fontSize: '1.5rem' }}>Admin Utilities</h2>
          <p className="subtitle">
            Kumpulan alat bantu untuk monitoring dan manajemen sistem.
          </p>
        </header>

        <div className="content-grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

          {/* Seeder Card */}
          <div className="info-card" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#1e293b' }}>🤖 Data Seeder</h3>
            </div>
            <p style={{ color: '#64748b' }}>Generate dummy data pendaftar & file secara otomatis.</p>
            <a
              href="/seeder"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2563EB',
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: '99px',
                fontWeight: 600,
                marginTop: '10px',
                fontSize: '14px'
              }}
            >
              Buka Seeder Bot
            </a>
          </div>

          {/* Monitor Card */}
          <div className="info-card" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#38bdf8', margin: 0 }}>📊 System Monitor</h3>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
              </span>
            </div>
            <p style={{ color: '#94a3b8' }}>Real-time health check: Database, Storage & Latency.</p>
            <a
              href="/monitor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: '99px',
                fontWeight: 600,
                marginTop: '10px',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
              }}
            >
              Buka Dashboard
            </a>
          </div>

        </div>
      </section>
    </main>
  );
}
