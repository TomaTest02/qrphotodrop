// Decizie PURĂ pentru tranziția pending→uploading la /api/upload/multipart/sign,
// când cei 3 workeri paraleli intră în cursă pe aceeași sesiune.
//
// `won` = update-ul condiționat `.eq('status','pending')` a prins rândul (acest worker
// a câștigat cursa). Dacă NU l-a prins, recitim sesiunea și decidem după starea ei.
//
// Extras ca funcție pură ca să fie testabilă fără DB (regresie pt. bug-ul 409 fals).
// Prioritatea contează: eroare DB → 500 (NU 409, altfel o eroare tranzitorie la
// recitire ar bloca greșit un upload valid), sesiune dispărută → 404, expirată → 410,
// aborted/failed/completed → 409, uploading → continuă (alt worker a câștigat cursa).
export function classifyResignOutcome({ won, freshError, fresh, now = Date.now() }) {
  if (won) return { ok: true };
  if (freshError) return { ok: false, status: 500, error: 'Server error' };
  if (!fresh) return { ok: false, status: 404, error: 'Session not found' };
  if (fresh.expires_at && new Date(fresh.expires_at).getTime() < now) {
    return { ok: false, status: 410, error: 'Session expired' };
  }
  if (fresh.status !== 'uploading') {
    return { ok: false, status: 409, error: 'Session is no longer active' };
  }
  return { ok: true }; // 'uploading' — cursă normală câștigată de alt worker
}
