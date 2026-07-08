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

// Șablon simplu, cu brand (folosit de toate emailurile către clienți)
function shell(title, bodyHtml) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2d2c4a">
    <div style="text-align:center;margin-bottom:20px">
      <span style="font-size:20px;font-weight:700;color:#710927">QRPhotoDrop</span>
    </div>
    <div style="background:#fff;border:1px solid #eee;border-radius:14px;padding:28px">
      <h2 style="margin:0 0 12px;font-size:20px;color:#2d2c4a">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:16px">QRPhotoDrop · amintirile evenimentului tău</p>
  </div>`;
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
      <p style="text-align:center;margin:24px 0">
        <a href="${loginUrl}" style="background:#710927;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600">Intră în cont</a>
      </p>
      <p style="color:#666;font-size:14px">Din cont poți descărca codul QR și cartonașul pentru invitați. Orice întrebare, răspunde la acest email.</p>
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
      <p style="font-size:22px;font-weight:700;letter-spacing:1px;background:#f5f2f8;border-radius:8px;padding:12px 16px;text-align:center;color:#2d2c4a">${tempPassword}</p>
      <p style="color:#666;font-size:14px">La prima autentificare vei fi rugat să schimbi această parolă.</p>
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
      <p style="text-align:center;margin:24px 0">
        <a href="${downloadUrl}" style="background:#710927;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600">Descarcă arhiva</a>
      </p>
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
