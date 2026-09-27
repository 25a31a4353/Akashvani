import fs from "fs";
import zlib from "zlib";
import superjson from "superjson";

async function verifyProductionDeployment() {
  console.log("Checking Railway production endpoint...");
  
  const apLocation = {
    id: "andhra-pradesh",
    name: "Andhra Pradesh",
    displayName: "Andhra Pradesh, India",
    latitude: 15.9129,
    longitude: 79.7400,
    category: "State",
    source: "Census / Administrative GIS",
    population: null,
    populationSource: "Census of India (Office of Registrar General)",
    boundingBox: [12.62, 77.72, 19.92, 84.80],
    boundary: null,
    address: { state: "Andhra Pradesh" }
  };

  const serialized = superjson.serialize(apLocation);
  const contextRes = await fetch("https://akashvani-production.up.railway.app/api/trpc/diva.india.context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serialized)
  });

  if (!contextRes.ok) {
    console.log("Context fetch failed with status:", contextRes.status);
    return false;
  }

  const contextData = await contextRes.json();
  const ctx = superjson.deserialize(contextData.result.data);
  console.log("Context fetched for:", ctx.location.name, "Decision ID:", ctx.decision?.decisionId);
  console.log("Confidence:", JSON.stringify(ctx.decision?.confidence));

  console.log("Requesting report generation on Railway production...");
  const reportRes = await fetch("https://akashvani-production.up.railway.app/api/trpc/diva.generateSelectedLocationReport", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(superjson.serialize(ctx))
  });

  if (!reportRes.ok) {
    console.log("Report generation failed with status:", reportRes.status);
    return false;
  }

  const reportData = await reportRes.json();
  const reportInfo = reportData.result.data.json;
  console.log("Report generated on Railway:", reportInfo.id, reportInfo.url);

  const pdfUrl = `https://akashvani-production.up.railway.app${reportInfo.url}`;
  console.log("Downloading PDF from:", pdfUrl);
  const pdfRes = await fetch(pdfUrl);
  if (!pdfRes.ok) {
    console.log("Failed to download PDF:", pdfRes.status);
    return false;
  }

  const buf = Buffer.from(await pdfRes.arrayBuffer());
  fs.writeFileSync("fresh_production_downloaded.pdf", buf);
  console.log("Downloaded fresh production PDF, size:", buf.length);

  // Decompress and check text
  let pos = 0;
  const pageTexts = [];
  while ((pos = buf.indexOf("stream", pos)) !== -1) {
    const streamStart = pos + 6;
    const streamEnd = buf.indexOf("endstream", streamStart);
    if (streamEnd !== -1) {
      let raw = buf.subarray(streamStart, streamEnd);
      if (raw[0] === 13 && raw[1] === 10) raw = raw.subarray(2);
      else if (raw[0] === 10 || raw[0] === 13) raw = raw.subarray(1);
      try {
        const decompressed = zlib.inflateSync(raw).toString("latin1");
        if (decompressed.includes("TJ") || decompressed.includes("Tj")) {
          const hexRegex = /<([0-9a-fA-F]+)>/g;
          let match;
          let streamText = "";
          while ((match = hexRegex.exec(decompressed)) !== null) {
            const hex = match[1];
            let str = "";
            for (let i = 0; i < hex.length; i += 2) {
              str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            streamText += str;
          }
          pageTexts.push(streamText);
        }
      } catch (e) {}
      pos = streamEnd + 9;
    } else break;
  }

  const normalized = pageTexts.map(t => t.replace(/\x97/g, "—")).join("\n");
  const isV32 = normalized.includes("RESQ REPORT ENGINE V3.2");
  console.log("\n>>> Is V3.2 Present in Production PDF? ->", isV32 ? "YES! (DEPLOYED)" : "NO (STILL PREVIOUS DEPLOYMENT)");

  const requiredChecks = [
    "RESQ REPORT ENGINE V3.2",
    "Report Schema Version: 3.2",
    "Report Generator: selectedLocationReport.ts",
    "STATE-LEVEL SCREENING",
    "State-level screening reference centroid",
    "NOT SCORED — DATA UNAVAILABLE",
    "NOT SCORED — ROUTE UNAVAILABLE",
    "ROAD ROUTING UNAVAILABLE",
    "CANDIDATE DESTINATION (SAFETY UNKNOWN / UNSCREENED)"
  ];

  const forbiddenChecks = [
    "VERIFIED SAFE HAVEN",
    "EXACT GEOGRAPHICAL COORDINATES & BOUNDS",
    "Verified turn-by-turn road evacuation routes",
    "0/20",
    "0/15",
    "~30 min"
  ];

  console.log("\n=== PRODUCTION PDF REQUIRED ASSERTIONS ===");
  let allPass = true;
  for (const r of requiredChecks) {
    const ok = normalized.includes(r);
    console.log(r.padEnd(52), ok ? "PASSED" : "FAILED");
    if (!ok) allPass = false;
  }

  console.log("\n=== PRODUCTION PDF FORBIDDEN ASSERTIONS ===");
  for (const f of forbiddenChecks) {
    const found = normalized.includes(f);
    console.log(f.padEnd(52), found ? "FAILED (FOUND)" : "PASSED (ABSENT)");
    if (found) allPass = false;
  }

  return isV32 && allPass;
}

verifyProductionDeployment().then(ok => {
  console.log("\nOVERALL DEPLOYMENT STATUS:", ok ? "VERIFIED PRODUCTION SUCCESS" : "PENDING DEPLOYMENT UPDATE");
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
