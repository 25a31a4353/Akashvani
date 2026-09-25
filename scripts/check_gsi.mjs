async function checkGsi() {
  const res = await fetch('https://gsi.gov.in/');
  const html = await res.text();
  const matches = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  console.log('All hrefs found on gsi.gov.in:');
  const relevant = matches.filter(h => /bhukosh|ngdr|geodata|map|gis|portal/i.test(h));
  console.log(relevant);

  // Also check script src
  const scripts = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  console.log('Scripts:', scripts.slice(0, 5));
}
checkGsi();
