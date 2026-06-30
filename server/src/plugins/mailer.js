async function sendPaymentSuccess({ to, name, plan, billingCycle, amount, orderId, expiresAt }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log('[Mailer] BREVO_API_KEY not set, skipping email to', to);
    return;
  }

  const planLabel = plan === 'team' ? 'Team' : 'Pro';
  const cycleLabel = billingCycle === 'yearly' ? 'năm' : 'tháng';
  const amountFormatted = Number(amount).toLocaleString('vi-VN') + ' đ';
  const expireDate = new Date(expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fromName = process.env.MAIL_FROM_NAME || 'KudoSkill';
  const fromEmail = process.env.MAIL_FROM || 'noreply@kudoskill.xyz';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#111111;font-family:'Inter',Arial,sans-serif;color:#e8e8ea;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2e2e33;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#ccff00;padding:24px 32px;text-align:center;">
            <span style="font-family:'Inter',Arial,sans-serif;font-weight:900;font-size:22px;color:#111;letter-spacing:-0.02em;">KudoSkill</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:60px;height:60px;background:rgba(34,197,94,0.12);border:2px solid rgba(34,197,94,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:26px;">✓</div>
            </div>
            <h1 style="margin:0 0 8px;text-align:center;font-size:22px;font-weight:900;color:#22c55e;letter-spacing:-0.01em;">Thanh toán thành công!</h1>
            <p style="margin:0 0 28px;text-align:center;font-size:14px;color:#71717a;">Cảm ơn bạn đã tin tưởng KudoSkill.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2e2e33;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                <span style="font-size:13px;color:#71717a;">Gói dịch vụ</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#ccff00;">${planLabel}</span>
              </td></tr>
              <tr><td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                <span style="font-size:13px;color:#71717a;">Chu kỳ</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#e8e8ea;">Hàng ${cycleLabel}</span>
              </td></tr>
              <tr><td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                <span style="font-size:13px;color:#71717a;">Số tiền</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#e8e8ea;">${amountFormatted}</span>
              </td></tr>
              <tr><td style="padding:14px 16px;border-bottom:1px solid #2e2e33;">
                <span style="font-size:13px;color:#71717a;">Mã đơn hàng</span>
                <span style="float:right;font-size:12px;font-weight:600;color:#71717a;">${orderId}</span>
              </td></tr>
              <tr><td style="padding:14px 16px;">
                <span style="font-size:13px;color:#71717a;">Hiệu lực đến</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#e8e8ea;">${expireDate}</span>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://kudo-flow.vercel.app/dashboard" style="display:inline-block;background:#ccff00;color:#111;font-size:15px;font-weight:800;padding:13px 32px;border-radius:10px;text-decoration:none;">Vào Dashboard →</a>
            </div>
            <p style="margin:0;font-size:13px;color:#555;text-align:center;line-height:1.6;">
              Nếu bạn có thắc mắc, hãy liên hệ <a href="mailto:hello@kudoskill.xyz" style="color:#ccff00;text-decoration:none;">hello@kudoskill.xyz</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2e2e33;text-align:center;">
            <span style="font-size:12px;color:#444;">© 2026 KudoSkill · <a href="https://kudo-flow.vercel.app/privacy" style="color:#555;text-decoration:none;">Chính sách bảo mật</a></span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to, name: name || to }],
      subject: `✅ Thanh toán thành công — Gói ${planLabel} đã được kích hoạt`,
      htmlContent: html,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Brevo error: ${JSON.stringify(data)}`);
  console.log(`[Mailer] Email sent to ${to} for order ${orderId} — id: ${data.messageId}`);
}

async function sendPasswordReset({ to, name, resetUrl }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log('[Mailer] BREVO_API_KEY not set, skipping reset email to', to);
    return;
  }

  const fromName = process.env.MAIL_FROM_NAME || 'KudoSkill';
  const fromEmail = process.env.MAIL_FROM || 'noreply@kudoskill.xyz';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#111111;font-family:'Inter',Arial,sans-serif;color:#e8e8ea;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2e2e33;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#ccff00;padding:24px 32px;text-align:center;">
            <span style="font-family:'Inter',Arial,sans-serif;font-weight:900;font-size:22px;color:#111;letter-spacing:-0.02em;">KudoSkill</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 12px;text-align:center;font-size:22px;font-weight:900;color:#e8e8ea;letter-spacing:-0.01em;">Đặt lại mật khẩu</h1>
            <p style="margin:0 0 8px;font-size:14px;color:#71717a;line-height:1.6;">Xin chào ${name || 'bạn'},</p>
            <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới.</p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${resetUrl}" style="display:inline-block;background:#ccff00;color:#111;font-size:15px;font-weight:800;padding:13px 32px;border-radius:10px;text-decoration:none;">Đặt lại mật khẩu →</a>
            </div>
            <div style="background:#111;border:1px solid #2e2e33;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                ⚠️ Link này sẽ hết hạn sau <strong style="color:#e8e8ea;">1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
              </p>
            </div>
            <p style="margin:0;font-size:13px;color:#555;text-align:center;line-height:1.6;">
              Nếu bạn có thắc mắc, hãy liên hệ <a href="mailto:hello@kudoskill.xyz" style="color:#ccff00;text-decoration:none;">hello@kudoskill.xyz</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2e2e33;text-align:center;">
            <span style="font-size:12px;color:#444;">© 2026 KudoSkill · <a href="https://kudo-flow.vercel.app/privacy" style="color:#555;text-decoration:none;">Chính sách bảo mật</a></span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to, name: name || to }],
      subject: 'Đặt lại mật khẩu — KudoSkill',
      htmlContent: html,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Brevo error: ${JSON.stringify(data)}`);
  console.log(`[Mailer] Password reset email sent to ${to} — id: ${data.messageId}`);
}

module.exports = { sendPaymentSuccess, sendPasswordReset };
