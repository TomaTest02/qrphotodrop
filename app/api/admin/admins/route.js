import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Cheile din app_settings (fără coloană nouă în DB)
const MANAGERS_KEY = 'admin_managers'; // CSV de user id-uri (în afară de proprietar)
const OWNER_KEY = 'owner_user_id';     // opțional; altfel = cel mai vechi admin
const NON_ADMIN_ROLE = 'organizer';    // rolul la retragerea dreptului

// Verifică sesiunea + rolul admin. Întoarce { admin, meId } sau { error }.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const admin = createAdminClient();
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { admin, meId: user.id };
}

// Starea curentă: lista de admini + cine e proprietar + cine e manager.
async function roster(admin) {
  const { data: admins } = await admin
    .from('users')
    .select('id, email, status, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true });

  const { data: settings } = await admin
    .from('app_settings')
    .select('key, value')
    .in('key', [MANAGERS_KEY, OWNER_KEY]);

  const map = {};
  (settings || []).forEach((s) => { map[s.key] = s.value; });

  const list = admins || [];
  const ownerId = map[OWNER_KEY] || (list[0]?.id ?? null); // proprietar = setat sau cel mai vechi admin
  const managerIds = new Set((map[MANAGERS_KEY] || '').split(',').map((x) => x.trim()).filter(Boolean));
  if (ownerId) managerIds.add(ownerId);

  return { list, ownerId, managerIds };
}

// Salvează setul de manageri (fără proprietar — el e mereu manager implicit).
async function saveManagers(admin, managerIds, ownerId) {
  const value = [...managerIds].filter((id) => id !== ownerId).join(',');
  await admin.from('app_settings').upsert(
    { key: MANAGERS_KEY, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
}

// Payload comun (folosit la GET și după fiecare mutație).
async function payload(admin, meId) {
  const { list, ownerId, managerIds } = await roster(admin);
  return {
    meId,
    canManage: managerIds.has(meId),
    admins: list.map((a) => ({
      id: a.id,
      email: a.email,
      status: a.status,
      isOwner: a.id === ownerId,
      isManager: managerIds.has(a.id),
      isYou: a.id === meId,
    })),
  };
}

export async function GET() {
  const { admin, meId, error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json(await payload(admin, meId));
}

export async function POST(request) {
  const { admin, meId, error } = await requireAdmin();
  if (error) return error;

  const { action, email, userId, value } = await request.json().catch(() => ({}));
  const { list, ownerId, managerIds } = await roster(admin);

  // Doar managerii (proprietar + desemnați) pot gestiona adminii
  if (!managerIds.has(meId)) {
    return NextResponse.json({ error: 'Doar proprietarul sau managerii pot gestiona adminii.' }, { status: 403 });
  }

  if (action === 'grant') {
    if (!email) return NextResponse.json({ error: 'Email lipsă.' }, { status: 400 });
    const { data: target } = await admin
      .from('users').select('id, role, status').ilike('email', email.trim()).maybeSingle();
    if (!target) return NextResponse.json({ error: 'Nu există un cont cu acest email.' }, { status: 404 });
    if (target.status !== 'active') return NextResponse.json({ error: 'Contul nu este activ — nu poate fi făcut admin.' }, { status: 400 });
    if (target.role === 'admin') return NextResponse.json({ error: 'Acest cont este deja administrator.' }, { status: 409 });
    await admin.from('users').update({ role: 'admin' }).eq('id', target.id);
    console.log(`[admins] ${meId} a făcut admin pe ${target.id}`);
    return NextResponse.json(await payload(admin, meId));
  }

  if (action === 'revoke') {
    if (!userId) return NextResponse.json({ error: 'userId lipsă.' }, { status: 400 });
    if (userId === ownerId) return NextResponse.json({ error: 'Proprietarul nu poate fi retras.' }, { status: 403 });
    if (userId === meId) return NextResponse.json({ error: 'Nu te poți retrage pe tine însuți.' }, { status: 400 });
    if (list.length <= 1) return NextResponse.json({ error: 'Trebuie să rămână cel puțin un administrator.' }, { status: 400 });
    await admin.from('users').update({ role: NON_ADMIN_ROLE }).eq('id', userId);
    // curățăm și din manageri dacă era
    if (managerIds.has(userId)) { managerIds.delete(userId); await saveManagers(admin, managerIds, ownerId); }
    console.log(`[admins] ${meId} a retras adminul lui ${userId}`);
    return NextResponse.json(await payload(admin, meId));
  }

  if (action === 'setManager') {
    if (!userId) return NextResponse.json({ error: 'userId lipsă.' }, { status: 400 });
    if (userId === ownerId) return NextResponse.json({ error: 'Proprietarul este deja manager permanent.' }, { status: 400 });
    if (!list.some((a) => a.id === userId)) return NextResponse.json({ error: 'Utilizatorul nu este administrator.' }, { status: 400 });
    if (value) managerIds.add(userId); else managerIds.delete(userId);
    await saveManagers(admin, managerIds, ownerId);
    console.log(`[admins] ${meId} a setat manager=${!!value} pentru ${userId}`);
    return NextResponse.json(await payload(admin, meId));
  }

  return NextResponse.json({ error: 'Acțiune necunoscută.' }, { status: 400 });
}
