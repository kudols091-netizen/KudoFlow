const https = require('https');
const app = require('./src/app');
const migrate = require('./src/plugins/migrate');

const PORT = parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function registerTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const baseUrl = process.env.BASE_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || 'kudotoolai-webhook-secret';
  if (!token || !baseUrl) return;

  const webhookUrl = `${baseUrl}/api/v1/telegram/webhook`;
  const payload = JSON.stringify({ url: webhookUrl, secret_token: secret, allowed_updates: ['message'] });

  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${token}/setWebhook`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => console.log('[Telegram] setWebhook:', data));
  });
  req.on('error', (e) => console.error('[Telegram] setWebhook failed:', e.message));
  req.write(payload);
  req.end();
}

migrate()
  .then(() => {
    app.listen({ port: PORT, host: HOST }, (err) => {
      if (err) { console.error(err); process.exit(1); }
      console.log(`KudoToolAI Server running at http://${HOST}:${PORT}`);
      registerTelegramWebhook();
    });
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
