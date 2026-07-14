import { randomBytes } from 'node:crypto';

// 128 biți de entropie. Codurile vechi de 8 caractere rămân valide; doar
// evenimentele nou create primesc tokenul mai greu de ghicit.
export function generateEventCode() {
  return randomBytes(16).toString('base64url');
}

export function isValidEventCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(code);
}

export function isPublicGalleryAvailable(event, galleryEnabled) {
  return event?.status === 'active' && !!event.is_gallery_public && !!galleryEnabled;
}

export function isValidR2MediaKey(key) {
  return typeof key === 'string'
    && /^events\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(photos|videos)\/[^/]+$/i.test(key)
    && !key.includes('..');
}
