function pointToLineDistanceKm(lat, lon, lineCoordinates) {
  // lineCoordinates is array of [x, y] in web mercator (EPSG:3857) or EPSG:4326
  // Let's project point to 3857 or calculate haversine
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // Earth radius in km

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

async function run() {
  const lat = 27.4728;
  const lon = 94.9120;
  const res = await fetch(`https://livingatlas.esri.in/server1/rest/services/Geology/Tectonics/FeatureServer/2/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&distance=100&units=esriSRUnit_Kilometer&where=type%20IN%20(%27Fault%20Tectonic%27%2C%20%27Thrust%20Tectonic%27%2C%20%27Lineament%20Tectonic%27%2C%20%27Shear%20Zone%20Tectonic%27)&outFields=*&returnGeometry=true&f=json`);
  const data = await res.json();
  let nearest = null;
  let minD = Infinity;

  for (const feat of data.features || []) {
    const d = pointToLineDistanceKm(lat, lon, feat.geometry.paths);
    if (d < minD) {
      minD = d;
      nearest = { ...feat.attributes, distanceKm: Math.round(d * 10) / 10 };
    }
  }

  console.log(`Nearest fault/structural feature to Dibrugarh (${lat}, ${lon}):`);
  console.log(JSON.stringify(nearest, null, 2));
}

run();
