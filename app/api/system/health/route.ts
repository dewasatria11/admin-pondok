
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONFIGURATION ---
const TABLES = [
    // Core Data
    { name: 'pendaftar', label: 'Pendaftar', category: 'core' },
    { name: 'pembayaran', label: 'Pembayaran', category: 'core' },
    { name: 'gelombang', label: 'Gelombang', category: 'core' },

    // CMS & Content
    { name: 'berita', label: 'Berita', category: 'cms' },
    { name: 'hero_carousel_images', label: 'Hero Carousel', category: 'cms' },
    { name: 'hero_images', label: 'Hero Images', category: 'cms' },
    { name: 'brosur_items', label: 'Brosur', category: 'cms' },
    { name: 'why_section', label: 'Why Section', category: 'cms' },

    // Reference & Settings
    { name: 'alur_pendaftaran_steps', label: 'Alur Steps', category: 'ref' },
    { name: 'biaya_items', label: 'Biaya Items', category: 'ref' },
    { name: 'kontak_items', label: 'Kontak Items', category: 'ref' },
    { name: 'kontak_settings', label: 'Kontak Settings', category: 'ref' },
    { name: 'syarat_pendaftaran_items', label: 'Syarat Items', category: 'ref' },
    { name: 'payment_settings', label: 'Payment Settings', category: 'ref' },
    { name: 'maintenance_settings', label: 'Maintenance', category: 'ref' },
];

const BUCKETS = [
    { name: 'pendaftar-files', label: 'Pendaftar Files', category: 'storage' },
    { name: 'hero-carousel', label: 'Hero Carousel', category: 'storage' },
    { name: 'hero-images', label: 'Hero Images', category: 'storage' },
    { name: 'brosur-files', label: 'Brosur Files', category: 'storage' },
    { name: 'temp-downloads', label: 'Temp Downloads', category: 'storage' },
];

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET() {
    const startTime = performance.now();
    const results: any[] = [];
    let overallStatus = 'healthy';

    try {
        // 1. CHECK TABLES (Parallel)
        const tablePromises = TABLES.map(async (table) => {
            const tStart = performance.now();
            try {
                const { count, error } = await supabase
                    .from(table.name)
                    .select('*', { count: 'exact', head: true });

                const duration = Math.round(performance.now() - tStart);

                if (error) throw error;

                return {
                    type: 'table',
                    name: table.name,
                    label: table.label,
                    category: table.category,
                    status: 'ok',
                    count: count || 0,
                    latency: duration,
                };
            } catch (err: any) {
                overallStatus = 'degraded';
                return {
                    type: 'table',
                    name: table.name,
                    label: table.label,
                    category: table.category,
                    status: 'error',
                    error: err.message,
                    latency: Math.round(performance.now() - tStart),
                };
            }
        });

        // 2. CHECK STORAGE (Parallel)
        const bucketPromises = BUCKETS.map(async (bucket) => {
            const tStart = performance.now();
            try {
                // Just listing 1 file to check access and speed
                const { data, error } = await supabase.storage
                    .from(bucket.name)
                    .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } }); // Limit 100 to estimate "some files"

                const duration = Math.round(performance.now() - tStart);

                if (error) throw error;

                return {
                    type: 'storage',
                    name: bucket.name,
                    label: bucket.label,
                    category: bucket.category,
                    status: 'ok',
                    fileCount: data?.length || 0, // Note: This is only root level items limit 100
                    latency: duration,
                };
            } catch (err: any) {
                overallStatus = 'degraded';
                return {
                    type: 'storage',
                    name: bucket.name,
                    label: bucket.label,
                    category: bucket.category,
                    status: 'error',
                    error: err.message,
                    latency: Math.round(performance.now() - tStart),
                };
            }
        });

        const [tableResults, bucketResults] = await Promise.all([
            Promise.all(tablePromises),
            Promise.all(bucketPromises)
        ]);

        results.push(...tableResults, ...bucketResults);

    } catch (globalError: any) {
        overallStatus = 'critical';
        return NextResponse.json({
            status: overallStatus,
            error: globalError.message,
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }

    const totalDuration = Math.round(performance.now() - startTime);

    return NextResponse.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        latency: totalDuration,
        modules: results
    });
}
