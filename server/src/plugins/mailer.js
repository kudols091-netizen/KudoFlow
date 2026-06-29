const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '465'),
    secure: process.env.MAIL_PORT ? process.env.MAIL_PORT !== '587' : true,
    family: 4, // force IPv4 — Railway does not support IPv6 outbound
    auth: {
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || '',
    },
  });
  return _transporter;
}

async function sendPaymentSuccess({ to, name, plan, billingCycle, amount, orderId, expiresAt }) {
  if (!process.env.MAIL_USER) {
    console.log('[Mailer] MAIL_USER not set, skipping email to', to);
    return;
  }

  const planLabel = plan === 'team' ? 'Team' : 'Pro';
  const cycleLabel = billingCycle === 'yearly' ? 'năm' : 'tháng';
  const amountFormatted = Number(amount).toLocaleString('vi-VN') + ' đ';
  const expireDate = new Date(expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fromName = process.env.MAIL_FROM_NAME || 'KudoSkill';
  const fromEmail = process.env.MAIL_USER;

  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: `✅ Thanh toán thành công — Gói ${planLabel} đã được kích hoạt`,
    html: `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#111111;font-family:'Inter',Arial,sans-serif;color:#e8e8ea;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2e2e33;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#ccff00;padding:24px 32px;text-align:center;">
            <span style="font-family:'Inter',Arial,sans-serif;font-weight:900;font-size:22px;color:#111;letter-spacing:-0.02em;">KudoSkill</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <!-- Success icon -->
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:60px;height:60px;background:rgba(34,197,94,0.12);border:2px solid rgba(34,197,94,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:26px;">✓</div>
            </div>

            <h1 style="margin:0 0 8px;text-align:center;font-size:22px;font-weight:900;color:#22c55e;letter-spacing:-0.01em;">Thanh toán thành công!</h1>
            <p style="margin:0 0 28px;text-align:center;font-size:14px;color:#71717a;">Cảm ơn bạn đã tin tưởng KudoSkill.</p>

            <!-- Order details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2e2e33;border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                  <span style="font-size:13px;color:#71717a;">Gói dịch vụ</span>
                  <span style="float:right;font-size:13px;font-weight:700;color:#ccff00;">${planLabel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                  <span style="font-size:13px;color:#71717a;">Chu kỳ</span>
                  <span style="float:right;font-size:13px;font-weight:600;color:#e8e8ea;">Hàng ${cycleLabel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                  <span style="font-size:13px;color:#71717a;">Số tiền</span>
                  <span style="float:right;font-size:13px;font-weight:700;color:#e8e8ea;">${amountFormatted}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                  <span style="font-size:13px;color:#71717a;">Mã đơn hàng</span>
                  <span style="float:right;font-size:12px;font-weight:600;color:#71717a;">${orderId}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;">
                  <span style="font-size:13px;color:#71717a;">Hiệu lực đến</span>
                  <span style="float:right;font-size:13px;font-weight:700;color:#e8e8ea;">${expireDate}</span>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://kudo-flow.vercel.app/dashboard" style="display:inline-block;background:#ccff00;color:#111;font-size:15px;font-weight:800;padding:13px 32px;border-radius:10px;text-decoration:none;">Vào Dashboard →</a>
            </div>

            <p style="margin:0;font-size:13px;color:#555;text-align:center;line-height:1.6;">
              Nếu bạn có thắc mắc, hãy liên hệ <a href="mailto:hello@kudoskill.xyz" style="color:#ccff00;text-decoration:none;">hello@kudoskill.xyz</a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2e2e33;text-align:center;">
            <span style="font-size:12px;color:#444;">© 2026 KudoSkill · <a href="https://kudo-flow.vercel.app/privacy" style="color:#555;text-decoration:none;">Chính sách bảo mật</a></span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  console.log(`[Mailer] Payment success email sent to ${to} for order ${orderId}`);
}

module.exports = { sendPaymentSuccess };
