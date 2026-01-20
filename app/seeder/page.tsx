"use client";

import { useState, useRef, useEffect, useMemo } from "react";

export default function SeederPage() {
    const [count, setCount] = useState(10);
    const [withFiles, setWithFiles] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    const successStats = useMemo(() => {
        for (let i = logs.length - 1; i >= 0; i -= 1) {
            const match = logs[i].match(/Success:\s*(\d+)\s*\/\s*(\d+)/i);
            if (match) {
                const success = Number(match[1]);
                const total = Number(match[2]);
                if (total > 0) {
                    return {
                        success,
                        total,
                        rate: Math.round((success / total) * 100),
                    };
                }
            }
        }

        let success = 0;
        let total = 0;

        logs.forEach((line) => {
            const bracketMatch = line.match(/\[(\d+)\s*\/\s*(\d+)\]/);
            if (bracketMatch) {
                total = Math.max(total, Number(bracketMatch[2]));
                if (line.toLowerCase().includes("created")) {
                    success += 1;
                }
            }
        });

        if (total > 0) {
            return {
                success,
                total,
                rate: Math.round((success / total) * 100),
            };
        }

        return null;
    }, [logs]);

    const handleStop = () => {
        if (!abortControllerRef.current) return;
        setLogs((prev) => [...prev, "Menghentikan proses..."]);
        abortControllerRef.current.abort();
    };

    const handleRun = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setLogs([
            "Menjalankan seeder...",
            "Menunggu serverless function (sekitar 10-20 detik)...",
        ]);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        let wasAborted = false;

        try {
            // Call the Python Serverless Function directly
            // Vercel maps 'api/index.py' to '/api' path usually
            const response = await fetch("/api", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: abortController.signal,
                body: JSON.stringify({ count, withFiles }),
            });

            const data = await response.json();

            if (data.success) {
                setLogs((prev) => [...prev, "Eksekusi serverless selesai:", ...data.logs]);
            } else {
                setLogs((prev) => [
                    ...prev,
                    `Error dari server: ${data.error || "Unknown error"}`,
                ]);
                if (data.logs) setLogs((prev) => [...prev, ...data.logs]);
            }

        } catch (error: any) {
            if (error?.name === "AbortError") {
                wasAborted = true;
            } else {
                setLogs((prev) => [...prev, `Error jaringan/klien: ${error.message}`]);
            }
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
            setLogs((prev) => [
                ...prev,
                wasAborted ? "Seeder dihentikan oleh pengguna." : "Proses selesai.",
            ]);
        }
    };

    return (
        <main className="page">
            <section className="panel seeder-panel">
                <header className="header">
                    <span className="badge seeder-badge">Seeder Utility</span>
                    <h1 className="title">Database Seeder</h1>
                    <p className="subtitle">
                        Generate data pendaftar dan file dummy untuk uji aplikasi.
                    </p>
                </header>

                <div className="seeder-grid">
                    <article className="seeder-card">
                        <h3>Konfigurasi</h3>
                        <div className="seeder-form">
                            <label htmlFor="seed-count">Jumlah data pendaftar</label>
                            <div className="seeder-input">
                                <input
                                    id="seed-count"
                                    type="number"
                                    value={count}
                                    onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                                    min="1"
                                    max="100"
                                />
                                <span>entri</span>
                            </div>

                            <label className="seeder-toggle" htmlFor="withFiles">
                                <input
                                    type="checkbox"
                                    id="withFiles"
                                    checked={withFiles}
                                    onChange={(e) => setWithFiles(e.target.checked)}
                                />
                                <span>Upload dummy files (foto, ijazah, dll)</span>
                            </label>

                            <div className="seeder-actions">
                                <button
                                    onClick={handleRun}
                                    disabled={isRunning}
                                    className="seeder-button"
                                >
                                    {isRunning ? "Menjalankan..." : "Jalankan Seeder"}
                                </button>
                                {isRunning && (
                                    <button
                                        onClick={handleStop}
                                        className="seeder-stop-button"
                                        type="button"
                                    >
                                        Stop
                                    </button>
                                )}
                                <div className="seeder-status">
                                    <span
                                        className={`status-dot ${isRunning ? "is-running" : "is-idle"}`}
                                    />
                                    <span>{isRunning ? "Seeder berjalan" : "Siap dijalankan"}</span>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="seeder-card">
                        <h3>Ringkasan</h3>
                        <div className="seeder-meta">
                            <div>
                                <span>Target endpoint</span>
                                <strong>/api</strong>
                            </div>
                            <div>
                                <span>Mode files</span>
                                <strong>{withFiles ? "Dengan file" : "Tanpa file"}</strong>
                            </div>
                            <div>
                                <span>Estimasi waktu</span>
                                <strong>10-20 detik</strong>
                            </div>
                            <div>
                                <span>Keberhasilan</span>
                                <strong>
                                    {successStats
                                        ? `${successStats.success}/${successStats.total} (${successStats.rate}%)`
                                        : isRunning
                                            ? "Sedang berjalan"
                                            : "Belum ada data"}
                                </strong>
                            </div>
                            <div>
                                <span>Log tersimpan</span>
                                <strong>{logs.length} baris</strong>
                            </div>
                        </div>
                    </article>
                </div>

                <section className="seeder-console" aria-live="polite">
                    <div className="seeder-console-header">
                        <div>
                            <h3>Log Output</h3>
                            <p>Log akan otomatis scroll saat ada update.</p>
                        </div>
                        <div className="seeder-console-meta">
                            <span className={`status-pill ${isRunning ? "is-running" : "is-idle"}`}>
                                {isRunning ? "Running" : "Idle"}
                            </span>
                            <span>{logs.length} baris</span>
                        </div>
                    </div>

                    <div className="seeder-progress">
                        <div className="progress-track">
                            <div
                                className={`progress-bar ${isRunning && !successStats ? "is-loading" : ""}`}
                                style={
                                    successStats
                                        ? { width: `${successStats.rate}%` }
                                        : undefined
                                }
                            />
                        </div>
                        <div className="progress-meta">
                            {successStats
                                ? `Berhasil ${successStats.success}/${successStats.total} (${successStats.rate}%)`
                                : isRunning
                                    ? "Memproses data..."
                                    : "Belum ada progres"}
                        </div>
                    </div>

                    <div className="seeder-output" role="log">
                        {logs.length === 0 ? (
                            <span className="seeder-placeholder">
                                // Output log akan tampil setelah proses dijalankan.
                            </span>
                        ) : (
                            logs.join("\n")
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </section>
            </section>
        </main>
    );
}
