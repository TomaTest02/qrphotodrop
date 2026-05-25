import { Resend } from 'resend';

let _resend;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendArchiveReady(email, downloadUrl) {
  return getResend().emails.send({
    from: 'QRPhotoDrop <noreply@qrphotodrop.ro>',
    to: email,
    subject: 'Arhiva ta este gata! 🎉',
    html: `
      <h2>Arhiva evenimentului tău este gata!</h2>
      <p>Poți descărca toate pozele, clipurile și urările folosind linkul de mai jos.</p>
      <p><strong>Linkul este valabil 7 zile.</strong></p>
      <a href="${downloadUrl}" style="background:#2d1b69;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
        Descarcă Arhiva
      </a>
    `,
  });
}

export async function sendOTP(email, tempPassword) {
  return getResend().emails.send({
    from: 'QRPhotoDrop <noreply@qrphotodrop.ro>',
    to: email,
    subject: 'Parolă temporară QRPhotoDrop',
    html: `
      <h2>Parolă temporară</h2>
      <p>Parola ta temporară este: <strong>${tempPassword}</strong></p>
      <p>La prima autentificare vei fi rugat să schimbi această parolă.</p>
    `,
  });
}

export async function sendAdminNotification(subject, body) {
  return getResend().emails.send({
    from: 'QRPhotoDrop <noreply@qrphotodrop.ro>',
    to: process.env.ADMIN_EMAIL,
    subject,
    html: body,
  });
}

export async function sendContactForm({ firstName, lastName, email, phone, eventType, message }) {
  return getResend().emails.send({
    from: 'QRPhotoDrop <noreply@qrphotodrop.ro>',
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
