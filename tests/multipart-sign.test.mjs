import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyResignOutcome } from '../lib/multipartSession.js';

const NOW = 1_000_000_000_000;
const viitor = new Date(NOW + 3600_000).toISOString();
const trecut = new Date(NOW - 1000).toISOString();

// ── Cursa celor 3 workeri pe o sesiune 'pending' ─────────────────────────────

test('workerul care CÂȘTIGĂ cursa (won) → continuă (200)', () => {
  assert.deepEqual(classifyResignOutcome({ won: true }), { ok: true });
});

test('workerii care PIERD cursa recitesc uploading → continuă (200)', () => {
  // update-ul n-a prins pending; recitirea arată uploading (alt worker a câștigat)
  const r = classifyResignOutcome({
    won: false,
    freshError: null,
    fresh: { status: 'uploading', expires_at: viitor },
    now: NOW,
  });
  assert.deepEqual(r, { ok: true });
});

test('regresie: 3 apeluri concurente pe pending → toate 3 „ok" (unul won, doi re-read uploading)', () => {
  const castigator = classifyResignOutcome({ won: true });
  const ratat1 = classifyResignOutcome({ won: false, fresh: { status: 'uploading', expires_at: viitor }, now: NOW });
  const ratat2 = classifyResignOutcome({ won: false, fresh: { status: 'uploading', expires_at: viitor }, now: NOW });
  assert.equal([castigator, ratat1, ratat2].filter((x) => x.ok).length, 3);
});

// ── Cazurile care TREBUIE respinse ───────────────────────────────────────────

test('sesiune ABORTED → 409 (și rămâne aborted — nu reactivăm)', () => {
  const r = classifyResignOutcome({ won: false, fresh: { status: 'aborted', expires_at: viitor }, now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.status, 409);
});

test('sesiune failed / completed → 409', () => {
  for (const status of ['failed', 'completed']) {
    assert.equal(classifyResignOutcome({ won: false, fresh: { status, expires_at: viitor }, now: NOW }).status, 409);
  }
});

test('sesiune EXPIRATĂ → 410', () => {
  const r = classifyResignOutcome({ won: false, fresh: { status: 'uploading', expires_at: trecut }, now: NOW });
  assert.equal(r.status, 410);
});

test('sesiune dispărută → 404', () => {
  assert.equal(classifyResignOutcome({ won: false, fresh: null, now: NOW }).status, 404);
});

test('eroare DB la recitire → 500 (NU 409 — altfel o eroare tranzitorie ar bloca un upload valid)', () => {
  const r = classifyResignOutcome({ won: false, freshError: { message: 'timeout' }, fresh: null, now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.status, 500);
});

test('prioritate: eroarea DB bate orice altceva', () => {
  // chiar dacă fresh ar sugera aborted, o eroare de citire înseamnă că nu știm sigur → 500
  const r = classifyResignOutcome({ won: false, freshError: { message: 'x' }, fresh: { status: 'aborted' }, now: NOW });
  assert.equal(r.status, 500);
});
