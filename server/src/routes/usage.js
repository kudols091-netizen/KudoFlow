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

  // GET /usage/summary — dashboard stats
  fastify.get('/usage/summary', { preHandler: authenticate }, async (req) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayUsage = await queryOne(
      'SELECT * FROM usage_daily WHERE user_id = ? AND date = ?',
      [req.user.id, today]
    );
    const allTime = await queryOne(
      `SELECT SUM(chatgpt_prompt_total) as chatgpt, SUM(gemini_prompt_total) as gemini,
              SUM(grok_prompt_total) as grok, SUM(workflow_run) as workflows,
              SUM(task_run) as tasks
       FROM usage_daily WHERE user_id = ?`,
      [req.user.id]
    );
    // Khớp enum plan trong schema.sql. Bảng cũ dùng key 'ultra' (không có trong DB) và
    // thiếu lifetime/team/trial → user lifetime rơi vào fallback free, dashboard hiện
    // hạn mức 10 prompts thay vì 500. Giá trị lấy theo PLAN_FEATURES ở website/dashboard.html.
    const PLAN_LIMITS = {
      free:     { prompts_per_batch: 10,  history: 50,   workflows: 5 },
      trial:    { prompts_per_batch: 10,  history: 50,   workflows: 5 },
      pro:      { prompts_per_batch: 100, history: 500,  workflows: 999 },
      team:     { prompts_per_batch: 500, history: 2000, workflows: 999 },
      lifetime: { prompts_per_batch: 500, history: 2000, workflows: 999 },
    };
    const plan = req.user.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    return {
      success: true,
      data: {
        today: {
          chatgpt: todayUsage?.chatgpt_prompt_total || 0,
          gemini:  todayUsage?.gemini_prompt_total  || 0,
          grok:    todayUsage?.grok_prompt_total    || 0,
          workflows: todayUsage?.workflow_run       || 0,
          tasks:   todayUsage?.task_run             || 0,
        },
        all_time: {
          chatgpt:   parseInt(allTime?.chatgpt   || 0),
          gemini:    parseInt(allTime?.gemini    || 0),
          grok:      parseInt(allTime?.grok      || 0),
          workflows: parseInt(allTime?.workflows || 0),
          tasks:     parseInt(allTime?.tasks     || 0),
        },
        limits,
        plan,
      }
    };
  });
};
