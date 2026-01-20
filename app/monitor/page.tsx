
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

type SystemModule = {
    type: 'table' | 'storage';
    name: string;
    label: string;
    category: string;
    status: 'ok' | 'error';
    count?: number;
    fileCount?: number;
    latency: number;
    error?: string;
};

type SystemHealth = {
    status: string;
    timestamp: string;
    latency: number;
    modules: SystemModule[];
};

type MetricsRow = {
    id: string;
    created_at: string;
    status: string;
    latency_ms: number;
    modules: SystemModule[];
};

const toHealth = (row: MetricsRow): SystemHealth => ({
    status: row.status,
    timestamp: row.created_at,
    latency: row.latency_ms,
    modules: row.modules ?? [],
});

export default function SystemMonitorPage() {
    const [data, setData] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const applyHealth = (health: SystemHealth) => {
        setData(health);
        const timestamp = health.timestamp ? new Date(health.timestamp) : new Date();
        setLastUpdated(timestamp);
        setLoading(false);
    };

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/system/metrics', { cache: 'no-store' });
            if (!res.ok) {
                return false;
            }
            const json = (await res.json()) as SystemHealth;
            if (!json?.modules) {
                return false;
            }
            applyHealth(json);
            return true;
        } catch (e) {
            return false;
        }
    };

    const fetchHealth = async () => {
        try {
            const res = await fetch('/api/system/health', { cache: 'no-store' });
            const json = await res.json();
            if (res.ok) {
                applyHealth(json);
                return true;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    };

    useEffect(() => {
        let channel: any;

        const loadInitial = async () => {
            const ok = await fetchMetrics();
            if (!ok) {
                await fetchHealth();
            }
        };

        loadInitial();

        const interval = setInterval(async () => {
            const ok = await fetchMetrics();
            if (!ok) {
                await fetchHealth();
            }
        }, 60000);

        if (supabaseBrowser) {
            channel = supabaseBrowser
                .channel('system-metrics')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'system_metrics' },
                    (payload) => {
                        if (!payload?.new) {
                            return;
                        }
                        applyHealth(toHealth(payload.new as MetricsRow));
                    }
                )
                .subscribe();
        }

        return () => {
            clearInterval(interval);
            if (channel && supabaseBrowser) {
                supabaseBrowser.removeChannel(channel);
            }
        };
    }, []);

    const getStatusColor = (status: string) => {
        if (status === 'ok' || status === 'healthy') return 'bg-green-500 shadow-green-500/50';
        if (status === 'degraded') return 'bg-yellow-500 shadow-yellow-500/50';
        return 'bg-red-500 shadow-red-500/50';
    };

    const getLatencyColor = (ms: number) => {
        if (ms < 200) return 'text-green-400';
        if (ms < 800) return 'text-yellow-400';
        return 'text-red-400';
    };

    const modules = data?.modules ?? [];
    const coreModules = modules.filter((m) => m.category === 'core');
    const cmsModules = modules.filter((m) => m.category === 'cms');
    const refModules = modules.filter((m) => m.category === 'ref');
    const storageModules = modules.filter((m) => m.category === 'storage');

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-500/30">
            {/* Navbar Minimal */}
            <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
                                </svg>
                            </Link>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                System Health Monitor
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-xs text-right hidden sm:block">
                                <div className="text-slate-400">Total Latency</div>
                                <div className={`font-mono font-bold ${getLatencyColor(data?.latency || 0)}`}>
                                    {data?.latency ? `${data.latency}ms` : '...'}
                                </div>
                            </div>
                            <div className={`h-3 w-3 rounded-full ${getStatusColor(data?.status || 'loading')} animate-pulse`}></div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {/* HEADER STATS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Tables Checked" value={data ? modules.filter((m) => m.type === 'table').length : '-'} icon="📊" />
                    <StatCard title="Storage Buckets" value={data ? modules.filter((m) => m.type === 'storage').length : '-'} icon="🗄️" />
                    <StatCard title="Last Updated" value={lastUpdated ? lastUpdated.toLocaleTimeString() : '-'} icon="🕒" />
                </div>

                {loading && !data ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                        <p className="mt-4 text-slate-400">Connecting to Supabase satellites...</p>
                    </div>
                ) : (
                    <>
                        {/* CORE INFRASTRUCTURE */}
                        <Section title="Core Infrastructure" description="Critical tables for application functionality">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {coreModules.map((m) => (
                                    <ModuleCard key={m.name} module={m} />
                                ))}
                            </div>
                        </Section>

                        {/* STORAGE SYSTEMS */}
                        <Section title="Storage Systems" description="File object storage buckets status">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {storageModules.map((m) => (
                                    <ModuleCard key={m.name} module={m} icon="📦" isStorage />
                                ))}
                            </div>
                        </Section>

                        {/* CONTENT MANAGEMENT */}
                        <Section title="CMS Content" description="Dynamic content tables">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {cmsModules.map((m) => (
                                    <ModuleCard key={m.name} module={m} compact />
                                ))}
                            </div>
                        </Section>

                        {/* REFERENCE DATA */}
                        <Section title="Reference & Settings" description="Static configuration tables">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {refModules.map((m) => (
                                    <ModuleCard key={m.name} module={m} compact />
                                ))}
                            </div>
                        </Section>
                    </>
                )}
            </main>

            <footer className="border-t border-slate-800 mt-20 py-8 text-center text-slate-500 text-sm">
                <p>Admin Pondok System Monitor &bull; Powered by Next.js & Supabase</p>
            </footer>
        </div>
    );
}

