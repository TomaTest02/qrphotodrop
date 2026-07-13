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

test('transformă erorile de finalizare în răspunsuri HTTP stabile', () => {
  assert.deepEqual(uploadFinalizeError({ message: 'STORAGE_LIMIT_EXCEEDED' }), {
    status: 403,
    message: 'Storage limit exceeded for this event',
  });
  assert.equal(uploadFinalizeError({ message: 'EVENT_NOT_ACTIVE' }).status, 410);
  assert.equal(uploadFinalizeError({ message: 'unexpected' }).status, 500);
});
