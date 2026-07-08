/** WIRKUNG digital GmbH, Hildegard von Bingen Str. 1, 61273 Wehrheim */
export const WIRKUNG_ORIGIN = {
  label: "61273 Wehrheim, Deutschland",
  lat: 50.2986,
  lon: 8.5694,
}

/** Straßenfaktor auf Luftlinie (Schätzung ohne Routing-API) */
const ROAD_FACTOR = 1.28

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function geocodeAddress(
  adresse: string,
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const q = adresse.trim()
  if (!q) return null

  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", "1")
  url.searchParams.set("countrycodes", "de")
  url.searchParams.set("q", q)

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "WIRKUNG-Wristlink-Konfigurator/1.0",
      Accept: "application/json",
    },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) return null
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[]
  if (!data.length) return null

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  }
}

export async function berechneFahrKm(eventAdresse: string): Promise<{
  km: number
  displayName?: string
} | null> {
  const geo = await geocodeAddress(eventAdresse)
  if (!geo) return null

  const luftlinie = haversineKm(WIRKUNG_ORIGIN.lat, WIRKUNG_ORIGIN.lon, geo.lat, geo.lon)
  const km = Math.round(luftlinie * ROAD_FACTOR)
  return { km: Math.max(1, km), displayName: geo.displayName }
}
