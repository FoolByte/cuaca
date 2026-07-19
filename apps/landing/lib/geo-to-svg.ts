/**
 * Convert GeoJSON features to SVG path strings.
 * Simple Mercator projection, no external dependencies.
 */

export interface BBox {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

export interface SvgFeature {
  path: string; // SVG path d attribute
  name: string;
  kecamatan?: string;
}

/** Compute bounding box from all features */
export function computeBBox(geojson: GeoJSON.FeatureCollection): BBox {
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  for (const feature of geojson.features) {
    const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    flattenCoords(geom.coordinates, (lon, lat) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  }

  return { minLon, maxLon, minLat, maxLat };
}

/** Expand bounding box by a fraction */
export function expandBBox(bbox: BBox, fraction: number): BBox {
  const lonPad = (bbox.maxLon - bbox.minLon) * fraction;
  const latPad = (bbox.maxLat - bbox.minLat) * fraction;
  return {
    minLon: bbox.minLon - lonPad,
    maxLon: bbox.maxLon + lonPad,
    minLat: bbox.minLat - latPad,
    maxLat: bbox.maxLat + latPad,
  };
}

/** Project [lon, lat] to [svgX, svgY] */
export function project(
  lon: number,
  lat: number,
  bbox: BBox,
  width: number,
  height: number
): [number, number] {
  // Mercator Y uses tan(lat) for proper projection
  const latRad = (lat * Math.PI) / 180;
  const minLatRad = (bbox.minLat * Math.PI) / 180;
  const maxLatRad = (bbox.maxLat * Math.PI) / 180;

  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const mercMinY = Math.log(Math.tan(Math.PI / 4 + minLatRad / 2));
  const mercMaxY = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));

  const x = ((lon - bbox.minLon) / (bbox.maxLon - bbox.minLon)) * width;
  const y = ((mercMaxY - mercY) / (mercMaxY - mercMinY)) * height;

  return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
}

