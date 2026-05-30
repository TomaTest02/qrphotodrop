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
    if (uploadIds.length > 500) {
      return NextResponse.json({ error: 'Prea multe fișiere per request' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verificam ca toate uploadurile apartin unui eveniment al userului autentificat
    const { data: uploads, error: fetchError } = await admin
      .from('uploads')
      .select('id, r2_key, event_id')
      .in('id', uploadIds);

    if (fetchError || !uploads) {
      return NextResponse.json({ error: 'Eroare la citirea uploadurilor' }, { status: 500 });
    }

    // Verificam proprietatea: toate uploadurile trebuie sa fie din evenimentul userului
    const { data: userEvent } = await admin
      .from('events')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!userEvent) {
      return NextResponse.json({ error: 'Nu ai un eveniment activ' }, { status: 403 });
    }

    const unauthorized = uploads.filter(u => u.event_id !== userEvent.id);
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: 'Nu ai permisiunea să ștergi aceste fișiere' }, { status: 403 });
    }

    // Stergem din R2
    const r2Errors = [];
    for (const upload of uploads) {
      try {
        await deleteObject(upload.r2_key);
      } catch (err) {
        console.error(`Failed to delete R2 object ${upload.r2_key}:`, err.message);
        r2Errors.push(upload.r2_key);
      }
    }

    // Stergem din baza de date (chiar daca R2 a esuat partial)
    const { error: deleteError } = await admin
      .from('uploads')
      .delete()
      .in('id', uploadIds);

    if (deleteError) {
      return NextResponse.json({ error: 'Eroare la ștergerea din baza de date' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: uploads.length,
      r2Errors: r2Errors.length > 0 ? r2Errors : undefined,
    });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Eroare neașteptată' }, { status: 500 });
  }
}
