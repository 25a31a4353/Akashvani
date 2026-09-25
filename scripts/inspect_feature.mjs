async function inspectFeature() {
  const url = new URL('https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms');
  url.searchParams.set('SERVICE', 'WMS');
  url.searchParams.set('VERSION', '1.1.1');
  url.searchParams.set('REQUEST', 'GetFeatureInfo');
  url.searchParams.set('LAYERS', 'geomorphology:AS_GM50K_0506');
  url.searchParams.set('QUERY_LAYERS', 'geomorphology:AS_GM50K_0506');
  url.searchParams.set('STYLES', '');
  url.searchParams.set('BBOX', '94.8,27.4,95.0,27.5');
  url.searchParams.set('SRS', 'EPSG:4326');
  url.searchParams.set('WIDTH', '101');
  url.searchParams.set('HEIGHT', '101');
  url.searchParams.set('X', '50');
  url.searchParams.set('Y', '50');
  url.searchParams.set('INFO_FORMAT', 'application/json');

  const res = await fetch(url.toString());
  const json = await res.json();
  console.log('Feature count:', json.features?.length);
  if (json.features?.[0]) {
    console.log('Feature ID:', json.features[0].id);
    console.log('Feature properties:', JSON.stringify(json.features[0].properties, null, 2));
    console.log('Geometry type:', json.features[0].geometry?.type);
  }
}

inspectFeature();
