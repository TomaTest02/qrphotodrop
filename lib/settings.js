import { createAdminClient } from '@/lib/supabase/admin';

// ─── Setări globale (tabelul app_settings, perechi key/value string) ──────────
// O SINGURĂ sursă de adevăr pentru chei + valori implicite. Cheile care nu
// există încă în DB folosesc automat valoarea implicită de mai jos.
export const SETTINGS_DEFAULTS = {
  public_gallery_enabled: 'true',
  uploads_paused: 'false',
  max_photo_mb: '20',
  max_video_mb: '1536',
  max_photos_per_upload: '20',
  max_videos_per_upload: '2',
  retention_months_intim: '1',
  retention_months_complet: '2',
  retention_months_vis: '3',
  storage_alert_gb: '9',
};

// Chei booleene (stocate ca 'true'/'false')
export const BOOL_KEYS = ['public_gallery_enabled', 'uploads_paused'];

// Chei numerice + limite sanity [min, max] pentru validare la scriere
export const NUMERIC_BOUNDS = {
  max_photo_mb: [1, 200],
  max_video_mb: [1, 5120],
  max_photos_per_upload: [1, 500],
  max_videos_per_upload: [1, 100],
  retention_months_intim: [0, 60],
  retention_months_complet: [0, 60],
  retention_months_vis: [0, 60],
  storage_alert_gb: [1, 10000],
};

// Citește toate setările, cu fallback la valorile implicite. Un singur query.
export async function getSettings(admin) {
  const client = admin || createAdminClient();
  const { data } = await client.from('app_settings').select('key, value');
  const map = { ...SETTINGS_DEFAULTS };
  (data || []).forEach((r) => { if (r.key in map) map[r.key] = r.value; });
  return map;
}

// ─── Helperi de citire tipată ─────────────────────────────────────────────────
export function num(map, key) {
  const v = Number(map[key]);
  return Number.isFinite(v) ? v : Number(SETTINGS_DEFAULTS[key]);
}
export function bool(map, key) {
  return map[key] === 'true';
}
export function uploadsPaused(map) {
  return map.uploads_paused === 'true';
}
// Mărimea maximă (bytes) pentru un fișier, în funcție de tip.
export function maxBytesFor(map, isVideo) {
  return num(map, isVideo ? 'max_video_mb' : 'max_photo_mb') * 1024 * 1024;
}
