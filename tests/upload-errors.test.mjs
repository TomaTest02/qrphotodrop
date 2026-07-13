import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyUploadError, alegeEroareaRelevanta, esteBlocanta,
  UPLOAD_ERR, LEGACY_STORAGE_FULL, MESAJE,
} from '../lib/uploadErrors.js';

const CONEXIUNE = MESAJE[UPLOAD_ERR.NETWORK];
const cls = (o) => classifyUploadError(o);
const RETEA = cls({ networkFailure: true });
const INACTIV = cls({ status: 403, code: 'EVENT_INACTIVE' });
const PAUZA = cls({ status: 503, code: 'UPLOADS_PAUSED' });
const PLIN = cls({ status: 403, code: 'STORAGE_FULL' });
const ALTA = cls({ status: 500, message: 'Database error' });

// ─── PRIORITATE (bug-ul raportat: „prima eroare câștigă" era GREȘIT) ─────────

test('BUG: R2 pică (NETWORK), apoi fallback-ul zice EVENT_INACTIVE → câștigă INACTIV', () => {
  // Exact scenariul din raport: prima eroare era NETWORK, iar motivul adevărat
  // (EVENT_INACTIVE, venit ulterior de la /api/upload/direct) era ignorat.
  let retinuta = null;
  retinuta = alegeEroareaRelevanta(retinuta, RETEA);    // 1. PUT către R2 eșuează
  retinuta = alegeEroareaRelevanta(retinuta, INACTIV);  // 2. fallback: eveniment inactiv

  assert.equal(retinuta.kind, UPLOAD_ERR.EVENT_INACTIVE, 'motivul REAL trebuie să câștige');
  assert.notEqual(retinuta.message, CONEXIUNE, 'NU mai apare „verifică conexiunea"');
});

test('ordinea inversă dă același rezultat (INACTIV nu e înlocuit de NETWORK)', () => {
  let r = null;
  r = alegeEroareaRelevanta(r, INACTIV);
  r = alegeEroareaRelevanta(r, RETEA);
  assert.equal(r.kind, UPLOAD_ERR.EVENT_INACTIVE);
});

test('motivele definitive bat NETWORK și OTHER', () => {
  assert.equal(alegeEroareaRelevanta(RETEA, INACTIV).kind, UPLOAD_ERR.EVENT_INACTIVE);
  assert.equal(alegeEroareaRelevanta(RETEA, PAUZA).kind, UPLOAD_ERR.UPLOADS_PAUSED);
  assert.equal(alegeEroareaRelevanta(RETEA, PLIN).kind, UPLOAD_ERR.STORAGE_FULL);
  assert.equal(alegeEroareaRelevanta(ALTA, INACTIV).kind, UPLOAD_ERR.EVENT_INACTIVE);
  // …iar NETWORK/OTHER nu pot detrona un motiv definitiv
  assert.equal(alegeEroareaRelevanta(INACTIV, RETEA).kind, UPLOAD_ERR.EVENT_INACTIVE);
  assert.equal(alegeEroareaRelevanta(PAUZA, ALTA).kind, UPLOAD_ERR.UPLOADS_PAUSED);
});

test('între motive definitive: INACTIV > PAUZĂ > PLIN', () => {
  assert.equal(alegeEroareaRelevanta(PAUZA, INACTIV).kind, UPLOAD_ERR.EVENT_INACTIVE);
  assert.equal(alegeEroareaRelevanta(PLIN, PAUZA).kind, UPLOAD_ERR.UPLOADS_PAUSED);
});

test('la egalitate păstrăm prima (determinist)', () => {
  const a = cls({ status: 500, message: 'prima' });
  const b = cls({ status: 500, message: 'a doua' });
  assert.equal(alegeEroareaRelevanta(a, b).message, 'prima');
});

test('esteBlocanta: reîncercarea are rost doar dacă NU e inactiv/pauză', () => {
  assert.equal(esteBlocanta(INACTIV), true);
  assert.equal(esteBlocanta(PAUZA), true);
  assert.equal(esteBlocanta(RETEA), false);   // rețeaua se poate reface → merită retry
  assert.equal(esteBlocanta(PLIN), false);    // are ecran dedicat (limitReached)
  assert.equal(esteBlocanta(null), false);
});

test('BUG: succes PARȚIAL cu eveniment închis nu mai zice „încearcă din nou"', () => {
  // Fișierul 1 urcă OK, evenimentul e suspendat, fișierul 2 primește EVENT_INACTIVE.
  // Ramura succeeded > 0 trebuie să folosească mesajul REAL, nu „încearcă din nou".
  let r = null;
  r = alegeEroareaRelevanta(r, INACTIV);
  assert.equal(esteBlocanta(r), true, 'ramura de succes parțial trebuie să știe că e blocant');
  assert.match(r.message, /nu mai primește conținut/i);
});

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
