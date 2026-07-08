import { Resend } from 'resend';

let _resend;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// Adresa de expeditor — doar o etichetă pe domeniul verificat (NU e nevoie de inbox real)
const FROM = process.env.RESEND_FROM || 'QRPhotoDrop <noreply@qrphotodrop.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://qrphotodrop.com';
// Dacă un client dă „Reply" la emailurile automate, răspunsul ajunge aici (Gmail-ul admin)
const REPLY_TO = process.env.RESEND_REPLY_TO || process.env.ADMIN_EMAIL;
const replyTo = REPLY_TO ? { replyTo: REPLY_TO } : {};

// Șablon elegant, în stilul site-ului (crem + bordo + auriu, serif) — folosit de toate emailurile
function shell(title, bodyHtml) {
  return `
  <div style="background:#faf7f2;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;margin:0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
      <tr><td style="text-align:center;padding-bottom:18px">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#710927;letter-spacing:0.5px">QRPhotoDrop</div>
        <div style="color:#b58c4f;font-size:15px;margin-top:6px;letter-spacing:3px">— ♥ —</div>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #f0e7db;border-radius:16px;padding:36px 32px">
        <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:23px;color:#710927;font-weight:normal">${title}</h1>
        <div style="color:#2d2c4a;font-size:15px;line-height:1.7">${bodyHtml}</div>
      </td></tr>
      <tr><td style="text-align:center;padding-top:20px;color:#7a789a;font-size:12px;line-height:1.7">
        <div style="color:#b58c4f;font-size:14px;margin-bottom:6px;letter-spacing:3px">— ♥ —</div>
        QRPhotoDrop · amintirile evenimentului tău<br>
        <a href="https://qrphotodrop.com" style="color:#b58c4f;text-decoration:none">qrphotodrop.com</a>
      </td></tr>
    </table>
  </div>`;
}

// Buton CTA în stilul brandului (bordo)
function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto"><tr><td style="border-radius:10px;background:#710927">
    <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif">${label}</a>
  </td></tr></table>`;
}

export async function sendAccountApproved(email) {
  const loginUrl = `${APP_URL}/login`;
  return getResend().emails.send({
    from: FROM,
    to: email,
    ...replyTo,
    subject: 'Contul tău QRPhotoDrop a fost aprobat! 🎉',
    html: shell('Contul tău a fost aprobat!', `
      <p>Salut! Contul tău QRPhotoDrop este acum <strong>activ</strong>. Te poți autentifica și configura evenimentul.</p>
      ${button(loginUrl, 'Intră în cont')}
      <p style="color:#7a789a;font-size:14px">Din cont poți descărca codul QR și cartonașul pentru invitați. Orice întrebare, răspunde la acest email.</p>
    `),
  });
}

export async function sendOTP(email, tempPassword) {
  return getResend().emails.send({
    from: FROM,
    to: email,
    ...replyTo,
    subject: 'Parolă temporară QRPhotoDrop',
    html: shell('Parolă temporară', `
      <p>Parola ta temporară este:</p>
      <p style="font-size:22px;font-weight:700;letter-spacing:2px;background:#faf7f2;border:1px solid #d9c3a6;border-radius:10px;padding:14px 16px;text-align:center;color:#710927">${tempPassword}</p>
      <p style="color:#7a789a;font-size:14px">La prima autentificare vei fi rugat să schimbi această parolă.</p>
    `),
  });
}

export async function sendArchiveReady(email, downloadUrl) {
  return getResend().emails.send({
    from: FROM,
    to: email,
    ...replyTo,
    subject: 'Arhiva ta este gata! 🎉',
    html: shell('Arhiva evenimentului tău este gata!', `
      <p>Poți descărca toate pozele, clipurile și urările folosind butonul de mai jos.</p>
      <p><strong>Linkul este valabil 7 zile.</strong></p>
      ${button(downloadUrl, 'Descarcă arhiva')}
    `),
  });
}

export async function sendAdminNotification(subject, body) {
  return getResend().emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject,
    html: body,
  });
}

export async function sendContactForm({ firstName, lastName, email, phone, eventType, message }) {
  return getResend().emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `Mesaj Contact — ${firstName} ${lastName}`,
    html: `
      <h2>Mesaj nou de contact</h2>
      <p><strong>Nume:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Telefon:</strong> ${phone || 'N/A'}</p>
      <p><strong>Tip eveniment:</strong> ${eventType}</p>
      <hr />
      <p>${message}</p>
    `,
  });
}
