"use client";

import { useState, useRef, useEffect } from "react";

export default function SeederPage() {
    const [count, setCount] = useState(10);
    const [withFiles, setWithFiles] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    const handleRun = async () => {
        setIsRunning(true);
        setLogs(["🚀 Starting seeder...", "Waiting for server response..."]);

        try {
            const response = await fetch("/api/seeder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ count, withFiles }),
            });

            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value);
                // Split by newlines and filter empty strings if needed, 
                // but keeping original formatting is often better for terminal output
                setLogs((prev) => [...prev, text]);
            }
        } catch (error: any) {
            setLogs((prev) => [...prev, `❌ Error: ${error.message}`]);
        } finally {
            setIsRunning(false);
            setLogs((prev) => [...prev, "🏁 Process finished."]);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Database Seeder Bot</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Jumlah Data (Pendaftar)
                        </label>
                        <input
                            type="number"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                            className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                            min="1"
                            max="100"
                        />
                    </div>

                    <div className="flex items-center mb-3">
                        <input
                            type="checkbox"
                            id="withFiles"
                            checked={withFiles}
                            onChange={(e) => setWithFiles(e.target.checked)}
                            className="w-5 h-5 mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="withFiles" className="select-none cursor-pointer">
                            Upload Dummy Files (Foto, Ijazah, dll)
                        </label>
                    </div>
                </div>

                <div className="mt-6">
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className={`px-6 py-2 rounded-md font-bold text-white transition-colors ${isRunning
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {isRunning ? "Sedang Berjalan..." : "Jalankan Seeder"}
                    </button>
                </div>
            </div>

            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto whitespace-pre-wrap">
                {logs.length === 0 ? (
                    <span className="text-gray-500">// Output logs will appear here...</span>
                ) : (
                    logs.join("")
                )}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
}
