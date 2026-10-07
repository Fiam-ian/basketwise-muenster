const kinds = new Set(['supermarket', 'convenience', 'grocery', 'greengrocer', 'health_food']);
const types = new Set(['node', 'way', 'relation']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const coordinates = value => object(value) && typeof value.lat === 'number' && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90 && typeof value.lon === 'number' && Number.isFinite(value.lon) && Math.abs(value.lon) <= 180;
const label = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200 ? value : null;
function fail() { throw new TypeError('Invalid bounded shop discovery input.'); }
function metres(origin, point) {
  const radians = Math.PI / 180;
  const lat = (point.lat - origin.lat) * radians, lon = (point.lon - origin.lon) * radians;
  const a = Math.sin(lat / 2) ** 2 + Math.cos(origin.lat * radians) * Math.cos(point.lat * radians) * Math.sin(lon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
}

/** Bounded OSM discovery metadata; map points establish no branch, stock or route eligibility. */
export function normalizeShopDiscovery(overpassData, { origin, radiusKm, fetchedAt, sourceUrl } = {}) {
  if (!coordinates(origin) || typeof radiusKm !== 'number' || !Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 25 || !object(overpassData) || !Array.isArray(overpassData.elements) || overpassData.elements.length > 500) fail();
  let source;
  try { source = new URL(sourceUrl); } catch { fail(); }
  if (typeof sourceUrl !== 'string' || sourceUrl.length > 2048 || !['http:', 'https:'].includes(source.protocol) || source.username || source.password) fail();
  if (typeof fetchedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(fetchedAt) || !Number.isFinite(Date.parse(fetchedAt)) || new Date(fetchedAt).toISOString() !== fetchedAt.replace(/Z$/, fetchedAt.includes('.') ? 'Z' : '.000Z')) fail();
  const shops = [], seen = new Set();
  const excludedCounts = { invalidIdentity: 0, duplicateIdentity: 0, unsupportedShop: 0, missingCoordinates: 0 };
  for (const element of overpassData.elements) {
    if (!object(element) || !types.has(element.type) || !Number.isSafeInteger(element.id) || element.id <= 0) { excludedCounts.invalidIdentity++; continue; }
    const id = `${element.type}/${element.id}`;
    if (seen.has(id)) { excludedCounts.duplicateIdentity++; continue; }
    seen.add(id);
    const tags = object(element.tags) ? element.tags : {};
    if (!kinds.has(tags.shop)) { excludedCounts.unsupportedShop++; continue; }
    const point = element.type === 'node' ? element : element.center;
    if (!coordinates(point)) { excludedCounts.missingCoordinates++; continue; }
    const distanceMeters = metres(origin, point);
    shops.push({ id, osmType: element.type, osmId: element.id, kind: tags.shop,
      name: label(tags.name), brand: label(tags.brand),
      address: { street: label(tags['addr:street']), houseNumber: label(tags['addr:housenumber']), postcode: label(tags['addr:postcode']), city: label(tags['addr:city']) },
      point: { lat: point.lat, lon: point.lon }, distanceMeters,
      distanceBasis: 'straight_line_to_osm_point', withinRadius: distanceMeters <= radiusKm * 1000,
      branchIdentityReviewed: false, inventoryAvailable: false,
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}` });
  }
  shops.sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id));
  return { shopDiscoveryVersion: 1, origin: {lat: origin.lat, lon: origin.lon}, radiusKm,
    fetchedAt, sourceUrl, shops, excludedCounts, discoveryComplete: false,
    branchIdentityReviewed: false, inventoryAvailable: false,
    attribution: '© OpenStreetMap contributors', licence: 'ODbL-1.0',
    licenceUrl: 'https://www.openstreetmap.org/copyright' };
}
