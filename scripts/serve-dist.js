const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PORT = 5180;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.map': 'application/json'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${urlPath}`);

  if (urlPath === '/' || urlPath === '') urlPath = '/queue.html';

  const filePath = path.join(DIST, urlPath);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('  -> 404 Not Found:', filePath);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + urlPath);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  冷链月台调度 - 生产模式验证服务器');
  console.log('========================================');
  console.log(`  到车队列: http://localhost:${PORT}/queue.html`);
  console.log(`  车辆详情: http://localhost:${PORT}/detail.html`);
  console.log(`  收货记录: http://localhost:${PORT}/record.html`);
  console.log(`  今日处置: http://localhost:${PORT}/history.html`);
  console.log(`  根路径重定向: http://localhost:${PORT}/`);
  console.log('========================================\n');
});
