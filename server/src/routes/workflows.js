const crypto = require('crypto');
const { query, queryOne } = require('../plugins/db');
const { authenticate } = require('../middleware/auth');

function parseData(row) {
  if (!row) return null;
  let parsed = {};
  try { parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'); } catch {}
  return {
    wf_id: row.id,
    wf_name: row.name || parsed.wf_name || '',
    description: parsed.description || '',
    project_id: parsed.project_id || null,
    project_name: parsed.project_name || null,
    platform: parsed.platform || 'flow',
    status: parsed.status || 'active',
    settings_json: parsed.settings_json || parsed.settings || {},
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
    edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = async function workflowRoutes(fastify) {

  // GET /workflows
  fastify.get('/workflows', { preHandler: authenticate }, async (req) => {
    const { page = 1, per_page = 50, search, project_id } = req.query;
    const limit = Math.min(parseInt(per_page) || 50, 200);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    let sql = 'SELECT * FROM workflows WHERE user_id = ?';
    const params = [req.user.id];
    if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }

    const rows = await query(sql + ' ORDER BY updated_at DESC LIMIT ? OFFSET ?', [...params, limit, offset]);
    const [countRow] = await query('SELECT COUNT(*) as total FROM workflows WHERE user_id = ?' + (search ? ' AND name LIKE ?' : ''), search ? [req.user.id, `%${search}%`] : [req.user.id]);
    const total = countRow?.total || 0;
    const lastPage = Math.ceil(total / limit) || 1;

    let data = rows.map(parseData);
    if (project_id) data = data.filter(w => w.project_id === project_id);

    return { success: true, data, meta: { current_page: parseInt(page), last_page: lastPage, per_page: limit, total } };
  });

  // GET /workflows/shared-with-me
  fastify.get('/workflows/shared-with-me', { preHandler: authenticate }, async (req) => {
    const shares = await query(
      `SELECT ws.*, w.name, w.data, w.created_at, w.updated_at, u.name as sender_name, u.email as sender_email
       FROM workflow_shares ws
       JOIN workflows w ON ws.workflow_id = w.id
       JOIN users u ON ws.sender_id = u.id
       WHERE ws.recipient_email = ? AND ws.status = 'accepted'`,
      [req.user.email]
    );
    const data = shares.map(s => ({
      ...parseData(s),
      share_id: s.id,
      sender_name: s.sender_name,
      sender_email: s.sender_email,
      is_shared: true,
    }));
    return { success: true, data };
  });

  // GET /workflows/:wfId
  fastify.get('/workflows/:wfId', { preHandler: authenticate }, async (req, reply) => {
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [req.params.wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    return { success: true, data: parseData(row) };
  });

  // POST /workflows
  fastify.post('/workflows', { preHandler: authenticate }, async (req, reply) => {
    const body = req.body || {};
    const wf_id = body.wf_id || crypto.randomUUID();
    const name = body.wf_name || body.name || 'Untitled';
    const data = JSON.stringify({ ...body, wf_id, wf_name: name });
    await query('INSERT INTO workflows (id, user_id, name, data) VALUES (?, ?, ?, ?)', [wf_id, req.user.id, name, data]);
    const row = await queryOne('SELECT * FROM workflows WHERE id = ?', [wf_id]);
    return reply.code(201).send({ success: true, data: parseData(row) });
  });

  // PUT /workflows/:wfId
  fastify.put('/workflows/:wfId', { preHandler: authenticate }, async (req, reply) => {
    const { wfId } = req.params;
    const existing = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [wfId, req.user.id]);
    if (!existing) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const body = req.body || {};
    const name = body.wf_name || body.name || existing.name;
    const data = JSON.stringify({ ...body, wf_id: wfId, wf_name: name });
    await query('UPDATE workflows SET name = ?, data = ? WHERE id = ?', [name, data, wfId]);
    const row = await queryOne('SELECT * FROM workflows WHERE id = ?', [wfId]);
    return { success: true, data: parseData(row) };
  });

  // DELETE /workflows/:wfId
  fastify.delete('/workflows/:wfId', { preHandler: authenticate }, async (req, reply) => {
    const { wfId } = req.params;
    const existing = await queryOne('SELECT id FROM workflows WHERE id = ? AND user_id = ?', [wfId, req.user.id]);
    if (!existing) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    await query('DELETE FROM workflows WHERE id = ?', [wfId]);
    return { success: true };
  });

  // POST /workflows/bulk-save — main save used by extension
  fastify.post('/workflows/bulk-save', { preHandler: authenticate }, async (req, reply) => {
    const body = req.body || {};
    const wf_id = body.wf_id || crypto.randomUUID();
    const name = body.wf_name || body.name || 'Untitled';
    const dataStr = JSON.stringify({ ...body, wf_id, wf_name: name });

    const existing = await queryOne('SELECT id FROM workflows WHERE id = ? AND user_id = ?', [wf_id, req.user.id]);
    if (existing) {
      await query('UPDATE workflows SET name = ?, data = ? WHERE id = ?', [name, dataStr, wf_id]);
    } else {
      await query('INSERT INTO workflows (id, user_id, name, data) VALUES (?, ?, ?, ?)', [wf_id, req.user.id, name, dataStr]);
    }
    const row = await queryOne('SELECT * FROM workflows WHERE id = ?', [wf_id]);
    return { success: true, data: parseData(row) };
  });

  // POST /workflows/:wfId/reset — reset all nodes to pending
  fastify.post('/workflows/:wfId/reset', { preHandler: authenticate }, async (req, reply) => {
    const { wfId } = req.params;
    const existing = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [wfId, req.user.id]);
    if (!existing) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    let parsed = {};
    try { parsed = typeof existing.data === 'object' ? existing.data : JSON.parse(existing.data || '{}'); } catch {}
    if (Array.isArray(parsed.nodes)) {
      parsed.nodes = parsed.nodes.map(n => ({ ...n, status: 'pending', result_file_ids: null, error_message: null }));
    }
    parsed.status = 'active';
    await query('UPDATE workflows SET data = ? WHERE id = ?', [JSON.stringify(parsed), wfId]);
    const row = await queryOne('SELECT * FROM workflows WHERE id = ?', [wfId]);
    return { success: true, data: parseData(row) };
  });

  // GET /workflows/:wfId/nodes
  fastify.get('/workflows/:wfId/nodes', { preHandler: authenticate }, async (req, reply) => {
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [req.params.wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const wf = parseData(row);
    return { success: true, data: wf.nodes };
  });

  // POST /workflows/:wfId/nodes
  fastify.post('/workflows/:wfId/nodes', { preHandler: authenticate }, async (req, reply) => {
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [req.params.wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    let parsed = {};
    try { parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'); } catch {}
    if (!Array.isArray(parsed.nodes)) parsed.nodes = [];
    const newNode = { node_id: crypto.randomUUID(), status: 'pending', ...req.body };
    parsed.nodes.push(newNode);
    await query('UPDATE workflows SET data = ? WHERE id = ?', [JSON.stringify(parsed), req.params.wfId]);
    return reply.code(201).send({ success: true, data: newNode });
  });

  // PUT /workflows/:wfId/nodes/:nodeId
  fastify.put('/workflows/:wfId/nodes/:nodeId', { preHandler: authenticate }, async (req, reply) => {
    const { wfId, nodeId } = req.params;
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    let parsed = {};
    try { parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'); } catch {}
    if (!Array.isArray(parsed.nodes)) parsed.nodes = [];
    const idx = parsed.nodes.findIndex(n => n.node_id === nodeId);
    if (idx === -1) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    parsed.nodes[idx] = { ...parsed.nodes[idx], ...req.body, node_id: nodeId };
    await query('UPDATE workflows SET data = ? WHERE id = ?', [JSON.stringify(parsed), wfId]);
    return { success: true, data: parsed.nodes[idx] };
  });

  // DELETE /workflows/:wfId/nodes/:nodeId
  fastify.delete('/workflows/:wfId/nodes/:nodeId', { preHandler: authenticate }, async (req, reply) => {
    const { wfId, nodeId } = req.params;
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    let parsed = {};
    try { parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'); } catch {}
    parsed.nodes = (parsed.nodes || []).filter(n => n.node_id !== nodeId);
    await query('UPDATE workflows SET data = ? WHERE id = ?', [JSON.stringify(parsed), wfId]);
    return { success: true };
  });

  // PATCH /workflows/:wfId/nodes/:nodeId/status
  fastify.patch('/workflows/:wfId/nodes/:nodeId/status', { preHandler: authenticate }, async (req, reply) => {
    const { wfId, nodeId } = req.params;
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    let parsed = {};
    try { parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'); } catch {}
    const idx = (parsed.nodes || []).findIndex(n => n.node_id === nodeId);
    if (idx === -1) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    parsed.nodes[idx] = { ...parsed.nodes[idx], ...req.body };
    await query('UPDATE workflows SET data = ? WHERE id = ?', [JSON.stringify(parsed), wfId]);
    return { success: true, data: parsed.nodes[idx] };
  });

  // GET /workflows/:wfId/edges
  fastify.get('/workflows/:wfId/edges', { preHandler: authenticate }, async (req, reply) => {
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [req.params.wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const wf = parseData(row);
    return { success: true, data: wf.edges };
  });

  // POST /workflows/:wfId/edges
  fastify.post('/workflows/:wfId/edges', { preHandler: authenticate }, async (req, reply) => {
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [req.params.wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    let parsed = {};
    try { parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'); } catch {}
    if (!Array.isArray(parsed.edges)) parsed.edges = [];
    const newEdge = { edge_id: crypto.randomUUID(), ...req.body };
    parsed.edges.push(newEdge);
    await query('UPDATE workflows SET data = ? WHERE id = ?', [JSON.stringify(parsed), req.params.wfId]);
    return reply.code(201).send({ success: true, data: newEdge });
  });

  // DELETE /workflows/:wfId/edges/:edgeId
  fastify.delete('/workflows/:wfId/edges/:edgeId', { preHandler: authenticate }, async (req, reply) => {
    const { wfId, edgeId } = req.params;
    const row = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [wfId, req.user.id]);
    if (!row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    let parsed = {};
    try { parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'); } catch {}
    parsed.edges = (parsed.edges || []).filter(e => e.edge_id !== edgeId);
    await query('UPDATE workflows SET data = ? WHERE id = ?', [JSON.stringify(parsed), wfId]);
    return { success: true };
  });

  // ===== WORKFLOW SHARES =====

  // POST /workflows/:wf_id/shares
  fastify.post('/workflows/:wf_id/shares', { preHandler: authenticate }, async (req, reply) => {
    const { wf_id } = req.params;
    const { recipient_email, note } = req.body || {};
    if (!recipient_email) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'recipient_email required' } });
    const wf = await queryOne('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [wf_id, req.user.id]);
    if (!wf) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const existing = await queryOne(`SELECT * FROM workflow_shares WHERE workflow_id = ? AND recipient_email = ? AND status = 'pending'`, [wf_id, recipient_email]);
    const share_token = crypto.randomBytes(24).toString('hex');
    if (existing) {
      await query('UPDATE workflow_shares SET share_token = ?, note = ?, created_at = NOW() WHERE id = ?', [share_token, note || null, existing.id]);
      return { success: true, data: await queryOne('SELECT * FROM workflow_shares WHERE id = ?', [existing.id]), replaced: true };
    }
    const result = await query('INSERT INTO workflow_shares (workflow_id, sender_id, recipient_email, share_token, note) VALUES (?, ?, ?, ?, ?)', [wf_id, req.user.id, recipient_email, share_token, note || null]);
    return reply.code(201).send({ success: true, data: await queryOne('SELECT * FROM workflow_shares WHERE id = ?', [result.insertId]) });
  });

  // POST /workflow-shares/:share_token/accept
  fastify.post('/workflow-shares/:share_token/accept', async (req, reply) => {
    const share = await queryOne('SELECT * FROM workflow_shares WHERE share_token = ?', [req.params.share_token]);
    if (!share) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    if (share.status !== 'pending') return reply.code(409).send({ success: false, error: { code: 'ALREADY_PROCESSED' } });
    await query(`UPDATE workflow_shares SET status = 'accepted' WHERE id = ?`, [share.id]);
    return { success: true };
  });

  // POST /shared-workflows/:wfId/clone
  fastify.post('/shared-workflows/:wfId/clone', { preHandler: authenticate }, async (req, reply) => {
    const { wfId } = req.params;
    const share = await queryOne(`SELECT ws.*, w.name, w.data FROM workflow_shares ws JOIN workflows w ON ws.workflow_id = w.id WHERE ws.workflow_id = ? AND ws.recipient_email = ? AND ws.status = 'accepted'`, [wfId, req.user.email]);
    if (!share) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const newId = crypto.randomUUID();
    let parsed = {};
    try { parsed = typeof share.data === 'object' ? share.data : JSON.parse(share.data || '{}'); } catch {}
    parsed.wf_id = newId;
    parsed.wf_name = (share.name || 'Untitled') + ' (copy)';
    if (Array.isArray(parsed.nodes)) {
      parsed.nodes = parsed.nodes.map(n => ({ ...n, status: 'pending', result_file_ids: null }));
    }
    await query('INSERT INTO workflows (id, user_id, name, data) VALUES (?, ?, ?, ?)', [newId, req.user.id, parsed.wf_name, JSON.stringify(parsed)]);
    const row = await queryOne('SELECT * FROM workflows WHERE id = ?', [newId]);
    return reply.code(201).send({ success: true, data: parseData(row) });
  });

  // ===== WORKFLOW TEMPLATES =====

  // Built-in templates (hardcoded, không cần DB)
  const BUILTIN_TEMPLATES = [
    {
      id: 'builtin_web_import_product',
      name: 'Nhập link → Tạo ảnh sản phẩm',
      description: 'Dán URL sản phẩm, AI tự phân tích và tạo ảnh quảng cáo chuyên nghiệp.',
      is_active: true, is_premium: false, is_featured: true,
      use_count: 0, avg_rating: 0, ratings_count: 0,
      nodes: [
        {
          node_id: 'tpl_web_import_1',
          node_type: 'web_import',
          node_name: 'Web Import',
          pos_x: 80, pos_y: 200,
          web_url: '', enabled: true, status: 'pending',
        },
        {
          node_id: 'tpl_prompt_1',
          node_type: 'prompt',
          node_name: 'Viết Prompt',
          pos_x: 430, pos_y: 200,
          prompt: 'Dựa vào thông tin sản phẩm trên, viết 1 prompt tiếng Anh ngắn gọn để tạo ảnh quảng cáo sản phẩm đẹp, chuyên nghiệp. Chỉ trả về prompt, không giải thích thêm.',
          use_ai: true, ai_fallback: false, provider: 'chatgpt',
          enabled: true, status: 'pending',
        },
        {
          node_id: 'tpl_generate_1',
          node_type: 'generate',
          node_name: 'Tạo ảnh',
          pos_x: 780, pos_y: 200,
          media_type: 'Image', ratio: '1:1', quantity: 1,
          prompt_source: 'upstream_node',
          enabled: true, status: 'pending',
        },
      ],
      edges: [
        {
          edge_id: 'tpl_edge_1',
          source_node_id: 'tpl_web_import_1', target_node_id: 'tpl_prompt_1',
          source_handle: 'output_1', target_handle: 'input_1',
          source_port: 'text', target_port: 'text',
        },
        {
          edge_id: 'tpl_edge_2',
          source_node_id: 'tpl_prompt_1', target_node_id: 'tpl_generate_1',
          source_handle: 'output_1', target_handle: 'input_2',
          source_port: 'text', target_port: 'text',
        },
      ],
    },
  ];

  // GET /workflow-templates
  fastify.get('/workflow-templates', async () => {
    return { success: true, data: BUILTIN_TEMPLATES, meta: { current_page: 1, last_page: 1, total: BUILTIN_TEMPLATES.length } };
  });

  // GET /workflow-templates/categories
  fastify.get('/workflow-templates/categories', async () => {
    return { success: true, data: [] };
  });

  // GET /workflow-templates/:templateId
  fastify.get('/workflow-templates/:templateId', async (req, reply) => {
    const tpl = BUILTIN_TEMPLATES.find(t => t.id === req.params.templateId);
    if (!tpl) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    return { success: true, data: tpl };
  });

  // POST /workflow-templates/:templateId/use
  fastify.post('/workflow-templates/:templateId/use', { preHandler: authenticate }, async () => {
    return { success: true };
  });

  // POST /workflow-templates/:templateId/clone — tạo workflow mới từ template
  fastify.post('/workflow-templates/:templateId/clone', { preHandler: authenticate }, async (req, reply) => {
    const tpl = BUILTIN_TEMPLATES.find(t => t.id === req.params.templateId);
    if (!tpl) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });

    // Generate unique node/edge IDs cho clone (mỗi lần clone có IDs riêng)
    const idMap = {};
    const now = Date.now();
    const rand = () => Math.random().toString(36).substr(2, 6);

    const nodes = tpl.nodes.map((n, i) => {
      const newId = `node_${now}_${i}_${rand()}`;
      idMap[n.node_id] = newId;
      return { ...n, node_id: newId, status: 'pending' };
    });

    const edges = tpl.edges.map((e, i) => ({
      ...e,
      edge_id: `edge_${now}_${i}_${rand()}`,
      source_node_id: idMap[e.source_node_id] || e.source_node_id,
      target_node_id: idMap[e.target_node_id] || e.target_node_id,
    }));

    const wf_id = crypto.randomUUID();
    const wf_name = tpl.name;
    const data = JSON.stringify({ wf_id, wf_name, nodes, edges, status: 'idle', enabled: true });
    await query('INSERT INTO workflows (id, user_id, name, data) VALUES (?, ?, ?, ?)', [wf_id, req.user.id, wf_name, data]);
    const row = await queryOne('SELECT * FROM workflows WHERE id = ?', [wf_id]);
    const workflow = parseData(row);
    return { success: true, workflow };
  });

  // ===== EXECUTION TRACKING =====

  // POST /executions/start
  fastify.post('/executions/start', { preHandler: authenticate }, async (req, reply) => {
    const { wf_id, wf_name, total_nodes } = req.body || {};
    const exec_id = crypto.randomUUID();
    return reply.code(201).send({ success: true, data: { execution_id: exec_id, wf_id, wf_name, total_nodes, status: 'running' } });
  });

  // PATCH /executions/:executionId/heartbeat
  fastify.patch('/executions/:executionId/heartbeat', { preHandler: authenticate }, async () => {
    return { success: true };
  });

  // POST /executions/:executionId/complete
  fastify.post('/executions/:executionId/complete', { preHandler: authenticate }, async () => {
    return { success: true };
  });

  // POST /results/sync
  fastify.post('/results/sync', { preHandler: authenticate }, async () => {
    return { success: true };
  });
};
