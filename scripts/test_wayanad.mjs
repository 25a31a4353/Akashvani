async function testWayanad() {
  const lat = 11.6854;
  const lon = 76.1320;
  const delta = 0.05;

  const url = new URL('https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms');
  url.searchParams.set('SERVICE', 'WMS');
  url.searchParams.set('VERSION', '1.1.1');
  url.searchParams.set('REQUEST', 'GetFeatureInfo');
  url.searchParams.set('LAYERS', 'geomorphology:KL_GM50K_0506');
  url.searchParams.set('QUERY_LAYERS', 'geomorphology:KL_GM50K_0506');
  url.searchParams.set('STYLES', '');
  url.searchParams.set('BBOX', `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`);
  url.searchParams.set('SRS', 'EPSG:4326');
  url.searchParams.set('WIDTH', '101');
  url.searchParams.set('HEIGHT', '101');
  url.searchParams.set('X', '50');
  url.searchParams.set('Y', '50');
  url.searchParams.set('INFO_FORMAT', 'application/json');

  const res = await fetch(url.toString());
  const json = await res.json();
  console.log('Wayanad geomorphology feature:');
  console.log(JSON.stringify(json.features?.[0]?.properties, null, 2));
}

testWayanad();
