const { queryOne } = require('../plugins/db');

async function authenticate(request, reply) {
  const header = request.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  }
  const token = header.slice(7);
  const row = await queryOne(
    `SELECT u.* FROM auth_tokens t JOIN users u ON t.user_id = u.id
     WHERE t.token = ? AND t.expires_at > NOW() LIMIT 1`,
    [token]
  );
  if (!row) {
    return reply.code(401).send({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired token' } });
  }
  request.user = row;
}

async function optionalAuth(request) {
  const header = request.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return;
  const token = header.slice(7);
  const row = await queryOne(
    `SELECT u.* FROM auth_tokens t JOIN users u ON t.user_id = u.id
     WHERE t.token = ? AND t.expires_at > NOW() LIMIT 1`,
    [token]
  );
  if (row) request.user = row;
}

module.exports = { authenticate, optionalAuth };
