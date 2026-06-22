require('dotenv').config();
const Fastify = require('fastify');

const app = Fastify({ logger: true });

// CORS — allow chrome-extension origins + any web origin
app.register(require('@fastify/cors'), {
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization',
    'X-Fingerprint', 'X-Client-Id', 'X-Timestamp', 'X-Signature', 'X-Extension-Id',
  ],
  credentials: true,
});

// Parse JSON body — handle empty body gracefully (extension sends Content-Type: application/json even without body)
app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  if (!body || body.trim() === '') return done(null, null);
  try { done(null, JSON.parse(body)); } catch (err) { done(err); }
});

// Register all routes under /api/v1
app.register(async function apiV1(fastify) {
  fastify.register(require('./routes/auth'));
  fastify.register(require('./routes/config'));
  fastify.register(require('./routes/sse'));
  fastify.register(require('./routes/usage'));
  fastify.register(require('./routes/settings'));
  fastify.register(require('./routes/workflows'));
  fastify.register(require('./routes/providers'));
  fastify.register(require('./routes/admin'));
  fastify.register(require('./routes/i18n'));
  fastify.register(require('./routes/telegram'));
}, { prefix: '/api/v1' });

// Root
app.get('/', async () => ({ service: 'KudoToolAI API', version: '1.0.0' }));

module.exports = app;
