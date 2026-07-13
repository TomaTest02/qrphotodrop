import {
  abortMultipartUpload,
  deleteByPrefix,
  isNoSuchUploadError,
  prefixIsEmpty,
} from '@/lib/r2';

export async function cleanUserStorage(admin, userId, logLabel) {
  const { data: events, error: eventsError } = await admin
    .from('events')
    .select('id')
    .eq('user_id', userId);

  if (eventsError) throw new Error(`events query failed: ${eventsError.message}`);

  const eventIds = (events || []).map((event) => event.id);
  if (!eventIds.length) return [];

  // Oprește mai întâi toate scrierile. Update-ul ia același row lock pe care îl
  // folosesc RPC-urile de finalizare, deci nu poate apărea un upload după cleanup.
  const { error: statusError } = await admin
    .from('events')
    .update({ status: 'inactive' })
    .in('id', eventIds);
  if (statusError) throw new Error(`event lock failed: ${statusError.message}`);

  const { data: sessions, error: sessionsError } = await admin
    .from('multipart_sessions')
    .select('id, r2_key, upload_id')
    .in('event_id', eventIds)
    .in('status', ['pending', 'uploading']);
  if (sessionsError) throw new Error(`multipart query failed: ${sessionsError.message}`);

  for (const session of sessions || []) {
    try {
      await abortMultipartUpload(session.r2_key, session.upload_id);
    } catch (error) {
      if (!isNoSuchUploadError(error)) throw error;
    }

    const { error: updateError } = await admin
      .from('multipart_sessions')
      .update({ status: 'aborted' })
      .eq('id', session.id);
    if (updateError) throw new Error(`multipart status failed: ${updateError.message}`);
  }

  const prefixes = eventIds.flatMap((id) => [`events/${id}/`, `archives/${id}/`]);
  for (const prefix of prefixes) await deleteByPrefix(prefix);

  for (const prefix of prefixes) {
    if (!(await prefixIsEmpty(prefix))) {
      throw new Error(`${logLabel}: prefix not empty after cleanup: ${prefix}`);
    }
  }

  return eventIds;
}

export async function scheduleStorageRecheck(admin, userId, eventIds) {
  if (!eventIds.length) return;

  // Un URL single-PUT deja emis nu poate fi revocat. Recontrolăm după expirarea
  // tuturor URL-urilor presemnate, chiar dacă între timp contul și evenimentele dispar.
  const notBefore = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from('storage_deletion_jobs').upsert({
    user_id: userId,
    event_ids: eventIds,
    not_before: notBefore,
    attempts: 0,
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) throw new Error(`storage recheck scheduling failed: ${error.message}`);
}

export async function processDueStorageRechecks(admin) {
  const { data: jobs, error: jobsError } = await admin
    .from('storage_deletion_jobs')
    .select('id, event_ids, attempts')
    .lte('not_before', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(50);
  if (jobsError) throw new Error(`storage recheck query failed: ${jobsError.message}`);

  let completed = 0;
  let failed = 0;
  for (const job of jobs || []) {
    try {
      const prefixes = job.event_ids.flatMap((id) => [`events/${id}/`, `archives/${id}/`]);
      for (const prefix of prefixes) await deleteByPrefix(prefix);
      for (const prefix of prefixes) {
        if (!(await prefixIsEmpty(prefix))) throw new Error(`prefix not empty: ${prefix}`);
      }

      const { error: deleteError } = await admin
        .from('storage_deletion_jobs')
        .delete()
        .eq('id', job.id);
      if (deleteError) throw new Error(`job delete failed: ${deleteError.message}`);
      completed++;
    } catch (error) {
      failed++;
      console.error('storage deletion recheck failed', job.id, error);
      await admin.from('storage_deletion_jobs').update({
        attempts: (job.attempts || 0) + 1,
        last_error: String(error?.message || error).slice(0, 1000),
        updated_at: new Date().toISOString(),
      }).eq('id', job.id);
    }
  }

  return { completed, failed };
}
