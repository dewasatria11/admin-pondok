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

type TrafficQueryConfig = {
  groupField: "httpRequests1mGroups" | "httpRequests1hGroups";
  windowMinutes: number;
  limit: number;
  groupSeconds: number;
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
  const primaryConfig: TrafficQueryConfig = {
    groupField: "httpRequests1mGroups",
    windowMinutes: 30,
    limit: 60,
    groupSeconds: 60,
  };
  const fallbackConfig: TrafficQueryConfig = {
    groupField: "httpRequests1hGroups",
    windowMinutes: 24 * 60,
    limit: 24,
    groupSeconds: 60 * 60,
  };

  const buildQuery = (groupField: TrafficQueryConfig["groupField"], limit: number) => `
      query Traffic($zoneTag: String!, $since: DateTime!, $until: DateTime!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            ${groupField}(
              limit: ${limit}
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
    const requestTraffic = async (config: TrafficQueryConfig) => {
      const since = new Date(now.getTime() - config.windowMinutes * 60 * 1000);
      const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: buildQuery(config.groupField, config.limit),
          variables: {
            zoneTag: zoneId,
            since: since.toISOString(),
            until: now.toISOString(),
          },
        }),
      });
      const payload = await response.json();
      return { response, payload, config };
    };

    const isAuthzError = (payload: any, groupField: string) =>
      Array.isArray(payload?.errors) &&
      payload.errors.some(
        (err: any) =>
          err?.extensions?.code === "authz" &&
          Array.isArray(err?.path) &&
          err.path.includes(groupField)
      );

    let result = await requestTraffic(primaryConfig);

    if (!result.response.ok || result.payload?.errors) {
      if (isAuthzError(result.payload, primaryConfig.groupField)) {
        result = await requestTraffic(fallbackConfig);
      }

      if (!result.response.ok || result.payload?.errors) {
        return NextResponse.json(
          {
            status: "error",
            error: "Cloudflare API error.",
            details: result.payload?.errors ?? result.payload,
          },
          { status: 502 }
        );
      }
    }

    const groups: CloudflareSeries[] =
      result.payload?.data?.viewer?.zones?.[0]?.[result.config.groupField] ?? [];

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
        rps: Number((requests / result.config.groupSeconds).toFixed(2)),
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
        ? Number((totals.requests / (result.config.windowMinutes * 60)).toFixed(2))
        : 0;
    const cacheHit =
      totals.requests > 0
        ? Number(((totals.cachedRequests / totals.requests) * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      status: "ok",
      generatedAt: now.toISOString(),
      windowMinutes: result.config.windowMinutes,
      series,
      totals,
      rates: {
        avgRps,
        peakRps: maxRps,
        cacheHitPercent: cacheHit,
        avgBandwidthBytesPerSec:
          totals.bytes > 0
            ? Math.round(totals.bytes / (result.config.windowMinutes * 60))
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
