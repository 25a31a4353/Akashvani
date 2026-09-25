import https from 'node:https';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

async function fetchBhuvan() {
  console.log('Fetching Bhuvan WMS GetCapabilities...');
  const start = Date.now();
  try {
    const res = await fetch('https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms?SERVICE=WMS&REQUEST=GetCapabilities', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    console.log(`Status: ${res.status}, content-type: ${res.headers.get('content-type')}`);
    const text = await res.text();
    console.log(`Received ${text.length} chars in ${Date.now() - start}ms`);
    
    // Find layers
    const layerNames = [...text.matchAll(/<Layer[^>]*>[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<Title>([^<]+)<\/Title>/g)]
      .map(m => ({ name: m[1], title: m[2] }));

    console.log(`Total layers found: ${layerNames.length}`);
    const geoLayers = layerNames.filter(l => /geom|lineament|geol|litho|landslide/i.test(l.name + ' ' + l.title));
    console.log('Geology/Geomorph/Lineament/Landslide layers:');
    console.log(JSON.stringify(geoLayers, null, 2));
  } catch (e) {
    console.error('Bhuvan fetch error:', e.message);
  }
}

fetchBhuvan();
