import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';
import { verifySignedPayload } from './utils/crypto';
import { SESSION_COOKIE_NAME, type SessionPayload } from './middleware/auth';
import { logger } from './utils/logger';

let io: SocketIOServer | null = null;

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const allowedOrigin = env.CLIENT_URL.replace(/\/+$/, '');
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const rawSession = cookies[SESSION_COOKIE_NAME];
    if (!rawSession) {
      next(new Error('Unauthorized'));
      return;
    }
    const session = verifySignedPayload<SessionPayload>(rawSession);
    if (!session || session.exp < Date.now()) {
      next(new Error('Invalid session'));
      return;
    }
    socket.data.userId = session.userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    logger.debug({ userId, socketId: socket.id }, 'Socket client connected');
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}