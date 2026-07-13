// Clasificarea erorilor de upload/urare — DUPĂ COD STABIL, nu după textul mesajului.
//
// De ce: mesajele sunt în română/engleză și se pot reformula oricând. Un regex pe ele
// se strică tăcut. Serverul trimite un `code` stabil, iar clientul decide după el.
// Statusul HTTP e doar plasă de siguranță pentru răspunsuri fără cod.

export const UPLOAD_ERR = {
  EVENT_INACTIVE: 'EVENT_INACTIVE', // eveniment suspendat / oprit / expirat
  UPLOADS_PAUSED: 'UPLOADS_PAUSED', // kill-switch global din admin
  STORAGE_FULL: 'STORAGE_FULL',     // plafonul evenimentului e plin
  NETWORK: 'NETWORK',               // chiar a picat rețeaua
  OTHER: 'OTHER',
};

// Mesaj vechi, păstrat pentru compatibilitate cu răspunsuri fără `code`.
export const LEGACY_STORAGE_FULL = 'Storage limit exceeded for this event';

export const MESAJE = {
  [UPLOAD_ERR.EVENT_INACTIVE]: 'Acest eveniment nu mai primește conținut. Încărcarea a fost oprită de organizator.',
  [UPLOAD_ERR.UPLOADS_PAUSED]: 'Încărcările sunt momentan în pauză. Te rugăm încearcă puțin mai târziu.',
  [UPLOAD_ERR.STORAGE_FULL]: 'Spațiul de stocare al evenimentului s-a umplut.',
  [UPLOAD_ERR.NETWORK]: 'Verifică conexiunea și încearcă din nou.',
};

/**
 * @param {object} e
 * @param {number} [e.status]  status HTTP (lipsește dacă fetch-ul însuși a eșuat)
 * @param {string} [e.code]    codul stabil trimis de server
 * @param {string} [e.message] mesajul serverului (folosit doar ca text de rezervă)
 * @param {boolean} [e.networkFailure] fetch-ul a aruncat (offline, DNS, CORS)
 * @returns {{kind: string, message: string}}
 */
export function classifyUploadError({ status, code, message, networkFailure = false } = {}) {
  // 1. Rețea căzută → mesajul despre conexiune E justificat aici (și doar aici).
  if (networkFailure || (!status && !code)) {
    return { kind: UPLOAD_ERR.NETWORK, message: MESAJE[UPLOAD_ERR.NETWORK] };
  }

  // 2. Codul stabil are ÎNTOTDEAUNA prioritate.
  if (code && MESAJE[code]) {
    return { kind: code, message: MESAJE[code] };
  }

  // 3. Compatibilitate: răspunsuri vechi, fără `code`.
  if (message === LEGACY_STORAGE_FULL) {
    return { kind: UPLOAD_ERR.STORAGE_FULL, message: MESAJE[UPLOAD_ERR.STORAGE_FULL] };
  }
  if (status === 410) {
    return { kind: UPLOAD_ERR.EVENT_INACTIVE, message: MESAJE[UPLOAD_ERR.EVENT_INACTIVE] };
  }
  if (status === 503) {
    return { kind: UPLOAD_ERR.UPLOADS_PAUSED, message: MESAJE[UPLOAD_ERR.UPLOADS_PAUSED] };
  }

  // 4. Orice altceva: arătăm mesajul serverului, dacă a trimis unul.
  return { kind: UPLOAD_ERR.OTHER, message: message || 'A apărut o eroare. Încearcă din nou.' };
}

// Transformă un Response eșuat într-un Error care poartă `status` + `code`,
// ca eroarea să poată fi clasificată corect oriunde e prinsă (inclusiv în multipart).
export async function errorFromResponse(res) {
  const body = await res.json().catch(() => ({}));
  const err = new Error(body.error || `HTTP ${res.status}`);
  err.status = res.status;
  err.code = body.code;
  return err;
}
