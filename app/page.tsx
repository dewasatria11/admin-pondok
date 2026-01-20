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
            pembayaran serta pendaftar. Aksi ini tidak dapat dibatalkan.
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
          <span className="badge" style={{ backgroundColor: '#2563EB', color: 'white' }}>Utility Tools</span>
          <h2 className="title" style={{ fontSize: '1.5rem' }}>Data Seeder</h2>
          <p className="subtitle">
            Generate dummy data (pendaftar & file) untuk testing aplikasi.
          </p>
        </header>

        <div className="actions" style={{ marginTop: '1.5rem' }}>
          <a
            href="/seeder"
            className="wipe-button"
            style={{
              backgroundColor: '#2563EB',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'inline-block'
            }}
          >
            Buka Seeder Bot →
          </a>
        </div>
      </section>
    </main>
  );
}
