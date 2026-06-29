const crypto = require('crypto');
const { query, queryOne } = require('../plugins/db');
const { authenticate } = require('../middleware/auth');
const { sendPaymentSuccess } = require('../plugins/mailer');

const PLANS = {
  pro:  { name: 'Pro',  monthly: 99000,  yearly: 890000 },
  team: { name: 'Team', monthly: 299000, yearly: null },
};

const PLANS_LIST = [
  {
    id: 'pro', slug: 'pro', name: 'Pro', display_order: 10,
    price_monthly: 99000, price_yearly: 890000, price_lifetime: null,
    price_usd_monthly: null, price_usd_yearly: null,
    features: [
      { display: 'Không giới hạn workflow' },
      { display: 'Ưu tiên xử lý hàng đợi' },
      { display: 'Tải ảnh chất lượng cao' },
      { display: 'Hỗ trợ ưu tiên' },
    ],
  },
  {
    id: 'team', slug: 'team', name: 'Team', display_order: 20,
    price_monthly: 299000, price_yearly: null, price_lifetime: null,
    price_usd_monthly: null, price_usd_yearly: null,
    features: [
      { display: 'Tất cả tính năng Pro' },
      { display: 'Chia sẻ workflow với team' },
      { display: 'Quản lý thành viên' },
      { display: 'Hỗ trợ ưu tiên cao nhất' },
    ],
  },
];

function generateOrderId() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KF-${date}-${rand}`;
}

module.exports = async function ordersRoutes(fastify) {

  // POST /orders — create order
  fastify.post('/orders', { preHandler: authenticate }, async (req, reply) => {
    const { plan, plan_id, billing_cycle = 'monthly' } = req.body || {};
    const resolvedPlan = (plan || plan_id || '').toLowerCase();
    if (!PLANS[resolvedPlan]) return reply.code(400).send({ success: false, error: { code: 'INVALID_PLAN' } });

    const planData = PLANS[resolvedPlan];
    const amount = billing_cycle === 'yearly' ? planData.yearly : planData.monthly;
    if (!amount) return reply.code(400).send({ success: false, error: { code: 'INVALID_CYCLE' } });

    const orderId = generateOrderId();
    const transferContent = `KUDO ${orderId}`;
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    await query(
      `INSERT INTO orders (id, user_id, plan, billing_cycle, amount, transfer_content, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, req.user.id, resolvedPlan, billing_cycle, amount, transferContent, expiresAt]
    );

    const bankId      = process.env.SEPAY_BANK_ID      || '';
    const accountNo   = process.env.SEPAY_ACCOUNT_NO   || '';
    const accountName = process.env.SEPAY_ACCOUNT_NAME || 'KudoSkill';

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png` +
      `?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`;

    const websiteUrl = process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://kudo-flow.vercel.app';
    const checkoutUrl = `${websiteUrl}/checkout?plan=${resolvedPlan}&cycle=${billing_cycle}&order_id=${orderId}`;

    return reply.code(201).send({
      success: true,
      data: {
        order_id: orderId,
        plan: resolvedPlan,
        plan_name: planData.name,
        billing_cycle,
        amount,
        transfer_content: transferContent,
        qr_url: qrUrl,
        bank_id: bankId,
        account_no: accountNo,
        account_name: accountName,
        expires_at: expiresAt.toISOString(),
        checkout_url: checkoutUrl,
      }
    });
  });

  // GET /orders/:orderId — check status (polling)
  fastify.get('/orders/:orderId', { preHandler: authenticate }, async (req, reply) => {
    const order = await queryOne(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.orderId, req.user.id]
    );
    if (!order) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    // Auto-expire
    if (order.status === 'pending' && new Date(order.expires_at) < new Date()) {
      await query('UPDATE orders SET status = ? WHERE id = ?', ['expired', order.id]);
      order.status = 'expired';
    }
    const bankId      = process.env.SEPAY_BANK_ID      || '';
    const accountNo   = process.env.SEPAY_ACCOUNT_NO   || '';
    const accountName = process.env.SEPAY_ACCOUNT_NAME || 'KudoSkill';
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png` +
      `?amount=${order.amount}&addInfo=${encodeURIComponent(order.transfer_content)}&accountName=${encodeURIComponent(accountName)}`;
    return { success: true, data: { order: { ...order, qr_url: qrUrl, bank_id: bankId, account_no: accountNo, account_name: accountName } } };
  });

  // POST /webhooks/sepay — SePay webhook (no auth, verify by secret)
  fastify.post('/webhooks/sepay', async (req, reply) => {
    const secret = process.env.SEPAY_WEBHOOK_SECRET || '';
    const authHeader = req.headers['authorization'] || '';
    if (secret && authHeader !== `Apikey ${secret}`) {
      return reply.code(401).send({ success: false });
    }

    const { content, transferAmount } = req.body || {};
    if (!content) return { success: false, error: 'no content' };

    // Find matching order by transfer content
    const match = content.match(/KUDO\s+(KF-\d{8}-[A-F0-9]{6})/i);
    if (!match) return { success: true, message: 'no matching order' };

    const orderId = match[1].toUpperCase();
    const order = await queryOne(
      "SELECT * FROM orders WHERE id = ? AND status = 'pending'",
      [orderId]
    );
    if (!order) return { success: true, message: 'order not found or already processed' };

    // Verify amount (allow tolerance of 1000 VND for fees)
    if (parseInt(transferAmount) < order.amount - 1000) {
      return { success: false, error: 'amount mismatch' };
    }

    // Calculate plan expiry
    const days = order.billing_cycle === 'yearly' ? 365 : 30;
    const planExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Update order + user plan
    await query("UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = ?", [orderId]);
    await query(
      "UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?",
      [order.plan, planExpiry, order.user_id]
    );

    console.log(`[SePay] Order ${orderId} paid — upgraded user ${order.user_id} to ${order.plan}`);

    // Send confirmation email (non-blocking)
    const user = await queryOne('SELECT email, name FROM users WHERE id = ?', [order.user_id]);
    if (user?.email) {
      sendPaymentSuccess({
        to: user.email,
        name: user.name || '',
        plan: order.plan,
        billingCycle: order.billing_cycle,
        amount: order.amount,
        orderId: order.id,
        expiresAt: planExpiry,
      }).catch(err => console.error('[Mailer] Failed to send email:', err.message));
    }

    return { success: true };
  });

  // GET /plans — list available plans (used by extension upgrade modal)
  fastify.get('/plans', async () => {
    return { success: true, data: PLANS_LIST };
  });

  // GET /payment-settings/providers — active payment providers (used by extension)
  fastify.get('/payment-settings/providers', async () => {
    return {
      success: true,
      data: {
        providers: ['sepay'],
        labels: { sepay: 'SePay (Auto)' },
      },
    };
  });

};
