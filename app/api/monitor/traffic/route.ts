import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CloudflareSeries = {
  dimensions: { datetime: string };
  sum: {
    requests: number;
    bytes: number;
    cachedRequests: number;
    cachedBytes: number;
  };
};

export async function GET() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!token || !zoneId) {
    return NextResponse.json(
      {
        status: "error",
        error: "Missing Cloudflare environment variables.",
        required: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"],
      },
      { status: 500 }
    );
  }

  const now = new Date();
  const windowMinutes = 30;
  const since = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const query = `
    query Traffic($zoneTag: String!, $since: DateTime!, $until: DateTime!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1mGroups(
            limit: 60
            filter: { datetime_geq: $since, datetime_lt: $until }
          ) {
            dimensions { datetime }
            sum {
              requests
              bytes
              cachedRequests
              cachedBytes
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          zoneTag: zoneId,
          since: since.toISOString(),
          until: now.toISOString(),
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok || payload.errors) {
      return NextResponse.json(
        {
          status: "error",
          error: "Cloudflare API error.",
          details: payload.errors ?? payload,
        },
        { status: 502 }
      );
    }

    const groups: CloudflareSeries[] =
      payload?.data?.viewer?.zones?.[0]?.httpRequests1mGroups ?? [];

    const series = groups.map((group) => {
      const requests = group.sum?.requests ?? 0;
      const bytes = group.sum?.bytes ?? 0;
      const cachedRequests = group.sum?.cachedRequests ?? 0;
      const cachedBytes = group.sum?.cachedBytes ?? 0;

      return {
        time: group.dimensions?.datetime,
        requests,
        bytes,
        cachedRequests,
        cachedBytes,
        rps: Number((requests / 60).toFixed(2)),
      };
    });

    const totals = series.reduce(
      (acc, item) => {
        acc.requests += item.requests;
        acc.bytes += item.bytes;
        acc.cachedRequests += item.cachedRequests;
        acc.cachedBytes += item.cachedBytes;
        return acc;
      },
      { requests: 0, bytes: 0, cachedRequests: 0, cachedBytes: 0 }
    );

    const maxRps = series.reduce((max, item) => Math.max(max, item.rps), 0);
    const avgRps =
      totals.requests > 0
        ? Number((totals.requests / (windowMinutes * 60)).toFixed(2))
        : 0;
    const cacheHit =
      totals.requests > 0
        ? Number(((totals.cachedRequests / totals.requests) * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      status: "ok",
      generatedAt: now.toISOString(),
      windowMinutes,
      series,
      totals,
      rates: {
        avgRps,
        peakRps: maxRps,
        cacheHitPercent: cacheHit,
        avgBandwidthBytesPerSec:
          totals.bytes > 0
            ? Math.round(totals.bytes / (windowMinutes * 60))
            : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        error: error?.message ?? "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
