import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min

const BMKG_RSS = "https://www.bmkg.go.id/alerts/nowcast/id";

interface Alert {
  event: string;
  headline: string;
  description: string;
  urgency: string;
  severity: string;
  certainty: string;
  effective: string;
  expires: string;
  web: string;
  areas: { areaDesc: string; polygons: number[][][] }[];
}

/** Extract text between opening and closing tags */
function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
}

/** Parse CAP polygon "lat,lng lat,lng ..." → [[lng, lat], ...] */
function parsePolygon(s: string): number[][] {
  return s
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lat, lng] = pair.split(",").map(Number);
      return [lng, lat]; // swap to [lng, lat] for GeoJSON/SVG compat
    });
}

async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch(BMKG_RSS, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const xml = await res.text();

  // Extract <item> blocks
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  // Filter Sumatera Utara items
  const suItems = items.filter((item) =>
    tag(item, "title").toLowerCase().includes("sumatera utara")
  );

  if (suItems.length === 0) return [];

  // Fetch CAP details in parallel
  const alerts = await Promise.all(
    suItems.map(async (item): Promise<Alert | null> => {
      const link = tag(item, "link");
      if (!link) return null;

      try {
        const capRes = await fetch(link, { next: { revalidate: 300 } });
        if (!capRes.ok) return null;
        const cap = await capRes.text();

        const info = cap.match(/<info>([\s\S]*?)<\/info>/)?.[1] ?? cap;

        // Parse all <area> blocks
        const areaBlocks = info.match(/<area>[\s\S]*?<\/area>/g) ?? [];
        const areas = areaBlocks.map((block) => {
          const areaDesc = tag(block, "areaDesc");
          const polys = block.match(/<polygon>([\s\S]*?)<\/polygon>/g) ?? [];
          return {
            areaDesc,
            polygons: polys.map((p) =>
              parsePolygon(p.replace(/<\/?polygon>/g, ""))
            ),
          };
        });

        return {
          event: tag(info, "event"),
          headline: tag(info, "headline"),
          description: tag(info, "description"),
          urgency: tag(info, "urgency"),
          severity: tag(info, "severity"),
          certainty: tag(info, "certainty"),
          effective: tag(info, "effective"),
          expires: tag(info, "expires"),
          web: tag(info, "web"),
          areas,
        };
      } catch {
        return null;
      }
    })
  );

  return alerts.filter(Boolean) as Alert[];
}

export async function GET() {
  try {
    const alerts = await fetchAlerts();
    return NextResponse.json({
      alerts,
      meta: {
        timestamp: new Date().toISOString(),
        source: "BMKG",
        count: alerts.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
