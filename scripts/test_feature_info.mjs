async function testGetFeatureInfo() {
  // Dibrugarh coords: 27.4728, 94.9120
  // Bounding box around Dibrugarh: minx=94.8, miny=27.4, maxx=95.0, maxy=27.5
  // Point in 101x101 image: x=50, y=50
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

  console.log('Testing GetFeatureInfo with application/json...');
  try {
    const res = await fetch(url.toString());
    console.log('Status (json):', res.status);
    const body = await res.text();
    console.log('Response body:', body.slice(0, 500));
  } catch (e) {
    console.error('Error json:', e.message);
  }

  // Also test text/html and text/xml
  url.searchParams.set('INFO_FORMAT', 'text/html');
  try {
    const res = await fetch(url.toString());
    console.log('Status (html):', res.status);
    const body = await res.text();
    console.log('Response body (html):', body.slice(0, 500));
  } catch (e) {
    console.error('Error html:', e.message);
  }
}

testGetFeatureInfo();
