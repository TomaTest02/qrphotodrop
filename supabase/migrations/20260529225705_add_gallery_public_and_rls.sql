-- Adaugare coloana pentru a controla daca galeria este publica
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_gallery_public BOOLEAN DEFAULT false;

-- RLS: Permite oricui (inclusiv anonim) sa citeasca pozele daca evenimentul asociat are galeria publica
CREATE POLICY "Anyone can view public event uploads"
  ON public.uploads FOR SELECT
  USING (
    event_id IN (SELECT id FROM public.events WHERE is_gallery_public = true)
  );
