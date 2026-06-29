const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../plugins/db');
const { createToken, revokeToken } = require('../services/token');
const { authenticate } = require('../middleware/auth');

module.exports = async function authRoutes(fastify) {

  // POST /auth/register
  fastify.post('/auth/register', async (req, reply) => {
    const { name, email, password } = req.body || {};
    if (!email || !password) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'Email and password required' } });

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return reply.code(422).send({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name || email.split('@')[0], email, hash]
    );
    const userId = result.insertId;
    const token = await createToken(userId);
    const user = await queryOne('SELECT id, name, email, email_verified, plan FROM users WHERE id = ?', [userId]);

    return reply.code(201).send({ success: true, data: { token, user } });
  });

  // POST /auth/login
  fastify.post('/auth/login', async (req, reply) => {
    const { email, password } = req.body || {};
    if (!email || !password) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'Email and password required' } });

    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !user.password_hash) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });

    const token = await createToken(user.id);
    const { password_hash, ...safeUser } = user;

    return { success: true, data: { token, user: safeUser } };
  });

  // POST /auth/refresh
  fastify.post('/auth/refresh', { preHandler: authenticate }, async (req, reply) => {
    const oldToken = req.headers['authorization'].slice(7);
    await revokeToken(oldToken);
    const token = await createToken(req.user.id);
    const { password_hash, ...safeUser } = req.user;
    return { success: true, data: { token, user: safeUser } };
  });

  // GET /auth/me
  fastify.get('/auth/me', { preHandler: authenticate }, async (req) => {
    const { password_hash, ...safeUser } = req.user;
    return { success: true, data: { user: safeUser } };
  });

  // POST /auth/logout
  fastify.post('/auth/logout', { preHandler: authenticate }, async (req) => {
    const token = req.headers['authorization'].slice(7);
    await revokeToken(token);
    return { success: true };
  });

  // POST /auth/forgot-password
  fastify.post('/auth/forgot-password', async (req, reply) => {
    const { email } = req.body || {};
    if (!email) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'Email required' } });
    // Always return success to prevent email enumeration
    return { success: true, message: 'If this email exists, a reset link has been sent.' };
  });

  // POST /auth/resend-verification
  fastify.post('/auth/resend-verification', { preHandler: authenticate }, async (req) => {
    return { success: true };
  });

  // POST /auth/resend-verification-public
  fastify.post('/auth/resend-verification-public', async (req, reply) => {
    const { email } = req.body || {};
    if (!email) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'Email required' } });
    return { success: true };
  });

  // PATCH /auth/unverified/email
  fastify.patch('/auth/unverified/email', async (req, reply) => {
    const { email, password, new_email } = req.body || {};
    if (!email || !password || !new_email) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'Missing fields' } });
    const user = await queryOne('SELECT * FROM users WHERE email = ? AND email_verified = 0', [email]);
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
    await query('UPDATE users SET email = ? WHERE id = ?', [new_email, user.id]);
    return { success: true };
  });

  // DELETE /auth/unverified/account
  fastify.delete('/auth/unverified/account', async (req, reply) => {
    const { email, password } = req.body || {};
    const user = await queryOne('SELECT * FROM users WHERE email = ? AND email_verified = 0', [email]);
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
    await query('DELETE FROM users WHERE id = ?', [user.id]);
    return { success: true };
  });

  // POST /enroll — device enrollment for HMAC signing
  fastify.post('/enroll', async (req, reply) => {
    const { device_fingerprint, ext_version } = req.body || {};
    const extension_id = req.headers['x-extension-id'] || null;

    // Reuse existing valid enrollment for same device fingerprint
    if (device_fingerprint) {
      const existing = await queryOne(
        'SELECT client_id, secret, expires_at FROM device_enrollments WHERE device_fingerprint = ? AND expires_at > NOW() LIMIT 1',
        [device_fingerprint]
      );
      if (existing) {
        return { success: true, data: {
          client_id: existing.client_id,
          secret: existing.secret,
          expires_at: existing.expires_at,
        }};
      }
    }

    const client_id = uuidv4();
    const secret = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      'INSERT INTO device_enrollments (client_id, secret, device_fingerprint, ext_version, extension_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [client_id, secret, device_fingerprint || null, ext_version || null, extension_id, expires_at]
    );

    return reply.code(201).send({ success: true, data: { client_id, secret, expires_at } });
  });

  // GET /auth/google/url?source=web|extension
  fastify.get('/auth/google/url', async (req) => {
    const source = req.query.source === 'web' ? 'web' : 'extension';
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: source,
    });
    return { success: true, data: { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` } };
  });

  // GET /auth/google/callback (server-side OAuth callback)
  fastify.get('/auth/google/callback', async (req, reply) => {
    const { code, error, state } = req.query;
    const isWeb = state === 'web';
    const errorUrl = isWeb
      ? `${process.env.WEBSITE_URL || process.env.FRONTEND_URL}/login?error=auth_failed`
      : `${process.env.FRONTEND_URL}/auth/error`;

    if (error || !code) {
      return reply.redirect(errorUrl);
    }
    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) throw new Error('No access token');

      // Get user info
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = await infoRes.json();

      // Find or create user
      let user = await queryOne('SELECT * FROM users WHERE google_id = ?', [googleUser.id]);
      if (!user) user = await queryOne('SELECT * FROM users WHERE email = ?', [googleUser.email]);

      if (user) {
        if (!user.google_id) await query('UPDATE users SET google_id = ?, email_verified = 1 WHERE id = ?', [googleUser.id, user.id]);
      } else {
        const result = await query(
          'INSERT INTO users (name, email, google_id, email_verified) VALUES (?, ?, ?, 1)',
          [googleUser.name, googleUser.email, googleUser.id]
        );
        user = await queryOne('SELECT * FROM users WHERE id = ?', [result.insertId]);
      }

      const token = await createToken(user.id);
      if (isWeb) {
        const websiteUrl = process.env.WEBSITE_URL || process.env.FRONTEND_URL;
        return reply.redirect(`${websiteUrl}/auth/success?token=${token}`);
      }
      return reply.redirect(`${process.env.APP_URL}/auth/google/success?token=${token}`);
    } catch {
      return reply.redirect(errorUrl);
    }
  });

  // GET /auth/google/success — bridge page for both web and extension flows
  fastify.get('/auth/google/success', async (req, reply) => {
    const { token } = req.query;
    const websiteUrl = process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://kudo-flow.vercel.app';
    reply.type('text/html').send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>KudoSkill — Đang xử lý...</title>
<style>body{background:#111;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#e8e8ea;}</style>
</head><body>
<div style="text-align:center;">
  <div style="width:36px;height:36px;border:3px solid #2e2e33;border-top-color:#ccff00;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px;"></div>
  <p style="color:#71717a;font-size:14px;">Đang đăng nhập...</p>
</div>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
<script>
  // Extension content script (oauth-bridge.js) also runs here and captures the token
  // Then redirect to website
  if (${JSON.stringify(!!token)}) {
    setTimeout(function() {
      window.location.href = ${JSON.stringify(websiteUrl)} + '/auth/success?token=' + ${JSON.stringify(token || '')};
    }, 300);
  } else {
    window.location.href = ${JSON.stringify(websiteUrl)} + '/login?error=auth_failed';
  }
</script>
</body></html>`);
  });

  // GET /auth/google/link-url
  fastify.get('/auth/google/link-url', { preHandler: authenticate }, async () => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'openid email profile',
    });
    return { success: true, data: { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` } };
  });

  // POST /auth/google/unlink
  fastify.post('/auth/google/unlink', { preHandler: authenticate }, async (req) => {
    await query('UPDATE users SET google_id = NULL WHERE id = ?', [req.user.id]);
    return { success: true };
  });
};
