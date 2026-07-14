import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateEventCode,
  isPublicGalleryAvailable,
  isValidEventCode,
  isValidR2MediaKey,
} from '../lib/securityGuards.js';

test('codurile noi au 128 biți, format URL-safe și sunt acceptate împreună cu cele vechi', () => {
  const codes = Array.from({ length: 100 }, () => generateEventCode());
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) {
    assert.equal(Buffer.from(code, 'base64url').length, 16);
    assert.equal(isValidEventCode(code), true);
  }
  assert.equal(isValidEventCode('A1B2C3D4'), true);
  assert.equal(isValidEventCode('../secret'), false);
  assert.equal(isValidEventCode('abc'), false);
});

test('galeria publică cere simultan eveniment activ, flag per eveniment și flag global', () => {
  assert.equal(isPublicGalleryAvailable({ status: 'active', is_gallery_public: true }, true), true);
  assert.equal(isPublicGalleryAvailable({ status: 'inactive', is_gallery_public: true }, true), false);
  assert.equal(isPublicGalleryAvailable({ status: 'expired', is_gallery_public: true }, true), false);
  assert.equal(isPublicGalleryAvailable({ status: 'active', is_gallery_public: false }, true), false);
  assert.equal(isPublicGalleryAvailable({ status: 'active', is_gallery_public: true }, false), false);
});

test('cheia R2 media cere UUID complet și un singur nume de fișier', () => {
  assert.equal(isValidR2MediaKey('events/550e8400-e29b-41d4-a716-446655440000/photos/a.jpg'), true);
  assert.equal(isValidR2MediaKey('events/550e8400-e29b-41d4-a716-446655440000/videos/a.mp4'), true);
  assert.equal(isValidR2MediaKey('events/not-a-uuid/photos/a.jpg'), false);
  assert.equal(isValidR2MediaKey('events/550e8400-e29b-41d4-a716-446655440000/photos/a/b.jpg'), false);
  assert.equal(isValidR2MediaKey('events/550e8400-e29b-41d4-a716-446655440000/photos/../secret'), false);
});
