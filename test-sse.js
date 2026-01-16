import https from 'https';

console.log('Connecting to SSE...');

let chunks = 0;
const req = https.get('https://taxpilot-e9ewftfzehcvdmbf.centralus-01.azurewebsites.net/sse', {
  headers: { 'Accept': 'text/event-stream' }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  
  let chunks = 0;
  res.on('data', (chunk) => {
    console.log('---CHUNK', ++chunks, '---');
    console.log(chunk.toString());
    if (chunks >= 4) {
      console.log('Received 4 chunks, closing...');
      req.destroy();
      process.exit(0);
    }
  });
  
  res.on('end', () => {
    console.log('Connection ended');
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('Test timeout, received', chunks || 0, 'chunks');
  process.exit(0);
}, 30000);
