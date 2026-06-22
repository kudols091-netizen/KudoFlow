const crypto = require('crypto');
const https = require('https');
const { query, queryOne } = require('../plugins/db');
const { authenticate } = require('../middleware/auth');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || process.env.BOT_USERNAME;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'kudotoolai-webhook-secret';
const BASE_URL = process.env.BASE_URL || '';

function generateOtp() {
  return 'KUDO-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function saveOtp(code, userId) {
  await query('DELETE FROM telegram_otp WHERE user_id = ?', [userId]);
  await query(
    'INSERT INTO telegram_otp (code, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))',
    [code, userId]
  );
}

async function consumeOtp(code) {
  const row = await queryOne(
    'SELECT user_id FROM telegram_otp WHERE code = ? AND expires_at > NOW()',
    [code]
  );
  if (!row) return null;
  await query('DELETE FROM telegram_otp WHERE code = ?', [code]);
  return row.user_id;
}

async function cancelOtp(userId) {
  await query('DELETE FROM telegram_otp WHERE user_id = ?', [userId]);
}

function callTelegramApi(method, params) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(params);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ ok: false }); } });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

function sendMessage(chatId, text) {
  if (!BOT_TOKEN) return Promise.resolve();
  return new Promise((resolve) => {
    const payload = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => { res.resume(); res.on('end', resolve); });
    req.on('error', (e) => { console.error('[Telegram] sendMessage failed:', e.message); resolve(); });
    req.write(payload);
    req.end();
  });
}

