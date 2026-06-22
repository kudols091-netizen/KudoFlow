const crypto = require('crypto');
const { query, queryOne } = require('../plugins/db');
const { authenticate } = require('../middleware/auth');

// In-memory SSE clients: Map<userId, Set<reply>>
const sseClients = new Map();

function broadcastToUser(userId, event, data) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const reply of clients) {
    try { reply.raw.write(msg); } catch {}
  }
}

function broadcastAll(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const clients of sseClients.values()) {
    for (const reply of clients) {
      try { reply.raw.write(msg); } catch {}
    }
  }
}

module.exports = async function sseRoutes(fastify) {

  // POST /sse/ticket
  fastify.post('/sse/ticket', { preHandler: authenticate }, async (req, reply) => {
    if (req.user.plan === 'free') {
      return { success: true, data: `POLLING_REQUIRED:30` };
    }
    const ticket = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute to use
    await query(
      'INSERT INTO sse_sessions (user_id, ticket, expires_at) VALUES (?, ?, ?)',
      [req.user.id, ticket, expiresAt]
    );
    return { success: true, data: { ticket } };
  });

  // GET /sse/stream?ticket=...
  fastify.get('/sse/stream', async (req, reply) => {
    const { ticket } = req.query;
    if (!ticket) return reply.code(400).send({ success: false, error: { code: 'MISSING_TICKET' } });

    const session = await queryOne(
      'SELECT * FROM sse_sessions WHERE ticket = ? AND used = 0 AND expires_at > NOW()',
      [ticket]
    );
    if (!session) return reply.code(403).send({ success: false, error: { code: 'INVALID_TICKET' } });

    await query('UPDATE sse_sessions SET used = 1 WHERE id = ?', [session.id]);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(`event: connected\ndata: {"status":"ok"}\n\n`);

    const userId = session.user_id;
    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    sseClients.get(userId).add(reply);

    // Heartbeat every 25s
    const heartbeat = setInterval(() => {
      try { reply.raw.write(`: heartbeat\n\n`); } catch { clearInterval(heartbeat); }
    }, 25000);

    req.socket.on('close', () => {
      clearInterval(heartbeat);
      sseClients.get(userId)?.delete(reply);
      if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
    });

    // Keep connection open
    await new Promise(() => {});
  });

  // POST /sse/end-session
  fastify.post('/sse/end-session', { preHandler: authenticate }, async (req) => {
    const clients = sseClients.get(req.user.id);
    if (clients) {
      for (const r of clients) { try { r.raw.end(); } catch {} }
      sseClients.delete(req.user.id);
    }
    return { success: true };
  });

  // GET /events/poll — fallback polling for free users
  fastify.get('/events/poll', { preHandler: authenticate }, async (req) => {
    // Return empty events for now (can extend with event log table later)
    return { success: true, data: { events: [], last_event_id: req.query.since || 0 } };
  });

  // Expose broadcast for admin use
  fastify.decorate('ssebroadcast', { broadcastToUser, broadcastAll });
};

module.exports.broadcastToUser = broadcastToUser;
module.exports.broadcastAll = broadcastAll;
