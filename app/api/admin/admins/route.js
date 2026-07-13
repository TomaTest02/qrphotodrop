import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getAdminRoster, guardAdminTarget, MANAGERS_KEY } from '@/lib/adminRoles';

const NON_ADMIN_ROLE = 'organizer'; // rolul la retragerea dreptului

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

// Salvează setul de manageri (fără proprietar — el e mereu manager implicit).
async function saveManagers(admin, managerIds, ownerId) {
  const value = [...managerIds].filter((id) => id !== ownerId).join(',');
  const { error } = await admin.from('app_settings').upsert(
    { key: MANAGERS_KEY, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  return error;
}

// Payload comun (folosit la GET și după fiecare mutație).
async function payload(admin, meId) {
  const { admins, ownerId, managerIds } = await getAdminRoster(admin);
  return {
    meId,
    canManage: managerIds.has(meId),
    admins: admins.map((a) => ({
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
  const roster = await getAdminRoster(admin);
  const { admins, ownerId, managerIds } = roster;

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
    const { error: upErr } = await admin.from('users').update({ role: 'admin' }).eq('id', target.id);
    if (upErr) { console.error('grant admin error:', upErr); return NextResponse.json({ error: 'Eroare la salvare.' }, { status: 500 }); }
    console.log(`[admins] ${meId} a făcut admin pe ${target.id}`);
    return NextResponse.json(await payload(admin, meId));
  }

  if (action === 'revoke') {
    if (!userId) return NextResponse.json({ error: 'userId lipsă.' }, { status: 400 });
    // Gardă comună: proprietar intangibil, fără auto-demitere, minim 1 admin
    const block = guardAdminTarget({ actorId: meId, targetId: userId, roster, destructive: true });
    if (block) return NextResponse.json({ error: block.error }, { status: block.status });
    const { error: upErr } = await admin.from('users').update({ role: NON_ADMIN_ROLE }).eq('id', userId);
    if (upErr) { console.error('revoke admin error:', upErr); return NextResponse.json({ error: 'Eroare la salvare.' }, { status: 500 }); }
    // curățăm și din manageri dacă era
    if (managerIds.has(userId)) {
      managerIds.delete(userId);
      const mErr = await saveManagers(admin, managerIds, ownerId);
      if (mErr) { console.error('revoke manager cleanup error:', mErr); return NextResponse.json({ error: 'Eroare la salvare.' }, { status: 500 }); }
    }
    console.log(`[admins] ${meId} a retras adminul lui ${userId}`);
    return NextResponse.json(await payload(admin, meId));
  }

  if (action === 'setManager') {
    if (!userId) return NextResponse.json({ error: 'userId lipsă.' }, { status: 400 });
    if (userId === ownerId) return NextResponse.json({ error: 'Proprietarul este deja manager permanent.' }, { status: 400 });
    if (!admins.some((a) => a.id === userId)) return NextResponse.json({ error: 'Utilizatorul nu este administrator.' }, { status: 400 });
    if (value) managerIds.add(userId); else managerIds.delete(userId);
    const mErr = await saveManagers(admin, managerIds, ownerId);
    if (mErr) { console.error('setManager error:', mErr); return NextResponse.json({ error: 'Eroare la salvare.' }, { status: 500 }); }
    console.log(`[admins] ${meId} a setat manager=${!!value} pentru ${userId}`);
    return NextResponse.json(await payload(admin, meId));
  }

  return NextResponse.json({ error: 'Acțiune necunoscută.' }, { status: 400 });
}
