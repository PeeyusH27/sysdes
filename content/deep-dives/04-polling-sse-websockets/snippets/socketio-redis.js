// @display-only: needs socket.io, @socket.io/redis-adapter, redis, an `httpServer` and a `verifyToken` function
// Scaling Socket.IO across nodes: the Redis adapter relays room broadcasts between servers
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pub = createClient({ url: process.env.REDIS_URL }), sub = pub.duplicate();
await Promise.all([pub.connect(), sub.connect()]);
const io = new Server(httpServer, { adapter: createAdapter(pub, sub) });

io.use(async (socket, next) => {                                   // authenticate before accepting the socket
  try {
    socket.data.userId = await verifyToken(socket.handshake.auth.token);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', socket => {
  socket.join(`user:${socket.data.userId}`);                       // one room per user: all their devices join it
  socket.on('chat', msg => io.to(`user:${msg.to}`).emit('chat', msg));   // reaches the user on any node
});
