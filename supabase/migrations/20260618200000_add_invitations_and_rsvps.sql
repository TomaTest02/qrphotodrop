-- Adăugăm câmpul invitation_details (JSONB) în tabelul events
ALTER TABLE events ADD COLUMN IF NOT EXISTS invitation_details JSONB DEFAULT '{}'::jsonb;

-- Creăm tabelul rsvps
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('attending', 'declined')),
  guests_count INTEGER NOT NULL DEFAULT 1,
  dietary_requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adăugăm RLS (Row Level Security) pe noul tabel rsvps
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Organizatorii pot vedea propriile rsvps
CREATE POLICY "Organizers can view their event rsvps"
ON rsvps FOR SELECT
USING (
  event_id IN (
    SELECT id FROM events WHERE user_id = auth.uid()
  )
);

-- Organizatorii pot șterge rsvps
CREATE POLICY "Organizers can delete their event rsvps"
ON rsvps FOR DELETE
USING (
  event_id IN (
    SELECT id FROM events WHERE user_id = auth.uid()
  )
);

-- Publicul (anonim) poate adăuga (insera) un rsvp (atunci când trimit confirmarea pe site-ul public)
-- Notă: Trebuie să ne asigurăm că oricine poate insera, dar nu și vedea celelalte.
CREATE POLICY "Anyone can insert an rsvp"
ON rsvps FOR INSERT
WITH CHECK (true);
