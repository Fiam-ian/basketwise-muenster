const positiveId = value => Number.isSafeInteger(value) && value > 0;
const calendarDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const safeText = value => typeof value === 'string' && value.length <= 160 && !/[\u0000-\u001f\u007f<>]|https?:\/\/|file:|@/i.test(value) ? value.trim() || null : null;

/** Allowlisted historical location metadata only. No branch authentication is performed. */
export function inspectCoverageReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report) || report.auditVersion !== 1 || !Array.isArray(report.observations) || report.observations.length > 300) throw new TypeError('Expected a version-1 coverage audit with at most 300 observations.');
  if (report.referenceDateBasis !== 'Europe/Berlin' || !calendarDate(report.queriedWindow?.referenceDate) || !calendarDate(report.queriedWindow?.sinceInclusive) || report.queriedWindow.sinceInclusive > report.queriedWindow.referenceDate) throw new TypeError('Invalid audit reference date or query window.');
  if (!Number.isSafeInteger(report.providerTotal) || report.providerTotal < report.observations.length || typeof report.truncated !== 'boolean') throw new TypeError('Invalid provider count or truncation metadata.');
  const locations = new Map();
  const allProofs = new Set();
  const allDates = new Map();
  const seenRecords = new Set();
  let duplicateRecordCount = 0;
  let missingLocationCount = 0;
  let missingProofCount = 0;
  let missingDateCount = 0;
  let invalidDateCount = 0;
  let conflictingLocationIdentityCount = 0;
  let conflictingProofIdentityCount = 0;
  for (const observation of report.observations) {
    if (!observation || typeof observation !== 'object' || observation.provider !== 'open-prices' || !observation.raw || typeof observation.raw !== 'object' || Array.isArray(observation.raw) || !positiveId(observation.raw.id) || observation.providerRecordId !== String(observation.raw.id)) throw new TypeError('Unsupported provider observation identity.');
    const raw = observation.raw;
    if (seenRecords.has(raw.id)) duplicateRecordCount++;
    seenRecords.add(raw.id);
    const date = raw.date ?? observation.observedOn;
    if (date === null || date === undefined || date === '') missingDateCount++;
    else if (!calendarDate(date)) invalidDateCount++;
    else allDates.set(date, (allDates.get(date) ?? 0) + 1);
    const proofId = raw.proof_id ?? raw.proof?.id;
    const proofConflict = positiveId(raw.proof_id) && positiveId(raw.proof?.id) && raw.proof_id !== raw.proof.id;
    if (proofConflict) conflictingProofIdentityCount++;
    if (positiveId(proofId) && !proofConflict) allProofs.add(proofId);
    else missingProofCount++;
    const locationId = raw.location_id ?? raw.location?.id;
    if (!positiveId(locationId)) { missingLocationCount++; continue; }
    const locationConflict = positiveId(raw.location_id) && positiveId(raw.location?.id) && raw.location_id !== raw.location.id;
    if (locationConflict) conflictingLocationIdentityCount++;
    if (!locations.has(locationId)) locations.set(locationId, { count: 0, proofs: new Set(), dates: new Map(), metadata: new Map(), missingMetadataCount: 0 });
    const group = locations.get(locationId);
    group.count++;
    if (positiveId(proofId) && !proofConflict) group.proofs.add(proofId);
    if (calendarDate(date)) group.dates.set(date, (group.dates.get(date) ?? 0) + 1);
    const location = raw.location;
    if (!location || typeof location !== 'object' || Array.isArray(location) || locationConflict || !positiveId(location.id) || location.id !== locationId) { group.missingMetadataCount++; continue; }
    const metadata = {
      locationType: ['OSM', 'ONLINE'].includes(location.type) ? location.type : null,
      osmType: ['NODE', 'WAY', 'RELATION'].includes(location.osm_type) ? location.osm_type : null,
      osmId: positiveId(location.osm_id) ? location.osm_id : null,
      providerStoreName: safeText(location.osm_name),
      providerBrand: safeText(location.osm_brand),
      city: safeText(location.osm_address_city),
      postcode: safeText(location.osm_address_postcode),
      countryCode: safeText(location.osm_address_country_code),
    };
    group.metadata.set(JSON.stringify(metadata), metadata);
  }
  const dateCounts = counts => [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, observationCount]) => ({ date, observationCount }));
  return {
    inspectorVersion: 1,
    provider: 'open-prices',
    referenceDate: report.queriedWindow.referenceDate,
    sinceInclusive: report.queriedWindow.sinceInclusive,
    referenceDateBasis: report.referenceDateBasis,
    observationCount: report.observations.length,
    distinctProviderRecordCount: seenRecords.size,
    duplicateRecordCount,
    distinctLocationCount: locations.size,
    distinctProofCount: allProofs.size,
    missingLocationCount, missingProofCount, missingDateCount, invalidDateCount,
    conflictingLocationIdentityCount, conflictingProofIdentityCount,
    observationDates: dateCounts(allDates),
    providerTotal: report.providerTotal,
    truncated: report.truncated,
    locations: [...locations.entries()].sort(([a], [b]) => a - b).map(([providerLocationId, group]) => ({
      providerLocationId,
      observationCount: group.count,
      distinctProofCount: group.proofs.size,
      observationDates: dateCounts(group.dates),
      missingMetadataCount: group.missingMetadataCount,
      conflictingMetadata: group.metadata.size > 1,
      providerMetadataCandidates: [...group.metadata.values()],
      identityVerified: false,
    })),
    meaning: 'Unverified provider location metadata and historical observation counts. No branch identity, current price, stock, independent replication or shopping-list coverage is established.',
  };
}
