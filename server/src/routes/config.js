const { queryOne, query } = require('../plugins/db');

function parseJSON(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return {}; }
}

module.exports = async function configRoutes(fastify) {

  // GET /health
  fastify.get('/health', async () => ({ status: 'ok', ts: Date.now() }));

  // GET /system-settings/public
  fastify.get('/system-settings/public', async () => {
    const row = await queryOne('SELECT data, version FROM system_settings WHERE id = 1');
    return { success: true, data: parseJSON(row?.data), meta: { version: row?.version || 1 } };
  });

  // GET /system-config/execution
  fastify.get('/system-config/execution', async () => {
    const row = await queryOne('SELECT data, version FROM execution_config WHERE id = 1');
    return { success: true, data: parseJSON(row?.data), meta: { version: row?.version || 1 } };
  });

  // GET /default-settings
  fastify.get('/default-settings', async () => {
    return {
      success: true,
      data: {
        theme: 'dark',
        language: 'vi',
        auto_download: true,
        download_quality: '2k',
        sidebar_position: 'right',
        notifications_enabled: true,
      },
      meta: { version: 1 }
    };
  });

  // GET /validation-rules
  // Extension ValidationRules.js là Server-Only (không có _DEFAULTS fallback) — thiếu
  // endpoint này thì sidebar log lỗi CONFIG_REQUIRED mỗi lần mở. Nguồn dữ liệu là
  // system_settings.data.validation; giá trị dưới đây là mặc định khi admin chưa set.
  fastify.get('/validation-rules', async () => {
    const row = await queryOne('SELECT data, version FROM system_settings WHERE id = 1');
    const validation = parseJSON(row?.data).validation || {};
    return {
      success: true,
      data: {
        prompt_max_length: validation.prompt_max_length ?? 5000,
        quantity_min: validation.quantity_min ?? 1,
        quantity_max: validation.quantity_max ?? 4,
        workflow_max_run_duration_sec: validation.workflow_max_run_duration_sec ?? 3600,
      },
      meta: { version: row?.version || 1 },
    };
  });

  // GET /config/versions
  fastify.get('/config/versions', async () => {
    const sys = await queryOne('SELECT version FROM system_settings WHERE id = 1');
    const exec = await queryOne('SELECT version FROM execution_config WHERE id = 1');
    const providers = await query('SELECT id, version FROM providers');
    const providerVersions = {};
    for (const p of providers) providerVersions[p.id] = p.version;
    return {
      success: true,
      data: {
        system_settings: sys?.version || 1,
        execution_config: exec?.version || 1,
        providers: providerVersions,
      }
    };
  });

  // GET /announcement
  fastify.get('/announcement', async () => {
    const row = await queryOne('SELECT * FROM announcements WHERE active = 1 ORDER BY updated_at DESC LIMIT 1');
    if (!row) return { success: true, data: null };
    return {
      success: true,
      data: {
        title: row.title,
        content: row.content,
        type: row.type,
        display_mode: row.display_mode,
        version: row.version,
        updated_at: row.updated_at,
      }
    };
  });

  // GET /location/me
  // LocationCache.js dùng country để chọn hiển thị giá VND hay USD trong upgrade modal.
  // Lookup qua ipwho.is (free, không cần API key). Cache theo IP 24h — trùng TTL cache
  // phía extension, đủ để không chạm rate limit của dịch vụ free.
  const geoCache = new Map();
  const GEO_TTL_MS = 24 * 60 * 60 * 1000;
  const GEO_FALLBACK = { country_code: 'US', country_name: 'United States', locale: 'en', currency: 'USD' };

  function maskIp(ip) {
    if (!ip) return null;
    if (ip.includes(':')) return ip.split(':').slice(0, 2).join(':') + ':***';
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.***` : null;
  }

  fastify.get('/location/me', async (req) => {
    // Railway đứng sau proxy → IP thật nằm ở x-forwarded-for, không phải req.ip.
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '';
    const isPublic = ip && !/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/.test(ip);

    if (!isPublic) return { success: true, data: { ...GEO_FALLBACK, ip_masked: maskIp(ip) } };

    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.at < GEO_TTL_MS) {
      return { success: true, data: { ...cached.data, ip_masked: maskIp(ip) } };
    }

    let data = GEO_FALLBACK;
    try {
      const resp = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code`, {
        signal: AbortSignal.timeout(3000),
      });
      const json = await resp.json();
      if (json?.success && json.country_code) {
        const isVN = json.country_code === 'VN';
        data = {
          country_code: json.country_code,
          country_name: json.country || GEO_FALLBACK.country_name,
          locale: isVN ? 'vi' : 'en',
          currency: isVN ? 'VND' : 'USD',
        };
        geoCache.set(ip, { data, at: Date.now() });
      }
    } catch (e) {
      req.log.warn({ err: e.message }, 'location/me geo lookup failed, dùng fallback US');
    }

    return { success: true, data: { ...data, ip_masked: maskIp(ip) } };
  });

  // GET /entitlements
  fastify.get('/entitlements', async (req) => {
    const header = req.headers['authorization'];
    let user = null;
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7);
      user = await queryOne(
        `SELECT u.* FROM auth_tokens t JOIN users u ON t.user_id = u.id WHERE t.token = ? AND t.expires_at > NOW()`,
        [token]
      );
    }

    const plan = user?.plan || 'free';
    // 'team' nằm trong enum plan của schema.sql nhưng trước đây bị bỏ sót ở đây,
    // nên user gói Team bị extension khoá tính năng y như gói free.
    const isPremium = plan === 'pro' || plan === 'team' || plan === 'lifetime';
    const isTrial = plan === 'trial';
    const isPaid = isPremium || isTrial;

    const bool = (v) => ({ type: 'boolean', value: v, usage_today: 0 });
    const quota = (v, used = 0) => ({ type: 'quota', value: v, usage_today: used });

    const features = isPremium ? {
      // Gen
      gen_enabled:           bool(true),
      gen_run_max:           quota(-1),
      // ChatGPT
      chatgpt_enabled:       bool(true),
      chatgpt_run_max:       quota(-1),
      // Gemini
      gemini_enabled:        bool(true),
      gemini_run_max:        quota(-1),
      // Grok
      grok_enabled:          bool(true),
      grok_run_max:          quota(-1),
      // Prompt / AI Agent node
      prompt_node_enabled:   bool(true),
      ai_agent_enabled:      bool(true),
      // Tasks
      tasks_enabled:         bool(true),
      tasks_max:             quota(-1),
      tasks_run_max:         quota(-1),
      // Workflows
      workflows_enabled:     bool(true),
      workflows_max:         quota(-1),
      workflows_run_max:     quota(-1),
      workflows_nodes_max:   quota(200),
      workflow_share_enabled:bool(true),
      workflow_import:       bool(true),
      workflow_export:       bool(true),
      // Angles & Effects
      angles_enabled:        bool(true),
      angles_run_max:        quota(-1),
      effects_enabled:       bool(true),
      effects_run_max:       quota(-1),
      // Shared
      auto_download:         bool(true),
      retry_on_fail:         bool(true),
      ref_images:            bool(true),
      prompt_templates_enabled:    bool(true),
      workflow_templates_enabled:  bool(true),
      history_enabled:       bool(true),
      snippets_max:          quota(-1),
      priority_support:      bool(true),
      pipeline_queue_enabled:bool(true),
      telegram_enabled:      bool(true),
      telegram_workflow:     bool(true),
      prompt_submit_max:     quota(-1),
      prompts_per_batch:     quota(100),
      api_rate_limit_per_minute: quota(1000),
    } : isTrial ? {
      gen_enabled:           bool(true),
      gen_run_max:           quota(-1),
      chatgpt_enabled:       bool(true),
      chatgpt_run_max:       quota(50),
      gemini_enabled:        bool(true),
      gemini_run_max:        quota(50),
      grok_enabled:          bool(true),
      grok_run_max:          quota(50),
      prompt_node_enabled:   bool(true),
      ai_agent_enabled:      bool(true),
      tasks_enabled:         bool(true),
      tasks_max:             quota(10),
      tasks_run_max:         quota(5),
      workflows_enabled:     bool(true),
      workflows_max:         quota(10),
      workflows_run_max:     quota(5),
      workflows_nodes_max:   quota(20),
      workflow_share_enabled:bool(false),
      workflow_import:       bool(true),
      workflow_export:       bool(true),
      angles_enabled:        bool(true),
      angles_run_max:        quota(20),
      effects_enabled:       bool(true),
      effects_run_max:       quota(20),
      auto_download:         bool(true),
      retry_on_fail:         bool(true),
      ref_images:            bool(true),
      prompt_templates_enabled:    bool(true),
      workflow_templates_enabled:  bool(true),
      history_enabled:       bool(true),
      snippets_max:          quota(20),
      priority_support:      bool(false),
      pipeline_queue_enabled:bool(false),
      telegram_enabled:      bool(true),
      telegram_workflow:     bool(false),
      prompt_submit_max:     quota(100),
      prompts_per_batch:     quota(20),
      api_rate_limit_per_minute: quota(200),
    } : {
      // Free
      gen_enabled:           bool(true),
      gen_run_max:           quota(-1),
      chatgpt_enabled:       bool(false),
      chatgpt_run_max:       quota(0),
      gemini_enabled:        bool(false),
      gemini_run_max:        quota(0),
      grok_enabled:          bool(false),
      grok_run_max:          quota(0),
      prompt_node_enabled:   bool(false),
      ai_agent_enabled:      bool(false),
      tasks_enabled:         bool(false),
      tasks_max:             quota(2),
      tasks_run_max:         quota(1),
      workflows_enabled:     bool(false),
      workflows_max:         quota(1),
      workflows_run_max:     quota(1),
      workflows_nodes_max:   quota(5),
      workflow_share_enabled:bool(false),
      workflow_import:       bool(false),
      workflow_export:       bool(false),
      angles_enabled:        bool(true),
      angles_run_max:        quota(3),
      effects_enabled:       bool(true),
      effects_run_max:       quota(3),
      auto_download:         bool(false),
      retry_on_fail:         bool(false),
      ref_images:            bool(true),
      prompt_templates_enabled:    bool(false),
      workflow_templates_enabled:  bool(false),
      history_enabled:       bool(true),
      snippets_max:          quota(5),
      priority_support:      bool(false),
      pipeline_queue_enabled:bool(false),
      telegram_enabled:      bool(false),
      telegram_workflow:     bool(false),
      prompt_submit_max:     quota(20),
      prompts_per_batch:     quota(4),
      api_rate_limit_per_minute: quota(60),
    };

    // Map internal plan slugs to values the extension expects
    const slugMap = { lifetime: 'unlimited', pro: 'premium', trial: 'trial', free: 'free' };
    const nameMap = { lifetime: 'Lifetime', pro: 'Pro', trial: 'Trial', free: 'Free' };
    const extSlug = slugMap[plan] || plan;
    const extName = nameMap[plan] || plan.charAt(0).toUpperCase() + plan.slice(1);

    return {
      success: true,
      data: {
        plan: {
          slug: extSlug,
          name: extName,
          expires_at: user?.plan_expires_at || null,
        },
        features,
      },
      meta: { version: 1 }
    };
  });
};
