-- Bestätigung: Lagerunterlagen wurden gedruckt (Pipeline-Schritt vor „Zusammengepackt“)
ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS packing_docs_printed_at TIMESTAMPTZ;
