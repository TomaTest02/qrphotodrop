-- Împiedică rânduri duplicate dacă endpointul `complete` e apelat de două ori.
-- r2_key e un UUID unic per upload, deci nu afectează datele existente.
CREATE UNIQUE INDEX IF NOT EXISTS uploads_r2_key_unique ON public.uploads (r2_key);
