-- Backend-Benutzer für E-Mail/Passwort-Login
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('VIEWER', 'EDITOR', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- Initialer Admin (Passwort-Hash, kein Klartext)
INSERT INTO users (email, password, name, role)
VALUES (
  'bp@wirkung-digital.de',
  'scrypt:18d172c05e3160040d513a78c37067d5:bc79c0c44a51fe763760d9a573415499c00714abf45bfa16d967b6569b1a8a6cd9c42711d74f8d3442b32230983437f916870b342ed7291c93d1785cde89f1f4',
  'Administrator',
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;
