const { query, queryOne } = require('../plugins/db');
const { authenticate, optionalAuth } = require('../middleware/auth');

module.exports = async function usageRoutes(fastify) {

  // POST /usage/heartbeat
  fastify.post('/usage/heartbeat', { preHandler: optionalAuth }, async (req) => {
    // Fire-and-forget style: just acknowledge
    return { success: true };
  });

  // POST /usage/session-end
  fastify.post('/usage/session-end', { preHandler: optionalAuth }, async (req) => {
    return { success: true };
  });

  // POST /usage/track
  fastify.post('/usage/track', { preHandler: authenticate }, async (req) => {
    return { success: true };
  });

  // POST /usage/sync-daily
  fastify.post('/usage/sync-daily', { preHandler: authenticate }, async (req) => {
    const { date, task_run, workflow_run, angles_run,
      flow_prompt_total, chatgpt_prompt_total, gemini_prompt_total, grok_prompt_total } = req.body || {};
    if (!date) return { success: true };

    await query(
      `INSERT INTO usage_daily (user_id, date, task_run, workflow_run, angles_run,
        flow_prompt_total, chatgpt_prompt_total, gemini_prompt_total, grok_prompt_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         task_run = VALUES(task_run), workflow_run = VALUES(workflow_run),
         angles_run = VALUES(angles_run), flow_prompt_total = VALUES(flow_prompt_total),
         chatgpt_prompt_total = VALUES(chatgpt_prompt_total),
         gemini_prompt_total = VALUES(gemini_prompt_total), grok_prompt_total = VALUES(grok_prompt_total)`,
      [req.user.id, date, task_run || 0, workflow_run || 0, angles_run || 0,
       flow_prompt_total || 0, chatgpt_prompt_total || 0, gemini_prompt_total || 0, grok_prompt_total || 0]
    );
    return { success: true };
  });

  // POST /usage/sync-offline
  fastify.post('/usage/sync-offline', { preHandler: authenticate }, async (req) => {
    return { success: true };
  });

  // POST /usage/events
  fastify.post('/usage/events', { preHandler: optionalAuth }, async (req) => {
    return { success: true };
  });
};
