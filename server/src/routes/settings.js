const { query, queryOne } = require('../plugins/db');
const { authenticate } = require('../middleware/auth');

module.exports = async function settingsRoutes(fastify) {

  // GET /settings
  fastify.get('/settings', { preHandler: authenticate }, async (req) => {
    const row = await queryOne('SELECT settings_json FROM user_settings WHERE user_id = ?', [req.user.id]);
    return {
      success: true,
      data: { settings_json: JSON.parse(row?.settings_json || '{}') }
    };
  });

  // PUT /settings
  fastify.put('/settings', { preHandler: authenticate }, async (req) => {
    const { settings_json } = req.body || {};
    const json = typeof settings_json === 'string' ? settings_json : JSON.stringify(settings_json || {});
    await query(
      `INSERT INTO user_settings (user_id, settings_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)`,
      [req.user.id, json]
    );
    return { success: true };
  });
};
