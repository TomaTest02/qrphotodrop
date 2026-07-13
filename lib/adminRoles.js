import { createAdminClient } from '@/lib/supabase/admin';

// Sursă unică pentru „cine e proprietar / manager" între TOATE rutele admin.
// NOTĂ: momentan citit din app_settings; Lotul 2 (P4) mută asta într-un tabel
// privat cu RLS. Fiind un singur loc, migrarea se face doar aici.
const MANAGERS_KEY = 'admin_managers'; // CSV de user id-uri (în afară de proprietar)
const OWNER_KEY = 'owner_user_id';     // opțional; altfel = cel mai vechi admin

// Starea rolurilor: lista adminilor + proprietarul + setul de manageri.
export async function getAdminRoster(adminClient) {
  const client = adminClient || createAdminClient();
  const { data: admins } = await client
    .from('users')
    .select('id, email, status, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true });

  const { data: settings } = await client
    .from('app_settings')
    .select('key, value')
    .in('key', [MANAGERS_KEY, OWNER_KEY]);

  const map = {};
  (settings || []).forEach((s) => { map[s.key] = s.value; });

  const list = admins || [];
  const ownerId = map[OWNER_KEY] || (list[0]?.id ?? null); // proprietar = setat sau cel mai vechi admin
  const managerIds = new Set((map[MANAGERS_KEY] || '').split(',').map((x) => x.trim()).filter(Boolean));
  if (ownerId) managerIds.add(ownerId);

  return { admins: list, ownerId, managerIds };
}

export { MANAGERS_KEY, OWNER_KEY };

// Gardă server-side pentru orice acțiune asupra unui cont-țintă.
// Întoarce `null` dacă e permis, sau { status, error } dacă trebuie blocat.
// `destructive` = ștergere / suspendare / demitere / resetare parolă.
// Regulă: dacă ținta NU e admin → permis (munca normală de admin).
// Dacă ținta E admin → doar owner/manager; proprietarul e intangibil pentru alții;
// la acțiuni destructive: fără auto-acțiune, proprietarul niciodată, minim 1 admin.
export function guardAdminTarget({ actorId, targetId, roster, destructive = false }) {
  const { admins, ownerId, managerIds } = roster;
  const targetIsAdmin = admins.some((a) => a.id === targetId);
  if (!targetIsAdmin) return null; // țintă obișnuită → permis

  if (!managerIds.has(actorId)) {
    return { status: 403, error: 'Doar proprietarul sau managerii pot modifica un alt administrator.' };
  }
  if (targetId === ownerId && actorId !== ownerId) {
    return { status: 403, error: 'Proprietarul nu poate fi modificat de alt administrator.' };
  }
  if (destructive) {
    if (targetId === ownerId) {
      return { status: 403, error: 'Proprietarul nu poate fi șters, suspendat sau demis.' };
    }
    if (targetId === actorId) {
      return { status: 400, error: 'Nu poți efectua această acțiune asupra propriului cont de administrator.' };
    }
    if (admins.length <= 1) {
      return { status: 400, error: 'Trebuie să rămână permanent cel puțin un administrator.' };
    }
  }
  return null;
}