module.exports = async function telegramRoutes(fastify) {

  // GET /telegram/link/status
  fastify.get('/telegram/link/status', { preHandler: authenticate }, async (req) => {
    const row = await queryOne('SELECT * FROM telegram_links WHERE user_id = ?', [req.user.id]);
    if (!row) {
      return { success: true, data: { linked: false }, bot_username: BOT_USERNAME || null };
    }
    return {
      success: true,
      data: {
        linked: true,
        telegram_username: row.telegram_username,
        bot_type: row.bot_type || 'shared',
        bot_username: BOT_USERNAME || null,
      }
    };
  });

  // POST /telegram/link/generate — tạo OTP code
  fastify.post('/telegram/link/generate', { preHandler: authenticate }, async (req) => {
    const code = generateOtp();
    await saveOtp(code, req.user.id);

    const botUrl = BOT_USERNAME
      ? `https://t.me/${BOT_USERNAME}?start=${code}`
      : null;

    return {
      success: true,
      data: {
        code,
        expires_in: 300,
        bot_url: botUrl,
        bot_username: BOT_USERNAME || null,
      }
    };
  });

  // POST /telegram/link/cancel — hủy OTP đang chờ
  fastify.post('/telegram/link/cancel', { preHandler: authenticate }, async (req) => {
    await cancelOtp(req.user.id);
    return { success: true };
  });

  // DELETE /telegram/link — hủy liên kết
  fastify.delete('/telegram/link', { preHandler: authenticate }, async (req) => {
    await query('DELETE FROM telegram_links WHERE user_id = ?', [req.user.id]);
    return { success: true };
  });

  // GET /telegram/quota
  fastify.get('/telegram/quota', { preHandler: authenticate }, async (req) => {
    const row = await queryOne(
      'SELECT hourly_used, daily_used FROM telegram_quota WHERE user_id = ? AND date = CURDATE()',
      [req.user.id]
    );
    const plan = req.user.plan || 'free';
    const limits = plan === 'pro' || plan === 'lifetime'
      ? { hourly: -1, daily: -1 }
      : plan === 'trial'
      ? { hourly: 20, daily: 100 }
      : { hourly: 10, daily: 50 };

    return {
      success: true,
      data: {
        hourly: { used: row?.hourly_used || 0, limit: limits.hourly },
        daily: { used: row?.daily_used || 0, limit: limits.daily },
      }
    };
  });

  // POST /telegram/webhook — Telegram gửi updates về đây (chỉ hoạt động khi có BOT_TOKEN)
  fastify.post('/telegram/webhook', async (req, reply) => {
    if (!BOT_TOKEN) return reply.code(403).send({ ok: false, error: 'Bot not configured' });

    // Verify secret header
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== WEBHOOK_SECRET) return reply.code(403).send({ ok: false, error: 'Invalid secret' });

    const message = req.body?.message;
    if (!message) return { ok: true };

    const chatId = message.chat?.id;
    const text = (message.text || '').trim();
    const tgUsername = message.from?.username
      ? '@' + message.from.username
      : message.from?.first_name || 'Telegram User';

    // /start KUDO-XXXXXX hoặc gõ thẳng code
    const rawCode = text.startsWith('/start ') ? text.slice(7).trim() : text;

    const userId = await consumeOtp(rawCode);

    if (userId) {
      // Xóa link cũ nếu chat_id này đã dùng
      await query('DELETE FROM telegram_links WHERE telegram_chat_id = ?', [String(chatId)]);

      // Lưu link mới
      await query(
        `INSERT INTO telegram_links (user_id, telegram_chat_id, telegram_username, bot_type)
         VALUES (?, ?, ?, 'shared')
         ON DUPLICATE KEY UPDATE
           telegram_chat_id = VALUES(telegram_chat_id),
           telegram_username = VALUES(telegram_username),
           bot_type = 'shared'`,
        [userId, String(chatId), tgUsername]
      );

      await sendMessage(chatId,
        `✅ <b>Liên kết thành công!</b>\n\nTài khoản KudoToolAI đã được kết nối với ${tgUsername}.\n\nGửi /help để xem các lệnh khả dụng.`
      );

    } else if (rawCode.startsWith('KUDO-')) {
      await sendMessage(chatId,
        `❌ Mã không hợp lệ hoặc đã hết hạn.\n\nVui lòng mở Settings → Telegram trong extension và tạo mã mới.`
      );

    } else if (text === '/start') {
      await sendMessage(chatId,
        `👋 Xin chào! Đây là <b>KudoToolAI Bot</b>.\n\nĐể liên kết tài khoản:\n1. Mở extension KudoToolAI\n2. Vào <b>Cài đặt → Telegram</b>\n3. Bấm <b>Liên kết Telegram</b>\n4. Gửi mã OTP nhận được về đây.`
      );

    } else if (text === '/help') {
      await sendMessage(chatId,
        `📋 <b>Các lệnh khả dụng:</b>\n\n/start — Hướng dẫn liên kết\n/status — Kiểm tra trạng thái\n/help — Danh sách lệnh`
      );

    } else if (text === '/status') {
      const link = await queryOne('SELECT * FROM telegram_links WHERE telegram_chat_id = ?', [String(chatId)]);
      if (link) {
        await sendMessage(chatId, `✅ Tài khoản đã được liên kết.`);
      } else {
        await sendMessage(chatId, `❌ Chưa liên kết. Gửi /start để xem hướng dẫn.`);
      }
    }

    return { ok: true };
  });

  // GET /telegram/webhook-info — xem trạng thái webhook hiện tại
  fastify.get('/telegram/webhook-info', { preHandler: authenticate }, async (req, reply) => {
    if (!BOT_TOKEN) return reply.code(403).send({ ok: false, error: 'Bot not configured' });
    const info = await callTelegramApi('getWebhookInfo', {});
    return info;
  });

  // GET /telegram/webhook-setup?key=ADMIN_SECRET — đăng ký webhook, gọi từ trình duyệt
  fastify.get('/telegram/webhook-setup', async (req, reply) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || req.query.key !== adminSecret) {
      return reply.code(403).send({ ok: false, error: 'Forbidden' });
    }
    if (!BOT_TOKEN) return reply.code(400).send({ ok: false, error: 'BOT_TOKEN not set' });
    if (!BASE_URL) return reply.code(400).send({ ok: false, error: 'BASE_URL not set' });
    const webhookUrl = `${BASE_URL}/api/v1/telegram/webhook`;
    const result = await callTelegramApi('setWebhook', {
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message'],
    });
    return result;
  });

  // POST /telegram/custom-bot — setup bot riêng (Premium only)
  fastify.post('/telegram/custom-bot', { preHandler: authenticate }, async (req, reply) => {
    const plan = req.user.plan || 'free';
    if (plan !== 'pro' && plan !== 'lifetime') {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Premium required' } });
    }

    const { token } = req.body || {};
    if (!token || typeof token !== 'string' || !token.includes(':')) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid bot token format' } });
    }

    // Verify token with Telegram
    let botInfo;
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const json = await resp.json();
      if (!json.ok) throw new Error(json.description || 'Invalid token');
      botInfo = json.result;
    } catch (e) {
      return reply.code(400).send({ success: false, error: { code: 'BOT_VERIFY_FAILED', message: 'Không thể xác minh bot token: ' + e.message } });
    }

    const botUsername = botInfo.username;

    // Upsert
    await query(
      `INSERT INTO telegram_links (user_id, telegram_chat_id, telegram_username, bot_type, custom_bot_token, custom_bot_username)
       VALUES (?, '', ?, 'custom', ?, ?)
       ON DUPLICATE KEY UPDATE
         bot_type = 'custom',
         custom_bot_token = VALUES(custom_bot_token),
         custom_bot_username = VALUES(custom_bot_username)`,
      [req.user.id, `@${botUsername}`, token, botUsername]
    );

    return { success: true, data: { bot_username: botUsername } };
  });
};
