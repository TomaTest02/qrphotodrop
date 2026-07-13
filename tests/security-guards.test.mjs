import assert from 'node:assert/strict';
import test from 'node:test';

import { assertDeletablePrefix } from '../lib/r2.js';
import { uploadFinalizeError } from '../lib/uploads.js';

test('acceptă doar prefixe de eveniment/arhivă cu UUID complet', () => {
  assert.doesNotThrow(() => {
    assertDeletablePrefix('events/550e8400-e29b-41d4-a716-446655440000/');
    assertDeletablePrefix('archives/550e8400-e29b-41d4-a716-446655440000/');
  });

  for (const prefix of [
    '',
    'events/',
    'events/550e8400-e29b-41d4-a716-446655440000',
    'events/../',
    'other/550e8400-e29b-41d4-a716-446655440000/',
  ]) {
    assert.throws(() => assertDeletablePrefix(prefix));
  }
});

test('transformă erorile de finalizare în răspunsuri HTTP + COD STABIL', () => {
  // Codul e contractul cu clientul — el decide după `code`, nu după textul mesajului.
  assert.deepEqual(uploadFinalizeError({ message: 'STORAGE_LIMIT_EXCEEDED' }), {
    status: 403,
    message: 'Storage limit exceeded for this event',
    code: 'STORAGE_FULL',
  });

  const inactiv = uploadFinalizeError({ message: 'EVENT_NOT_ACTIVE' });
  assert.equal(inactiv.status, 410);
  assert.equal(inactiv.code, 'EVENT_INACTIVE');

  const sesiune = uploadFinalizeError({ message: 'MULTIPART_SESSION_NOT_ACTIVE' });
  assert.equal(sesiune.status, 410);
  assert.equal(sesiune.code, 'EVENT_INACTIVE');

  assert.equal(uploadFinalizeError({ message: 'unexpected' }).status, 500);
});
