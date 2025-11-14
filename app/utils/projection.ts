import proj4 from 'proj4'

export function getUTMZone(lng: number, lat: number): number {
  const zone = Math.floor((lng + 180) / 6) + 1
  return lat >= 0 ? zone : -zone
}

export function getUTMProj4String(zone: number): string {
  const absZone = Math.abs(zone)
  const hemisphere = zone >= 0 ? 'north' : 'south'
  return `+proj=utm +zone=${absZone} +${hemisphere} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`
}

export function projectToUTM(lng: number, lat: number, zone: number): { x: number, y: number } {
  const utmProj = getUTMProj4String(zone)
  const wgs84 = 'EPSG:4326'

  const [x, y] = proj4(wgs84, utmProj, [lng, lat])
  return { x, y }
}

export function projectFromUTM(x: number, y: number, zone: number): { lat: number, lng: number } {
  const utmProj = getUTMProj4String(zone)
  const wgs84 = 'EPSG:4326'

  const [lng, lat] = proj4(utmProj, wgs84, [x, y])
  return { lat, lng }
}

export function calculateCentroid(positions: [number, number][]): [number, number] {
  const sumLat = positions.reduce((sum, [lat]) => sum + lat, 0)
  const sumLng = positions.reduce((sum, [, lng]) => sum + lng, 0)
  return [sumLat / positions.length, sumLng / positions.length]
}
