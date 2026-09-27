import http from "http";
import fs from "fs";
import path from "path";

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/viewer") {
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.createReadStream("scripts/pdf_viewer.html").pipe(res);
  } else if (req.url === "/fresh_production_downloaded.pdf") {
    res.writeHead(200, { "Content-Type": "application/pdf" });
    fs.createReadStream("fresh_production_downloaded.pdf").pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4567, () => {
  console.log("PDF Viewer running on http://localhost:4567/viewer");
});