function Section({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6 border-b border-slate-800 pb-2">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="text-slate-400 text-sm">{description}</p>
            </div>
            {children}
        </div>
    );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: string }) {
    return (
        <div className="bg-[#1e293b]/50 backdrop-blur border border-slate-700/50 rounded-xl p-6 flex items-center justify-between shadow-lg hover:border-cyan-500/30 transition-all group">
            <div>
                <div className="text-slate-400 text-sm font-medium mb-1">{title}</div>
                <div className="text-3xl font-bold text-white group-hover:text-cyan-400 transition-colors">{value}</div>
            </div>
            <div className="text-4xl opacity-50 grayscale group-hover:grayscale-0 transition-all">{icon}</div>
        </div>
    );
}

function ModuleCard({
    module,
    compact,
    icon,
    isStorage
}: {
    module: SystemModule,
    compact?: boolean,
    icon?: string,
    isStorage?: boolean
}) {
    const isError = module.status === 'error';

    return (
        <div className={`
      relative overflow-hidden rounded-lg border transition-all duration-300 hover:-translate-y-1
      ${isError
                ? 'bg-red-950/20 border-red-900/50 hover:border-red-500/50'
                : 'bg-[#1e293b] border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
            }
      ${compact ? 'p-4' : 'p-6'}
    `}>
            {/* Status Indicator Line */}
            <div className={`absolute top-0 left-0 w-1 h-full ${isError ? 'bg-red-500' : 'bg-cyan-500'}`}></div>

            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className={`font-semibold text-slate-200 ${compact ? 'text-sm' : 'text-lg'}`}>
                        {module.label}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">{module.name}</p>
                </div>
                <div className={`
          px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
          ${isError ? 'bg-red-900 text-red-200' : 'bg-cyan-950 text-cyan-200'}
        `}>
                    {isError ? 'ERR' : 'OK'}
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <div className={`font-bold text-white ${compact ? 'text-xl' : 'text-3xl'}`}>
                        {isError ? '-' : (isStorage ? module.fileCount : module.count).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {isStorage ? 'Object Files' : 'Total Rows'}
                    </div>
                </div>

                <div className="text-right">
                    <div className={`text-xs font-mono font-bold ${module.latency < 200 ? 'text-green-500' : 'text-yellow-500'}`}>
                        {module.latency}ms
                    </div>
                    <div className="text-[10px] text-slate-600">Latency</div>
                </div>
            </div>

            {isError && (
                <div className="mt-3 text-xs text-red-400 bg-red-950/50 p-2 rounded">
                    {module.error}
                </div>
            )}
        </div>
    );
}