/** Convert GeoJSON coordinate rings to SVG path string */
export function ringsToSvgPath(
  rings: number[][][],
  bbox: BBox,
  width: number,
  height: number
): string {
  return rings
    .map((ring) => {
      const projected = ring.map(([lon, lat]) => project(lon, lat, bbox, width, height));
      return (
        projected
          .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`)
          .join(" ") + "Z"
      );
    })
    .join(" ");
}

/** Convert a GeoJSON Feature to an SvgFeature */
export function featureToSvg(
  feature: GeoJSON.Feature,
  bbox: BBox,
  width: number,
  height: number
): SvgFeature {
  const geom = feature.geometry;
  let path: string;

  if (geom.type === "Polygon") {
    path = ringsToSvgPath(geom.coordinates as number[][][], bbox, width, height);
  } else if (geom.type === "MultiPolygon") {
    path = (geom.coordinates as number[][][][])
      .map((polygon) => ringsToSvgPath(polygon, bbox, width, height))
      .join(" ");
  } else {
    path = "";
  }

  return {
    path,
    name: (feature.properties as Record<string, string>)?.name ?? "",
    kecamatan: (feature.properties as Record<string, string>)?.kecamatan,
  };
}

/** Compute centroid of a feature (average of all coordinates) */
export function featureCentroid(
  feature: GeoJSON.Feature,
  bbox: BBox,
  width: number,
  height: number
): [number, number] {
  let sumX = 0,
    sumY = 0,
    count = 0;

  const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  flattenCoords(geom.coordinates, (lon, lat) => {
    const [x, y] = project(lon, lat, bbox, width, height);
    sumX += x;
    sumY += y;
    count++;
  });

  return [sumX / count, sumY / count];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CoordArray = any;

/** Recursively flatten nested coordinate arrays, calling fn for each [lon, lat] */
function flattenCoords(
  coords: CoordArray,
  fn: (lon: number, lat: number) => void
): void {
  if (typeof coords[0] === "number") {
    fn(coords[0] as number, coords[1] as number);
  } else {
    for (const c of coords as CoordArray[]) {
      flattenCoords(c, fn);
    }
  }
}

/** Compute geographic centroid [lon, lat] from a GeoJSON feature */
export function geoCentroid(feature: GeoJSON.Feature): [number, number] {
  let sumLon = 0,
    sumLat = 0,
    count = 0;
  const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  flattenCoords(geom.coordinates, (lon, lat) => {
    sumLon += lon;
    sumLat += lat;
    count++;
  });
  return [sumLon / count, sumLat / count];
}

/** Squared distance between two [lon, lat] points */
function dist2(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

// ── Hexagonal grid ────────────────────────────────────────────────────

export interface HexCell {
  cx: number;       // SVG x
  cy: number;       // SVG y
  polygon: string;  // SVG path d for the hex shape
  lon: number;      // geographic lon (center)
  lat: number;      // geographic lat (center)
}

/** Point-in-polygon test (ray casting) for a single ring */
function pointInRing(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Check if a geographic point is inside any kecamatan polygon */
export function pointInMedan(
  lon: number,
  lat: number,
  kecGeojson: GeoJSON.FeatureCollection
): boolean {
  for (const feature of kecGeojson.features) {
    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      if (pointInRing(lon, lat, (geom.coordinates as number[][][])[0])) return true;
    } else if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates as number[][][][]) {
        if (pointInRing(lon, lat, polygon[0])) return true;
      }
    }
  }
  return false;
}

/** Generate flat-top hexagon grid covering the bounding box */
export function generateHexGrid(
  bbox: BBox,
  radius: number,
  svgWidth: number,
  svgHeight: number,
  kecGeojson: GeoJSON.FeatureCollection
): HexCell[] {
  const sqrt3 = Math.sqrt(3);
  const hexW = radius * 2;
  const hexH = sqrt3 * radius;
  const colStep = hexW * 0.75;
  const rowStep = hexH;

  // Convert bbox corners to SVG space to determine grid extent
  const [x0, y0] = project(bbox.minLon, bbox.maxLat, bbox, svgWidth, svgHeight);
  const [x1, y1] = project(bbox.maxLon, bbox.minLat, bbox, svgWidth, svgHeight);

  const cells: HexCell[] = [];

  // Generate grid in SVG space, then convert back to geo for point-in-polygon
  for (let row = -1; (y0 + row * rowStep) <= y1 + rowStep; row++) {
    const xOffset = row % 2 !== 0 ? colStep : 0;
    for (let col = -1; (x0 + col * colStep + xOffset) <= x1 + colStep; col++) {
      const cx = x0 + col * colStep + xOffset;
      const cy = y0 + row * rowStep;

      // Convert SVG center back to geographic coords (inverse of project())
      const lon = bbox.minLon + ((cx / svgWidth) * (bbox.maxLon - bbox.minLon));
      const minLatRad = (bbox.minLat * Math.PI) / 180;
      const maxLatRad = (bbox.maxLat * Math.PI) / 180;
      const mercMinY = Math.log(Math.tan(Math.PI / 4 + minLatRad / 2));
      const mercMaxY = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));
      const normY = cy / svgHeight; // 0 at top (maxLat), 1 at bottom (minLat)
      const mercY = mercMinY + (1 - normY) * (mercMaxY - mercMinY);
      const lat = (Math.atan(Math.sinh(mercY)) * 180) / Math.PI;

      // Only include hexes whose center is inside Medan
      if (!pointInMedan(lon, lat, kecGeojson)) continue;

      // Build hex polygon vertices (flat-top)
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = cx + radius * Math.cos(angle);
        const hy = cy + radius * Math.sin(angle);
        points.push(`${hx},${hy}`);
      }

      cells.push({
        cx,
        cy,
        polygon: `M${points.join("L")}Z`,
        lon,
        lat,
      });
    }
  }

  return cells;
}

/** Inverse Distance Weighting interpolation */
export function idwInterpolate(
  target: [number, number],
  sources: [number, number][],
  values: number[],
  power = 2
): number {
  let weightSum = 0;
  let valueSum = 0;

  for (let i = 0; i < sources.length; i++) {
    const dx = target[0] - sources[i][0];
    const dy = target[1] - sources[i][1];
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.0001) return values[i]; // exact match
    const w = 1 / Math.pow(d, power);
    weightSum += w;
    valueSum += w * values[i];
  }

  return weightSum > 0 ? valueSum / weightSum : 0;
}
