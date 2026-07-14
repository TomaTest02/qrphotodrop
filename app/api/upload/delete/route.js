import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { deleteObject } from '@/lib/r2';

export async function DELETE(request) {
  try {
    // Verificam autentificarea
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    }

    const { uploadIds } = await request.json();
    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({ error: 'Lista de ID-uri este goală' }, { status: 400 });
    }

    // Limita de siguranta: max 500 fisiere per request
    const uniqueIds = [...new Set(uploadIds)];
    if (uniqueIds.length > 500 || uniqueIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'Prea multe fișiere per request' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verificam ca toate uploadurile apartin unui eveniment al userului autentificat
    const { data: uploads, error: fetchError } = await admin
      .from('uploads')
      .select('id, r2_key, event_id')
      .in('id', uniqueIds);

    if (fetchError || !uploads) {
      return NextResponse.json({ error: 'Eroare la citirea uploadurilor' }, { status: 500 });
    }

    if (uploads.length !== uniqueIds.length) {
      return NextResponse.json({ error: 'Unul sau mai multe fișiere nu există' }, { status: 404 });
    }

    // Verificăm proprietatea pentru fiecare eveniment, fără presupunerea „un user = un singur rând".
    const eventIds = [...new Set(uploads.map((upload) => upload.event_id))];
    const { data: userEvents, error: eventsError } = await admin
      .from('events')
      .select('id')
      .in('id', eventIds)
      .eq('user_id', user.id);

    if (eventsError) {
      return NextResponse.json({ error: 'Eroare la verificarea proprietății' }, { status: 500 });
    }
    const ownedIds = new Set((userEvents || []).map((event) => event.id));
    if (eventIds.some((id) => !ownedIds.has(id))) {
      return NextResponse.json({ error: 'Nu ai permisiunea să ștergi aceste fișiere' }, { status: 403 });
    }

    // Ștergem rândul DB NUMAI după ce obiectul lui a fost șters din R2. La eșec,
    // rândul rămâne vizibil și operația poate fi reîncercată fără obiecte orfane.
    const deletedIds = [];
    const failedIds = [];
    for (const upload of uploads) {
      try {
        await deleteObject(upload.r2_key);
        deletedIds.push(upload.id);
      } catch (err) {
        console.error(`Failed to delete R2 object ${upload.r2_key}:`, err.message);
        failedIds.push(upload.id);
      }
    }

    if (deletedIds.length) {
      const { error: deleteError } = await admin
        .from('uploads')
        .delete()
        .in('id', deletedIds);
      if (deleteError) {
        return NextResponse.json({ error: 'Eroare la ștergerea din baza de date' }, { status: 500 });
      }
    }

    const complete = failedIds.length === 0;
    return NextResponse.json({
      success: complete,
      deleted: deletedIds.length,
      deletedIds,
      failedIds,
      error: complete ? undefined : 'Unele fișiere nu au putut fi șterse din stocare. Reîncearcă.',
    }, { status: complete ? 200 : 502 });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Eroare neașteptată' }, { status: 500 });
  }
}
