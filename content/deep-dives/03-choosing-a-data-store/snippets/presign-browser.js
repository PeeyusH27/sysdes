// @display-only: runs in the browser; needs the /api/uploads and /api/photos endpoints
// Browser side of a presigned upload: the file goes straight to S3, never through your servers
const { url, key } = await fetch('/api/uploads', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: file.type }),
}).then(r => r.json());
await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });   // must match the signed type
await fetch('/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
