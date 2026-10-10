// @display-only: needs an Express app (`app`) with auth, and AWS credentials
// Object storage (S3): the server only signs a short-lived URL; the file itself never passes through it
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const s3 = new S3Client({});
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

app.post('/api/uploads', async (req, res) => {
  if (!ALLOWED.has(req.body.type)) return res.status(415).end();
  const key = `u/${req.user.id}/${crypto.randomUUID()}`;            // the server picks the key, never the client
  const url = await getSignedUrl(s3,
    new PutObjectCommand({ Bucket: process.env.BUCKET, Key: key, ContentType: req.body.type }),
    { expiresIn: 300 });                                               // valid for 5 minutes
  res.json({ url, key });                                              // the client PUTs the file to url
});
