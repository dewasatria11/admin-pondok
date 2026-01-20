'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
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
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

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
        if (status === 'ok' || status === 'healthy') return 'status-ok';
        if (status === 'degraded') return 'status-warning';
        return 'status-error';
    };

    const getLatencyColor = (ms: number) => {
        if (ms < 200) return 'text-emerald-400';
        if (ms < 800) return 'text-amber-400';
        return 'text-red-400';
    };

    const modules = data?.modules ?? [];
    const coreModules = modules.filter((m) => m.category === 'core');
    const cmsModules = modules.filter((m) => m.category === 'cms');
    const refModules = modules.filter((m) => m.category === 'ref');
    const storageModules = modules.filter((m) => m.category === 'storage');

    return (
        <div className="royal-page">
            {/* Navbar */}
            <motion.nav
                className="royal-nav mb-8"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="royal-container">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="royal-nav-link">
                                ← Kembali
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                                    System Health Monitor
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-xs text-right hidden sm:block">
                                <div className="text-text-muted">Total Latency</div>
                                <div className={`font-mono font-bold ${getLatencyColor(data?.latency || 0)}`}>
                                    {data?.latency ? `${data.latency}ms` : '...'}
                                </div>
                            </div>
                            <motion.div
                                className={`status-dot ${getStatusColor(data?.status || 'loading')}`}
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
                    {/* HEADER STATS */}
                    <motion.div variants={itemVariants} className="royal-grid royal-grid-3 mb-12">
                        <StatCard title="Total Tables Checked" value={data ? modules.filter((m) => m.type === 'table').length : '-'} icon="📊" />
                        <StatCard title="Storage Buckets" value={data ? modules.filter((m) => m.type === 'storage').length : '-'} icon="🗄️" />
                        <StatCard title="Last Updated" value={lastUpdated ? lastUpdated.toLocaleTimeString() : '-'} icon="🕒" />
                    </motion.div>

                    {loading && !data ? (
                        <motion.div variants={itemVariants} className="royal-card text-center py-20">
                            <motion.div
                                className="inline-block w-12 h-12 border-t-2 border-b-2 rounded-full"
                                style={{ borderColor: 'var(--gold-base)' }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            <p className="mt-4 text-text-muted">Connecting to Supabase satellites...</p>
                        </motion.div>
                    ) : (
                        <>
                            {/* CORE INFRASTRUCTURE */}
                            <Section title="Core Infrastructure" description="Critical tables for application functionality">
                                <div className="royal-grid royal-grid-3">
                                    {coreModules.map((m, idx) => (
                                        <ModuleCard key={m.name} module={m} index={idx} />
                                    ))}
                                </div>
                            </Section>

                            {/* STORAGE SYSTEMS */}
                            <Section title="Storage Systems" description="File object storage buckets status">
                                <div className="royal-grid royal-grid-3">
                                    {storageModules.map((m, idx) => (
                                        <ModuleCard key={m.name} module={m} icon="📦" isStorage index={idx} />
                                    ))}
                                </div>
                            </Section>

                            {/* CONTENT MANAGEMENT */}
                            <Section title="CMS Content" description="Dynamic content tables">
                                <div className="royal-grid royal-grid-4">
                                    {cmsModules.map((m, idx) => (
                                        <ModuleCard key={m.name} module={m} compact index={idx} />
                                    ))}
                                </div>
                            </Section>

                            {/* REFERENCE DATA */}
                            <Section title="Reference & Settings" description="Static configuration tables">
                                <div className="royal-grid royal-grid-4">
                                    {refModules.map((m, idx) => (
                                        <ModuleCard key={m.name} module={m} compact index={idx} />
                                    ))}
                                </div>
                            </Section>
                        </>
                    )}
                </motion.div>
            </main>

            <footer className="royal-footer mt-20">
                <p>Admin Pondok System Monitor • Powered by Next.js & Supabase</p>
            </footer>
        </div>
    );
}

function Section({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
    return (
        <motion.div variants={itemVariants} className="mb-12">
            <div className="mb-6 border-b border-border-subtle pb-2">
                <h2 className="royal-section-title">{title}</h2>
                <p className="text-sm text-text-muted">{description}</p>
            </div>
            {children}
        </motion.div>
    );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: string }) {
    return (
        <motion.div
            className="royal-stat-card"
            whileHover={{ scale: 1.05, y: -8 }}
            transition={{ duration: 0.3 }}
        >
            <div>
                <div className="royal-label mb-1">{title}</div>
                <motion.div
                    className="royal-stat-value"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {value}
                </motion.div>
            </div>
            <motion.div
                className="text-4xl opacity-50"
                whileHover={{ scale: 1.2, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {icon}
            </motion.div>
        </motion.div>
    );
}

function ModuleCard({
    module,
    compact,
    icon,
    isStorage,
    index = 0
}: {
    module: SystemModule,
    compact?: boolean,
    icon?: string,
    isStorage?: boolean,
    index?: number
}) {
    const isError = module.status === 'error';

    return (
        <motion.div
            className={`royal-card ${compact ? 'p-4' : 'p-6'}`}
            style={{
                borderColor: isError ? 'rgba(239, 68, 68, 0.4)' : undefined,
                background: isError ? 'rgba(239, 68, 68, 0.05)' : undefined,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -4 }}
        >
            {/* Status Indicator Line */}
            <div
                className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                style={{
                    background: isError
                        ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
                        : 'var(--gradient-gold)'
                }}
            />

            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className={`font-semibold text-text-primary ${compact ? 'text-sm' : 'text-lg'}`}>
                        {module.label}
                    </h3>
                    <p className="text-xs text-text-muted font-mono">{module.name}</p>
                </div>
                <motion.div
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`}
                    style={{
                        background: isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                        color: isError ? '#fca5a5' : '#fbbf24',
                    }}
                    whileHover={{ scale: 1.1 }}
                >
                    {isError ? 'ERR' : 'OK'}
                </motion.div>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <motion.div
                        className={`font-bold text-text-primary ${compact ? 'text-xl' : 'text-3xl'}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 + 0.2, type: 'spring' }}
                    >
                        {isError
                            ? '-'
                            : (isStorage ? module.fileCount ?? 0 : module.count ?? 0).toLocaleString()}
                    </motion.div>
                    <div className="text-xs text-text-muted mt-1">
                        {isStorage ? 'Object Files' : 'Total Rows'}
                    </div>
                </div>

                <div className="text-right">
                    <div className={`text-xs font-mono font-bold ${module.latency < 200 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {module.latency}ms
                    </div>
                    <div className="text-[10px] text-text-muted">Latency</div>
                </div>
            </div>

            {isError && (
                <motion.div
                    className="mt-3 text-xs text-red-400 bg-red-950/50 p-2 rounded"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    {module.error}
                </motion.div>
            )}
        </motion.div>
    );
}
