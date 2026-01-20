import { SupabaseClient } from '@supabase/supabase-js';

type ModuleStatus = 'ok' | 'error';

export type SystemModule = {
  type: 'table' | 'storage';
  name: string;
  label: string;
  category: string;
  status: ModuleStatus;
  count?: number;
  fileCount?: number;
  latency: number;
  error?: string;
};

export type SystemHealth = {
  status: 'healthy' | 'degraded';
  timestamp: string;
  latency: number;
  modules: SystemModule[];
};

const TABLES = [
  { name: 'pendaftar', label: 'Pendaftar', category: 'core' },
  { name: 'pembayaran', label: 'Pembayaran', category: 'core' },
  { name: 'gelombang', label: 'Gelombang', category: 'core' },
  { name: 'berita', label: 'Berita', category: 'cms' },
  { name: 'hero_carousel_images', label: 'Hero Carousel', category: 'cms' },
  { name: 'hero_images', label: 'Hero Images', category: 'cms' },
  { name: 'brosur_items', label: 'Brosur', category: 'cms' },
  { name: 'why_section', label: 'Why Section', category: 'cms' },
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

export async function getSystemHealth(
  supabase: SupabaseClient
): Promise<SystemHealth> {
  const startTime = performance.now();

  const tablePromises = TABLES.map(async (table) => {
    const tStart = performance.now();
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      return {
        type: 'table',
        name: table.name,
        label: table.label,
        category: table.category,
        status: 'ok',
        count: count || 0,
        latency: Math.round(performance.now() - tStart),
      } as SystemModule;
    } catch (err: any) {
      return {
        type: 'table',
        name: table.name,
        label: table.label,
        category: table.category,
        status: 'error',
        error: err.message,
        latency: Math.round(performance.now() - tStart),
      } as SystemModule;
    }
  });

  const bucketPromises = BUCKETS.map(async (bucket) => {
    const tStart = performance.now();
    try {
      const { data, error } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

      if (error) throw error;

      return {
        type: 'storage',
        name: bucket.name,
        label: bucket.label,
        category: bucket.category,
        status: 'ok',
        fileCount: data?.length || 0,
        latency: Math.round(performance.now() - tStart),
      } as SystemModule;
    } catch (err: any) {
      return {
        type: 'storage',
        name: bucket.name,
        label: bucket.label,
        category: bucket.category,
        status: 'error',
        error: err.message,
        latency: Math.round(performance.now() - tStart),
      } as SystemModule;
    }
  });

  const [tableResults, bucketResults] = await Promise.all([
    Promise.all(tablePromises),
    Promise.all(bucketPromises),
  ]);

  const modules = [...tableResults, ...bucketResults];
  const overallStatus = modules.some((module) => module.status === 'error')
    ? 'degraded'
    : 'healthy';
  const totalDuration = Math.round(performance.now() - startTime);

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    latency: totalDuration,
    modules,
  };
}
