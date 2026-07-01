-- Mesaj WhatsApp personalizabil de către organizator (folosit la butonul "Trimite pe WhatsApp")
-- Dacă e NULL, se folosește textul implicit din aplicație.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;
