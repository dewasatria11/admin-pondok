import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Supabase environment variables are missing.',
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from('system_metrics')
    .select('id, created_at, status, latency_ms, modules')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ status: 'empty' }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    timestamp: data.created_at,
    latency: data.latency_ms,
    modules: data.modules ?? [],
  });
}
