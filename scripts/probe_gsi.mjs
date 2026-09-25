import https from 'node:https';
import http from 'node:http';

const agent = new https.Agent({
  rejectUnauthorized: false, // In case GSI uses NIC/Gov intermediate CA that Node doesn't bundle
  timeout: 10000,
});

const candidates = [
  'https://bhukosh.gsi.gov.in/arcgis/rest/services?f=pjson',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services?f=json',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services',
  'https://bhukosh.gsi.gov.in/arcgis/services',
  'https://bhukosh.gsi.gov.in/',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services/Geology_50K/MapServer?f=pjson',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services/Geology_2M/MapServer?f=pjson',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services/Geology/MapServer?f=pjson',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services/Thematic/MapServer?f=pjson',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services/Geomorphology_250K/MapServer?f=pjson',
  'https://bhukosh.gsi.gov.in/arcgis/rest/services/Lineament_250K/MapServer?f=pjson',
  'https://bhukosh.gsi.gov.in/arcgis/services/Geology_50K/MapServer/WMSServer?request=GetCapabilities&service=WMS',
  'https://ngdr.gsi.gov.in/',
  'https://ngdr.gsi.gov.in/arcgis/rest/services?f=pjson',
];

async function probe(url) {
  const start = Date.now();
  console.log(`\n--- Probing: ${url} ---`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://bhukosh.gsi.gov.in/',
      },
      // Node 18+ fetch agent option
      // @ts-ignore
      dispatcher: undefined,
    });
    clearTimeout(timeoutId);

    const elapsed = Date.now() - start;
    console.log(`Status: ${res.status} ${res.statusText} (${elapsed}ms)`);
    console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log(`Body preview (first 400 chars):`, text.slice(0, 400));
    return { url, status: res.status, ok: res.ok, text };
  } catch (err) {
    console.error(`Error probing ${url}: ${err.message}`);
    return { url, error: err.message };
  }
}

async function run() {
  for (const url of candidates) {
    await probe(url);
  }
}

run();
