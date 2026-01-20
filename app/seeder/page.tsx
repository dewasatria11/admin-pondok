"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
        <div className="royal-page">
            <div className="royal-container">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Header */}
                    <motion.header variants={itemVariants} className="mb-8">
                        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="text-5xl"
                                >
                                    🤖
                                </motion.div>
                                <div>
                                    <span className="royal-badge mb-2 inline-block">Seeder Utility</span>
                                    <h1 className="royal-title m-0">Database Seeder</h1>
                                </div>
                            </div>

                            <Link href="/">
                                <motion.button
                                    className="royal-button-secondary"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    ← Kembali
                                </motion.button>
                            </Link>
                        </div>
                        <p className="royal-subtitle">
                            Generate data pendaftar dan file dummy untuk uji aplikasi dengan
                            cepat dan mudah.
                        </p>
                    </motion.header>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                        {/* Configuration Card */}
                        <motion.div variants={itemVariants} className="lg:col-span-3">
                            <div className="royal-card h-full">
                                <h3 className="royal-section-title mb-6">⚙️ Konfigurasi</h3>

                                <div className="space-y-6">
                                    {/* Count Input */}
                                    <div>
                                        <label htmlFor="seed-count" className="royal-label block mb-2">
                                            Jumlah Data Pendaftar
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                id="seed-count"
                                                type="range"
                                                value={count}
                                                onChange={(e) => setCount(parseInt(e.target.value))}
                                                min="1"
                                                max="100"
                                                className="flex-1 h-2 bg-noir-lighter rounded-lg appearance-none cursor-pointer"
                                                style={{
                                                    background: `linear-gradient(to right, var(--gold-base) 0%, var(--gold-base) ${count}%, var(--noir-lighter) ${count}%, var(--noir-lighter) 100%)`,
                                                }}
                                            />
                                            <motion.div
                                                className="royal-stat-card px-6 py-3 min-w-[100px] text-center"
                                                key={count}
                                                initial={{ scale: 1.2 }}
                                                animate={{ scale: 1 }}
                                            >
                                                <div className="text-3xl font-bold text-gold-light">
                                                    {count}
                                                </div>
                                                <div className="text-xs text-text-muted mt-1">entri</div>
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* With Files Toggle */}
                                    <motion.label
                                        htmlFor="withFiles"
                                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all"
                                        style={{
                                            borderColor: withFiles
                                                ? "var(--gold-base)"
                                                : "var(--border-subtle)",
                                            background: withFiles
                                                ? "rgba(212, 175, 55, 0.05)"
                                                : "transparent",
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <input
                                            type="checkbox"
                                            id="withFiles"
                                            checked={withFiles}
                                            onChange={(e) => setWithFiles(e.target.checked)}
                                            className="w-5 h-5 accent-gold-base cursor-pointer"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-text-primary">
                                                Upload Dummy Files
                                            </div>
                                            <div className="text-sm text-text-muted">
                                                Foto, ijazah, dan dokumen lainnya
                                            </div>
                                        </div>
                                        <motion.span
                                            className="text-2xl"
                                            animate={withFiles ? { rotate: [0, 10, -10, 0] } : {}}
                                            transition={{ duration: 0.5 }}
                                        >
                                            {withFiles ? "✅" : "⬜"}
                                        </motion.span>
                                    </motion.label>

                                    {/* Actions */}
                                    <div className="flex items-center gap-4 flex-wrap pt-4">
                                        <motion.button
                                            onClick={handleRun}
                                            disabled={isRunning}
                                            className="royal-button flex-1 min-w-[200px]"
                                            whileHover={!isRunning ? { scale: 1.05 } : {}}
                                            whileTap={!isRunning ? { scale: 0.95 } : {}}
                                        >
                                            {isRunning ? (
                                                <>
                                                    <motion.span
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    >
                                                        ⏳
                                                    </motion.span>
                                                    Menjalankan...
                                                </>
                                            ) : (
                                                <>
                                                    🚀 Jalankan Seeder
                                                </>
                                            )}
                                        </motion.button>

                                        <AnimatePresence>
                                            {isRunning && (
                                                <motion.button
                                                    onClick={handleStop}
                                                    className="royal-button-secondary"
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    ⏹️ Stop
                                                </motion.button>
                                            )}
                                        </AnimatePresence>

                                        <div className="flex items-center gap-2">
                                            <motion.div
                                                className={`status-dot ${isRunning ? "status-warning" : "status-idle"
                                                    }`}
                                                animate={isRunning ? { scale: [1, 1.2, 1] } : {}}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            />
                                            <span className="text-sm text-text-secondary">
                                                {isRunning ? "Seeder berjalan" : "Siap dijalankan"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Summary Card */}
                        <motion.div variants={itemVariants} className="lg:col-span-2">
                            <div className="royal-card h-full">
                                <h3 className="royal-section-title mb-6">📊 Ringkasan</h3>

                                <div className="space-y-4">
                                    <div className="royal-stat-card">
                                        <p className="royal-label mb-1">Target Endpoint</p>
                                        <p className="text-text-primary font-mono">/api</p>
                                    </div>

                                    <div className="royal-stat-card">
                                        <p className="royal-label mb-1">Mode Files</p>
                                        <p className="text-text-primary">
                                            {withFiles ? "✅ Dengan file" : "❌ Tanpa file"}
                                        </p>
                                    </div>

                                    <div className="royal-stat-card">
                                        <p className="royal-label mb-1">Estimasi Waktu</p>
                                        <p className="text-text-primary">10-20 detik</p>
                                    </div>

                                    <div className="royal-stat-card">
                                        <p className="royal-label mb-1">Keberhasilan</p>
                                        <motion.p
                                            className="text-text-primary font-semibold"
                                            key={successStats?.rate}
                                            initial={{ scale: 1.1, color: "var(--gold-light)" }}
                                            animate={{ scale: 1, color: "var(--text-primary)" }}
                                        >
                                            {successStats
                                                ? `${successStats.success}/${successStats.total} (${successStats.rate}%)`
                                                : isRunning
                                                    ? "Sedang berjalan..."
                                                    : "Belum ada data"}
                                        </motion.p>
                                    </div>

                                    <div className="royal-stat-card">
                                        <p className="royal-label mb-1">Log Tersimpan</p>
                                        <motion.p
                                            className="text-text-primary"
                                            key={logs.length}
                                            initial={{ scale: 1.1 }}
                                            animate={{ scale: 1 }}
                                        >
                                            {logs.length} baris
                                        </motion.p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Console Output */}
                    <motion.div variants={itemVariants} className="royal-card">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="royal-section-title mb-1">💻 Log Output</h3>
                                <p className="text-sm text-text-muted">
                                    Log akan otomatis scroll saat ada update
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                                    style={{
                                        background: isRunning
                                            ? "rgba(245, 158, 11, 0.2)"
                                            : "rgba(100, 116, 139, 0.2)",
                                        color: isRunning ? "#fbbf24" : "#94a3b8",
                                    }}
                                >
                                    {isRunning ? "Running" : "Idle"}
                                </span>
                                <span className="text-sm text-text-muted">{logs.length} baris</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="h-2 bg-noir-deep rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full"
                                    style={{
                                        background: "var(--gradient-gold)",
                                        width: successStats ? `${successStats.rate}%` : "0%",
                                    }}
                                    initial={{ width: "0%" }}
                                    animate={{
                                        width: successStats ? `${successStats.rate}%` : "0%",
                                    }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                            <p className="text-xs text-text-muted mt-2">
                                {successStats
                                    ? `Berhasil ${successStats.success}/${successStats.total} (${successStats.rate}%)`
                                    : isRunning
                                        ? "Memproses data..."
                                        : "Belum ada progres"}
                            </p>
                        </div>

                        {/* Log Display */}
                        <div
                            className="bg-noir-deep border border-border-subtle rounded-xl p-4 font-mono text-sm overflow-y-auto"
                            style={{ height: "320px" }}
                        >
                            <AnimatePresence>
                                {logs.length === 0 ? (
                                    <motion.div
                                        className="text-text-muted italic"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                    // Output log akan tampil setelah proses dijalankan.
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-1"
                                    >
                                        {logs.map((log, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="text-text-secondary"
                                            >
                                                <span className="text-gold-base mr-2">[{idx + 1}]</span>
                                                {log}
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div ref={logsEndRef} />
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <motion.footer variants={itemVariants} className="royal-footer mt-12">
                        <p>Database Seeder • Royal Noir Gold Edition</p>
                    </motion.footer>
                </motion.div>
            </div>
        </div>
    );
}
