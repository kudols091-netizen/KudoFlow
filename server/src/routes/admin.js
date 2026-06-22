const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../plugins/db');
const { createToken } = require('../services/token');

function adminGuard(req, reply) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid admin secret' } });
  }
}

module.exports = async function adminRoutes(fastify) {

  // POST /admin/set-plan — nâng/hạ plan của user theo email
  fastify.post('/admin/set-plan', { preHandler: adminGuard }, async (req, reply) => {
    const { email, plan } = req.body || {};
    if (!email || !plan) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'email and plan required' } });
    }
    const validPlans = ['free', 'trial', 'pro', 'lifetime'];
    if (!validPlans.includes(plan)) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: `plan must be one of: ${validPlans.join(', ')}` } });
    }

    const user = await queryOne('SELECT id, email, plan FROM users WHERE email = ?', [email]);
    if (!user) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const expires_at = plan === 'lifetime' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await query('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?', [plan, expires_at, user.id]);

    const updated = await queryOne('SELECT id, email, name, plan, plan_expires_at FROM users WHERE id = ?', [user.id]);
    return { success: true, data: { user: updated } };
  });

  // POST /admin/create-user — tạo user mới với plan tùy chọn
  fastify.post('/admin/create-user', { preHandler: adminGuard }, async (req, reply) => {
    const { name, email, password, plan = 'lifetime' } = req.body || {};
    if (!email || !password) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'email and password required' } });
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return reply.code(422).send({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } });
    }

    const hash = await bcrypt.hash(password, 10);
    const expires_at = plan === 'lifetime' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const result = await query(
      'INSERT INTO users (name, email, password_hash, email_verified, plan, plan_expires_at) VALUES (?, ?, ?, 1, ?, ?)',
      [name || email.split('@')[0], email, hash, plan, expires_at]
    );

    const user = await queryOne('SELECT id, email, name, plan, plan_expires_at FROM users WHERE id = ?', [result.insertId]);
    const token = await createToken(result.insertId);
    return reply.code(201).send({ success: true, data: { user, token } });
  });

  // GET /admin/users — liệt kê users
  fastify.get('/admin/users', { preHandler: adminGuard }, async (req) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const users = await query(
      'SELECT id, name, email, plan, plan_expires_at, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return { success: true, data: { users } };
  });
};
