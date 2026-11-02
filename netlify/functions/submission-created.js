// Runs automatically on Netlify every time the "order" form is submitted.
// It emails the customer a thank you for ordering, from your Gmail account.
// The Gmail address and app password come from Netlify environment variables,
// so they are never written in this file or in your website.

const nodemailer = require('nodemailer');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, max);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || {};
    if (payload.form_name !== 'order') return { statusCode: 200, body: 'Ignored: not the order form' };

    const d = payload.data || {};
    if (d['bot-field']) return { statusCode: 200, body: 'Ignored: spam' };

    const to = clean(d.email, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { statusCode: 200, body: 'Ignored: no valid email address' };

    const user = process.env.GMAIL_USER;
    const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
    if (!user || !pass) {
      console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD in Netlify environment variables.');
      return { statusCode: 200, body: 'Not configured' };
    }

    const name = clean(d.first_name, 60) || clean(d.last_name, 60) || 'there';
    const order = String(d.order || '').replace(/\r/g, '').slice(0, 4000);

    const text =
`Hi ${name},

Thank you for ordering from 3D Hub!

We have received your order and will contact you on the phone number you gave to confirm it.

Your order
----------
${order}

If anything looks wrong, just reply to this email.

3D Hub
Dubai, United Arab Emirates
`;

    const html =
`<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0b1510;line-height:1.5">
  <h1 style="font-size:22px;margin:0 0 12px;color:#02261A">Thank you for ordering!</h1>
  <p>Hi ${esc(name)},</p>
  <p>Thank you for ordering from 3D Hub. We have received your order and will contact you on the phone number you gave to confirm it.</p>
  <h2 style="font-size:16px;margin:24px 0 8px;color:#02261A">Your order</h2>
  <pre style="font-family:inherit;white-space:pre-wrap;background:#f1ede3;padding:12px;border-radius:8px;margin:0">${esc(order)}</pre>
  <p style="margin-top:24px">If anything looks wrong, just reply to this email.</p>
  <p style="color:#5a5648">3D Hub<br>Dubai, United Arab Emirates</p>
</div>`;

    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transporter.sendMail({
      from: `"3D Hub" <${user}>`,
      to,
      replyTo: user,
      subject: 'Thank you for your order from 3D Hub',
      text,
      html,
    });
    return { statusCode: 200, body: 'Confirmation email sent' };
  } catch (err) {
    // Never fail the order because the email failed.
    console.error('Confirmation email failed:', err && err.message);
    return { statusCode: 200, body: 'Email failed (order was still received)' };
  }
};
