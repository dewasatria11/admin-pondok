import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSystemHealth } from '../../../../../lib/systemHealth';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const refreshToken = process.env.METRICS_REFRESH_TOKEN ?? '';
const minRefreshSeconds = 60;

const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

const toResponse = (row: any) => ({
  status: row.status,
  timestamp: row.created_at,
  latency: row.latency_ms,
  modules: row.modules ?? [],
});

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Supabase environment variables are missing.',
      },
      { status: 500 }
    );
  }

  if (refreshToken) {
    const url = new URL(request.url);
    const provided =
      request.headers.get('x-metrics-token') ?? url.searchParams.get('token');
    if (provided !== refreshToken) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Unauthorized.',
        },
        { status: 401 }
      );
    }
  }

  const { data: latest, error: latestError } = await supabase
    .from('system_metrics')
    .select('id, created_at, status, latency_ms, modules')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return NextResponse.json(
      {
        status: 'error',
        error: latestError.message,
      },
      { status: 500 }
    );
  }

  if (latest?.created_at) {
    const ageMs = Date.now() - new Date(latest.created_at).getTime();
    if (ageMs < minRefreshSeconds * 1000) {
      return NextResponse.json(toResponse(latest));
    }
  }

  try {
    const health = await getSystemHealth(supabase);
    const { data, error } = await supabase
      .from('system_metrics')
      .insert({
        status: health.status,
        latency_ms: health.latency,
        modules: health.modules,
      })
      .select('id, created_at, status, latency_ms, modules')
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          status: 'error',
          error: error?.message ?? 'Failed to write system metrics.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(toResponse(data));
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error?.message ?? 'Unexpected server error.',
      },
      { status: 500 }
    );
  }
}
