-- Adaugare permisiune INSERT pentru tabela events
-- Organizatorii trebuie sa poata crea evenimente din dashboard (pana acum aveau doar SELECT si UPDATE)
CREATE POLICY "Organizers can insert own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
