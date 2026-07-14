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

// Acceptă exclusiv obiecte de pe originea R2 configurată. Domeniul aplicației nu
// este permis, deci ruta nu se poate apela recursiv și nu este un proxy generic.
export function parseR2ProxyTarget(target, publicBase) {
  if (!target || !publicBase) return null;

  try {
    const parsed = new URL(target);
    const base = new URL(publicBase);
    if (parsed.protocol !== 'https:' || parsed.origin !== base.origin) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;

    const basePath = base.pathname.replace(/\/$/, '');
    const expectedPrefix = `${basePath}/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) return null;

    const r2Key = decodeURIComponent(parsed.pathname.slice(expectedPrefix.length));
    if (!r2Key || r2Key.includes('..') || !/^events\/[0-9a-f-]{36}\/(photos|videos)\//i.test(r2Key)) {
      return null;
    }

    return { url: parsed.toString(), r2Key };
  } catch {
    return null;
  }
}
