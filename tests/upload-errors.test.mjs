import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyUploadError, UPLOAD_ERR, LEGACY_STORAGE_FULL, MESAJE } from '../lib/uploadErrors.js';

const CONEXIUNE = MESAJE[UPLOAD_ERR.NETWORK];

// ─── Cele 5 scenarii cerute ──────────────────────────────────────────────────

test('1. eveniment INACTIV înainte de upload (presigned → 403 EVENT_INACTIVE)', () => {
  const r = classifyUploadError({ status: 403, code: 'EVENT_INACTIVE', message: 'Event is not active' });
  assert.equal(r.kind, UPLOAD_ERR.EVENT_INACTIVE);
  assert.notEqual(r.message, CONEXIUNE, 'NU trebuie să spună „verifică conexiunea"');
  assert.match(r.message, /nu mai primește conținut/i);
});

test('2. eveniment SUSPENDAT în timpul transferului (confirm → 410 EVENT_INACTIVE)', () => {
  // Cazul care se pierdea înainte: `throw new Error("Confirm failed")` ștergea motivul.
  const r = classifyUploadError({ status: 410, code: 'EVENT_INACTIVE', message: 'Event is not active' });
  assert.equal(r.kind, UPLOAD_ERR.EVENT_INACTIVE);
  assert.notEqual(r.message, CONEXIUNE);
});

test('3. MULTIPART >32MB pe eveniment inactiv (create 403 / sign 410 / complete 410)', () => {
  // Înainte: eroarea era doar logată în catch → userul vedea „verifică conexiunea".
  for (const e of [
    { status: 403, code: 'EVENT_INACTIVE', message: 'Event is not active' },        // create
    { status: 410, code: 'EVENT_INACTIVE', message: 'Event is not active' },        // sign
    { status: 410, code: 'EVENT_INACTIVE', message: 'Evenimentul sau sesiunea nu mai este activă.' }, // complete
  ]) {
    const r = classifyUploadError(e);
    assert.equal(r.kind, UPLOAD_ERR.EVENT_INACTIVE);
    assert.notEqual(r.message, CONEXIUNE);
  }
});

test('4. URARE pe eveniment inactiv (wishes → 403/410 EVENT_INACTIVE)', () => {
  for (const status of [403, 410]) {
    const r = classifyUploadError({ status, code: 'EVENT_INACTIVE', message: 'Evenimentul nu mai este activ.' });
    assert.equal(r.kind, UPLOAD_ERR.EVENT_INACTIVE);
  }
});

test('5. eroare REALĂ de rețea → mesajul despre conexiune rămâne justificat', () => {
  // fetch a aruncat (offline / DNS / CORS) → nu avem nici status, nici cod.
  const r = classifyUploadError({ networkFailure: true, message: 'Failed to fetch' });
  assert.equal(r.kind, UPLOAD_ERR.NETWORK);
  assert.equal(r.message, CONEXIUNE);

  // Și fără niciun câmp — tot rețea.
  assert.equal(classifyUploadError({}).kind, UPLOAD_ERR.NETWORK);
  assert.equal(classifyUploadError().kind, UPLOAD_ERR.NETWORK);
});

// ─── Celelalte coduri + robustețe ────────────────────────────────────────────

test('kill-switch global → UPLOADS_PAUSED, nu „conexiune"', () => {
  const r = classifyUploadError({ status: 503, code: 'UPLOADS_PAUSED', message: 'Încărcările sunt momentan în pauză' });
  assert.equal(r.kind, UPLOAD_ERR.UPLOADS_PAUSED);
  assert.notEqual(r.message, CONEXIUNE);
});

test('plafon plin → STORAGE_FULL (și prin codul nou, și prin mesajul vechi)', () => {
  assert.equal(classifyUploadError({ status: 403, code: 'STORAGE_FULL' }).kind, UPLOAD_ERR.STORAGE_FULL);
  // compatibilitate cu răspunsuri fără `code`
  assert.equal(classifyUploadError({ status: 403, message: LEGACY_STORAGE_FULL }).kind, UPLOAD_ERR.STORAGE_FULL);
});

test('codul are prioritate față de status (403 e ambiguu: inactiv SAU plin)', () => {
  assert.equal(classifyUploadError({ status: 403, code: 'STORAGE_FULL' }).kind, UPLOAD_ERR.STORAGE_FULL);
  assert.equal(classifyUploadError({ status: 403, code: 'EVENT_INACTIVE' }).kind, UPLOAD_ERR.EVENT_INACTIVE);
});

test('răspuns vechi fără cod: 410 → inactiv, 503 → pauză (plasă de siguranță)', () => {
  assert.equal(classifyUploadError({ status: 410 }).kind, UPLOAD_ERR.EVENT_INACTIVE);
  assert.equal(classifyUploadError({ status: 503 }).kind, UPLOAD_ERR.UPLOADS_PAUSED);
});

test('eroare necunoscută → arată mesajul serverului, nu inventăm „conexiune"', () => {
  const r = classifyUploadError({ status: 500, message: 'Database error' });
  assert.equal(r.kind, UPLOAD_ERR.OTHER);
  assert.equal(r.message, 'Database error');
});

test('NU clasificăm după textul mesajului (regexul vechi era fragil)', () => {
  // Un mesaj care CONȚINE „not active", dar vine cu status 500 și fără cod,
  // NU trebuie tratat ca eveniment inactiv — decizia se ia după cod/status.
  const r = classifyUploadError({ status: 500, message: 'internal: cache not active' });
  assert.equal(r.kind, UPLOAD_ERR.OTHER);
});
