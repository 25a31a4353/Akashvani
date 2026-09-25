const locations = [
  { name: 'Dibrugarh, Assam', lat: 27.4728, lon: 94.9120, stateCode: 'AS' },
  { name: 'Wayanad, Kerala', lat: 11.6854, lon: 76.1320, stateCode: 'KL' },
  { name: 'Puri, Odisha', lat: 19.8135, lon: 85.8312, stateCode: 'OR' },
  { name: 'Jodhpur, Rajasthan', lat: 26.2389, lon: 73.0243, stateCode: 'RJ' },
  { name: 'Pune, Maharashtra', lat: 18.5204, lon: 73.8567, stateCode: 'MH' },
  { name: 'Bangalore, Karnataka', lat: 12.9716, lon: 77.5946, stateCode: 'KA' },
  { name: 'Ranchi, Jharkhand', lat: 23.3441, lon: 85.3096, stateCode: 'JH' },
  { name: 'Patna, Bihar', lat: 25.5941, lon: 85.1376, stateCode: 'BR' },
  { name: 'Aizawl, Mizoram', lat: 23.7271, lon: 92.7176, stateCode: 'MZ' },
  { name: 'Raipur, Chhattisgarh', lat: 21.2514, lon: 81.6296, stateCode: 'CH' },
  { name: 'Lucknow, Uttar Pradesh', lat: 26.8467, lon: 80.9462, stateCode: 'UP' },
  { name: 'Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2707, stateCode: 'TN' },
  { name: 'Visakhapatnam, Andhra Pradesh', lat: 17.6868, lon: 83.2185, stateCode: 'AP' },
];

function pointToLineDistanceKm(lat, lon, lineCoordinates) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;

  function haversine(lat1, lon1, lat2, lon2) {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function mercatorToLatLon(x, y) {
    const lon = (x / 20037508.34) * 180;
    let lat = (y / 20037508.34) * 180;
    lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
    return { lat, lon };
  }

  let minDistance = Infinity;
  for (const part of lineCoordinates) {
    for (const pt of part) {
      const { lat: pLat, lon: pLon } = mercatorToLatLon(pt[0], pt[1]);
      const d = haversine(lat, lon, pLat, pLon);
      if (d < minDistance) minDistance = d;
    }
  }
  return minDistance;
}

async function queryLocationGeology(loc) {
  const t0 = Date.now();
  console.log(`\n========================================`);
  console.log(`Testing location: ${loc.name} (${loc.lat}, ${loc.lon})`);

  // 1. GSI Geology 1:2M
  let geology = null;
  try {
    const gUrl = `https://livingatlas.esri.in/server1/rest/services/Geology/Geology/MapServer/0/query?geometry=${loc.lon},${loc.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
    const res = await fetch(gUrl, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      geology = data.features[0].attributes;
    }
  } catch (err) {
    console.error(`Geology query error: ${err.message}`);
  }

  // 2. Tectonics / Faults
  let nearestFault = null;
  try {
    const tUrl = `https://livingatlas.esri.in/server1/rest/services/Geology/Tectonics/FeatureServer/2/query?geometry=${loc.lon},${loc.lat}&geometryType=esriGeometryPoint&inSR=4326&distance=150&units=esriSRUnit_Kilometer&where=type%20IN%20(%27Fault%20Tectonic%27%2C%20%27Thrust%20Tectonic%27%2C%20%27Lineament%20Tectonic%27%2C%20%27Shear%20Zone%20Tectonic%27)&outFields=*&returnGeometry=true&f=json`;
    const res = await fetch(tUrl, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    let minD = Infinity;
    for (const feat of data.features || []) {
      const d = pointToLineDistanceKm(loc.lat, loc.lon, feat.geometry.paths);
      if (d < minD) {
        minD = d;
        nearestFault = {
          name: feat.attributes.name !== '<Null>' ? feat.attributes.name : null,
          code_desc: feat.attributes.code_desc,
          type: feat.attributes.type,
          distanceKm: Math.round(d * 10) / 10,
        };
      }
    }
  } catch (err) {
    console.error(`Tectonics query error: ${err.message}`);
  }

  // 3. Geomorphology 1:50,000 from Bhuvan
  let geomorphology = null;
  try {
    const delta = 0.04;
    const gmLayer = `geomorphology:${loc.stateCode}_GM50K_0506`;
    const wmsUrl = new URL('https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms');
    wmsUrl.searchParams.set('SERVICE', 'WMS');
    wmsUrl.searchParams.set('VERSION', '1.1.1');
    wmsUrl.searchParams.set('REQUEST', 'GetFeatureInfo');
    wmsUrl.searchParams.set('LAYERS', gmLayer);
    wmsUrl.searchParams.set('QUERY_LAYERS', gmLayer);
    wmsUrl.searchParams.set('STYLES', '');
    wmsUrl.searchParams.set('BBOX', `${loc.lon - delta},${loc.lat - delta},${loc.lon + delta},${loc.lat + delta}`);
    wmsUrl.searchParams.set('SRS', 'EPSG:4326');
    wmsUrl.searchParams.set('WIDTH', '101');
    wmsUrl.searchParams.set('HEIGHT', '101');
    wmsUrl.searchParams.set('X', '50');
    wmsUrl.searchParams.set('Y', '50');
    wmsUrl.searchParams.set('INFO_FORMAT', 'application/json');

    const res = await fetch(wmsUrl.toString(), { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      geomorphology = data.features[0].properties?.Des || null;
    }
  } catch (err) {
    // Some states might have slightly different layer suffix or timeout
  }

  console.log(`GSI Geology:`);
  console.log(`  Lithology / Rock Unit: ${geology?.index_ || 'N/A'}`);
  console.log(`  Geological Age: ${geology?.age || 'N/A'}`);
  console.log(`  Supergroup: ${geology?.supergroup?.trim() || 'N/A'}`);
  console.log(`  Stratigraphy: ${geology?.stratigraphy || 'N/A'}`);
  console.log(`  Source Scale: 1:2,000,000 (GSI Bhukosh Official)`);
  console.log(`GSI Tectonics / Fault:`);
  console.log(`  Nearest Feature: ${nearestFault ? `${nearestFault.type} - ${nearestFault.name || nearestFault.code_desc} (${nearestFault.distanceKm} km)` : 'None within 150 km'}`);
  console.log(`Geomorphology (1:50,000):`);
  console.log(`  Unit Description: ${geomorphology || 'N/A'}`);
  console.log(`Elapsed: ${Date.now() - t0}ms`);
}

async function testAll() {
  for (const loc of locations) {
    await queryLocationGeology(loc);
  }
}

testAll();
