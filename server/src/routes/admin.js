const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../plugins/db');
const { createToken } = require('../services/token');

async function adminGuard(req, reply) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid admin secret' } });
  }
}

module.exports = async function adminRoutes(fastify) {

  // GET /admin/stats
  fastify.get('/admin/stats', { preHandler: adminGuard }, async () => {
    const [totalUsers]    = await query('SELECT COUNT(*) as n FROM users');
    const [activeUsers]   = await query("SELECT COUNT(*) as n FROM users WHERE plan IN ('pro','team','lifetime') AND (plan_expires_at IS NULL OR plan_expires_at > NOW()) AND (banned IS NULL OR banned = 0)");
    const [totalOrders]   = await query("SELECT COUNT(*) as n FROM orders WHERE status = 'paid'");
    const [totalRevenue]  = await query("SELECT COALESCE(SUM(amount),0) as n FROM orders WHERE status = 'paid'");
    const [pendingOrders] = await query("SELECT COUNT(*) as n FROM orders WHERE status = 'pending'");
    const [bannedUsers]   = await query("SELECT COUNT(*) as n FROM users WHERE COALESCE(banned,0) = 1");
    return {
      success: true,
      data: {
        total_users:    totalUsers.n,
        active_users:   activeUsers.n,
        paid_orders:    totalOrders.n,
        total_revenue:  totalRevenue.n,
        pending_orders: pendingOrders.n,
        banned_users:   bannedUsers.n,
      },
    };
  });

  // GET /admin/users
  fastify.get('/admin/users', { preHandler: adminGuard }, async (req) => {
    const limit  = Math.min(parseInt(req.query.limit,  10) || 50,  200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,   0);
    const search = req.query.search || '';
    const users = search
      ? await query(
          `SELECT id, name, email, plan, plan_expires_at, created_at, COALESCE(banned,0) as banned FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          [`%${search}%`, `%${search}%`]
        )
      : await query(
          `SELECT id, name, email, plan, plan_expires_at, created_at, COALESCE(banned,0) as banned FROM users ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
        );
    return { success: true, data: { users } };
  });

  // GET /admin/users/:id — chi tiết user + lịch sử đơn hàng
  fastify.get('/admin/users/:id', { preHandler: adminGuard }, async (req, reply) => {
    const user = await queryOne(
      'SELECT id, name, email, plan, plan_expires_at, created_at, COALESCE(banned,0) as banned FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    const orders = await query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [user.id]
    );
    return { success: true, data: { user, orders } };
  });

  // GET /admin/orders
  fastify.get('/admin/orders', { preHandler: adminGuard }, async (req) => {
    const limit  = Math.min(parseInt(req.query.limit,  10) || 50,  200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,   0);
    const status = req.query.status || '';
    const rows = status
      ? await query(
          `SELECT o.*, u.email, u.name FROM orders o JOIN users u ON u.id = o.user_id WHERE o.status = ? ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          [status]
        )
      : await query(
          `SELECT o.*, u.email, u.name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`
        );
    return { success: true, data: { orders: rows } };
  });

  // POST /admin/set-plan
  fastify.post('/admin/set-plan', { preHandler: adminGuard }, async (req, reply) => {
    const { email, plan, expires_days } = req.body || {};
    if (!email || !plan) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'email and plan required' } });
    }
    const validPlans = ['free', 'trial', 'pro', 'team', 'lifetime'];
    if (!validPlans.includes(plan)) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: `plan must be one of: ${validPlans.join(', ')}` } });
    }
    const user = await queryOne('SELECT id, email, plan FROM users WHERE email = ?', [email]);
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    const days = expires_days ? parseInt(expires_days) : 365;
    const expires_at = plan === 'lifetime' ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await query('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?', [plan, expires_at, user.id]);

    const updated = await queryOne('SELECT id, email, name, plan, plan_expires_at FROM users WHERE id = ?', [user.id]);
    return { success: true, data: { user: updated } };
  });

  // POST /admin/update-user — chỉnh sửa tổng hợp thông tin user
  fastify.post('/admin/update-user', { preHandler: adminGuard }, async (req, reply) => {
    const { id, name, email, password, plan, expires_days, banned } = req.body || {};
    if (!id) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'id required' } });

    const user = await queryOne('SELECT id, email FROM users WHERE id = ?', [id]);
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    // Cập nhật thông tin cơ bản
    if (name !== undefined || email !== undefined) {
      if (email && email !== user.email) {
        const conflict = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
        if (conflict) return reply.code(422).send({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email đã được dùng bởi tài khoản khác' } });
      }
      const newName  = name  !== undefined ? name  : undefined;
      const newEmail = email !== undefined ? email : undefined;
      if (newName !== undefined && newEmail !== undefined) {
        await query('UPDATE users SET name = ?, email = ? WHERE id = ?', [newName, newEmail, id]);
      } else if (newName !== undefined) {
        await query('UPDATE users SET name = ? WHERE id = ?', [newName, id]);
      } else if (newEmail !== undefined) {
        await query('UPDATE users SET email = ? WHERE id = ?', [newEmail, id]);
      }
    }

    // Đổi mật khẩu
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password.trim(), 10);
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }

    // Đổi gói
    if (plan !== undefined) {
      const validPlans = ['free', 'trial', 'pro', 'team', 'lifetime'];
      if (!validPlans.includes(plan)) {
        return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'plan không hợp lệ' } });
      }
      let expires_at_val = null;
      if (plan !== 'lifetime' && plan !== 'free') {
        if (req.body.expires_at) {
          // Nhận ngày hết hạn trực tiếp (ISO string hoặc YYYY-MM-DD)
          expires_at_val = new Date(req.body.expires_at);
        } else {
          const days = expires_days ? parseInt(expires_days, 10) : 365;
          expires_at_val = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }
      }
      await query('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?', [plan, expires_at_val, id]);
    }

    // Ban/Unban
    if (banned !== undefined) {
      await query('UPDATE users SET banned = ? WHERE id = ?', [banned ? 1 : 0, id]);
    }

    const updated = await queryOne(
      'SELECT id, name, email, plan, plan_expires_at, created_at, COALESCE(banned,0) as banned FROM users WHERE id = ?',
      [id]
    );
    return { success: true, data: { user: updated } };
  });

  // POST /admin/ban-user
  fastify.post('/admin/ban-user', { preHandler: adminGuard }, async (req, reply) => {
    const { email, banned = true } = req.body || {};
    if (!email) return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'email required' } });
    const user = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    await query('UPDATE users SET banned = ? WHERE id = ?', [banned ? 1 : 0, user.id]);
    return { success: true };
  });

  // POST /admin/create-user
  fastify.post('/admin/create-user', { preHandler: adminGuard }, async (req, reply) => {
    const { name, email, password, plan = 'lifetime' } = req.body || {};
    if (!email || !password) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION', message: 'email and password required' } });
    }
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return reply.code(422).send({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } });
    }
    const hash = await bcrypt.hash(password, 10);
    const expires_at = plan === 'lifetime' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const result = await query(
      'INSERT INTO users (name, email, password_hash, email_verified, plan, plan_expires_at) VALUES (?, ?, ?, 1, ?, ?)',
      [name || email.split('@')[0], email, hash, plan, expires_at]
    );
    const user = await queryOne('SELECT id, email, name, plan, plan_expires_at FROM users WHERE id = ?', [result.insertId]);
    const token = await createToken(result.insertId);
    return reply.code(201).send({ success: true, data: { user, token } });
  });

  // POST /admin/test-email — gửi email test đến địa chỉ bất kỳ
  fastify.post('/admin/test-email', { preHandler: adminGuard }, async (req, reply) => {
    const { to } = req.body || {};
    if (!to) return reply.code(400).send({ success: false, error: { message: 'to required' } });
    const { sendPaymentSuccess } = require('../plugins/mailer');
    await sendPaymentSuccess({
      to,
      name: 'Khách hàng test',
      plan: 'pro',
      billingCycle: 'monthly',
      amount: 99000,
      orderId: 'KF-TEST-000000',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return { success: true, message: `Email đã gửi đến ${to}` };
  });

  // GET /admin/export/users.csv
  fastify.get('/admin/export/users.csv', { preHandler: adminGuard }, async (req, reply) => {
    const users = await query('SELECT id, name, email, plan, plan_expires_at, created_at, COALESCE(banned,0) as banned FROM users ORDER BY created_at DESC');
    const rows = [['ID', 'Tên', 'Email', 'Gói', 'Hết hạn', 'Ngày đăng ký', 'Banned']];
    for (const u of users) {
      rows.push([u.id, u.name || '', u.email, u.plan || 'free', u.plan_expires_at || '', u.created_at, u.banned ? 'yes' : 'no']);
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="users.csv"');
    return reply.send('﻿' + csv);
  });

  // GET /admin/export/orders.csv
  fastify.get('/admin/export/orders.csv', { preHandler: adminGuard }, async (req, reply) => {
    const orders = await query(
      `SELECT o.id, u.email, u.name, o.plan, o.billing_cycle, o.amount, o.status, o.transfer_content, o.created_at, o.paid_at
       FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`
    );
    const rows = [['Mã đơn', 'Email', 'Tên', 'Gói', 'Chu kỳ', 'Số tiền', 'Trạng thái', 'Nội dung CK', 'Ngày tạo', 'Ngày thanh toán']];
    for (const o of orders) {
      rows.push([o.id, o.email, o.name || '', o.plan, o.billing_cycle, o.amount, o.status, o.transfer_content, o.created_at, o.paid_at || '']);
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="orders.csv"');
    return reply.send('﻿' + csv);
  });
};
