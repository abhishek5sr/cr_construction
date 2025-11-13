// Optional entry point for local testing
import { createServer } from 'http';
import { parse } from 'url';
import handler from './api/register.js'; // Example, adjust as needed

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  const { pathname } = parsedUrl;

  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.replace('/api', '');
    // Route to appropriate handler based on apiPath
    handler(req, res); // Simplify for now; use a router in production
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));