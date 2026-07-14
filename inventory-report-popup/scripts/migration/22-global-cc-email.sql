-- Globale CC-Adresse für alle ausgehenden E-Mails (Admin-konfigurierbar)

INSERT INTO system_settings (key, value, description)
VALUES (
  'global_cc_email',
  '',
  'CC-Adresse für alle ausgehenden E-Mails (leer = deaktiviert)'
)
ON CONFLICT (key) DO NOTHING;
