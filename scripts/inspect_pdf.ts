import fs from "fs";
import zlib from "zlib";

function inspectPdf(filename: string) {
  const buf = fs.readFileSync(filename);
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

  console.log(`Total text streams in ${filename}: ${pageTexts.length}`);
  pageTexts.forEach((txt, idx) => {
    console.log(`\n--- PAGE STREAM ${idx + 1} (${txt.length} chars) ---`);
    console.log(txt.slice(0, 400));
  });

  const fullText = pageTexts.join("\n");
  console.log("\n================ KEYWORD SEARCH ================");
  const testTerms = [
    "RESQ REPORT ENGINE V3.2",
    "Report Schema Version: 3.2",
    "selectedLocationReport.ts",
    "STATE-LEVEL SCREENING",
    "State-level screening reference centroid",
    "Administrative bounds: UNAVAILABLE",
    "NOT SCORED — DATA UNAVAILABLE",
    "NOT SCORED — ROUTE UNAVAILABLE",
    "ROAD ROUTING UNAVAILABLE",
    "CANDIDATE DESTINATION (SAFETY UNKNOWN / UNSCREENED)",
    "VERIFIED SAFE HAVEN",
    "EXACT GEOGRAPHICAL COORDINATES & BOUNDS",
    "Verified turn-by-turn road evacuation routes",
    "HIGH",
    "MEDIUM",
    "LOW"
  ];
  for (const t of testTerms) {
    console.log(t.padEnd(50), fullText.includes(t) ? "YES" : "NO");
  }
}

inspectPdf("artifacts/reports/Andhra_Pradesh_State_Report.pdf");
