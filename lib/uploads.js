export async function finalizeUploadRecord(client, {
  eventId,
  r2Key,
  publicUrl,
  fileType,
  sizeBytes,
  originalName,
  multipartSessionId = null,
}) {
  const { data, error } = await client
    .rpc('finalize_upload_atomic', {
      p_event_id: eventId,
      p_r2_key: r2Key,
      p_public_url: publicUrl,
      p_file_type: fileType,
      p_size_bytes: sizeBytes,
      p_original_name: originalName,
      p_multipart_session_id: multipartSessionId,
    })
    .single();

  return { upload: data, error };
}

// Traduce excepția RPC-ului într-un răspuns HTTP + un COD STABIL pentru client.
// Clientul decide după `code`, nu după textul mesajului (care se poate reformula).
export function uploadFinalizeError(error) {
  const message = error?.message || '';

  if (message.includes('STORAGE_LIMIT_EXCEEDED')) {
    return { status: 403, message: 'Storage limit exceeded for this event', code: 'STORAGE_FULL' };
  }
  if (message.includes('EVENT_NOT_ACTIVE') || message.includes('MULTIPART_SESSION_NOT_ACTIVE')) {
    return { status: 410, message: 'Evenimentul sau sesiunea nu mai este activă.', code: 'EVENT_INACTIVE' };
  }
  if (message.includes('EVENT_NOT_FOUND')) {
    return { status: 404, message: 'Event not found' };
  }

  return { status: 500, message: 'Database error' };
}
