-- ─────────────────────────────────────────────────────────────────────────────
-- „Un cont = un eveniment" — impus în BAZA DE DATE, nu doar în cod.
--
-- Codul presupunea deja regula asta (foloseşte .single() pe events în dashboard,
-- contul meu, arhivă etc.), dar nu exista nicio constrângere în DB. Două cereri
-- concurente de creare puteau trece amândouă de verificarea din aplicaţie şi
-- insera două evenimente → toate apelurile .single() ar fi început să crape.
--
-- Verificat înainte în producţie: 3 evenimente / 3 useri distincţi → zero duplicate,
-- deci indexul se poate crea fără să eşueze.
--
-- DB e ultima linie de apărare: la o cursă, a doua inserare primeşte 23505, iar
-- ruta o traduce în HTTP 409.
-- ─────────────────────────────────────────────────────────────────────────────

create unique index if not exists events_user_id_unique
  on public.events (user_id);
