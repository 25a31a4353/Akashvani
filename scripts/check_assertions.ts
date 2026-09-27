import fs from "fs";
import zlib from "zlib";

function inspect() {
  const buf = fs.readFileSync("artifacts/reports/Andhra_Pradesh_State_Report.pdf");
  let pos = 0;
  const pageTexts: string[] = [];

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

  // Replace \x97 (em-dash in latin1) with "—"
  const normalized = pageTexts.map(t => t.replace(/\x97/g, "—")).join("\n");

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

  console.log("=== REQUIRED CHECKS ===");
  for (const r of requiredChecks) {
    console.log(r.padEnd(52), normalized.includes(r) ? "PASSED" : "FAILED");
  }

  console.log("\n=== FORBIDDEN CHECKS ===");
  for (const f of forbiddenChecks) {
    const found = normalized.includes(f);
    console.log(f.padEnd(52), found ? "FAILED (FOUND)" : "PASSED (ABSENT)");
    if (found) {
      const idx = normalized.indexOf(f);
      console.log(`   Snippet: "...${normalized.slice(Math.max(0, idx - 40), idx + f.length + 40).replace(/\n/g, " ")}..."`);
    }
  }
}

inspect();
