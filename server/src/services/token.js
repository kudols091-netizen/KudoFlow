const crypto = require('crypto');
const { query, queryOne } = require('../plugins/db');

function generateToken() {
  return crypto.randomBytes(64).toString('hex');
}

async function createToken(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await query(
    'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
  return token;
}

async function revokeToken(token) {
  await query('DELETE FROM auth_tokens WHERE token = ?', [token]);
}

async function revokeAllUserTokens(userId) {
  await query('DELETE FROM auth_tokens WHERE user_id = ?', [userId]);
}

module.exports = { createToken, revokeToken, revokeAllUserTokens };
