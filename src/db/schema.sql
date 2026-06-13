-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT UNIQUE NOT NULL,
  name  TEXT NOT NULL
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  category_id UUID REFERENCES categories(id),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Official links per game
CREATE TABLE IF NOT EXISTS game_links (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id  UUID REFERENCES games(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  url      TEXT NOT NULL,
  icon     TEXT
);

-- Redeem codes
CREATE TABLE IF NOT EXISTS codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID REFERENCES games(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  reward     TEXT,
  status     TEXT CHECK (status IN ('new','active','expired')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expired_at TIMESTAMPTZ
);

-- Comments on codes
CREATE TABLE IF NOT EXISTS code_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id    UUID REFERENCES codes(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guide articles
CREATE TABLE IF NOT EXISTS articles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID REFERENCES games(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article sections
CREATE TABLE IF NOT EXISTS article_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  sort_order  INT NOT NULL,
  heading     TEXT,
  body        TEXT,
  image_url   TEXT
);

-- Admin (single user)
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_codes_game_status ON codes(game_id, status);
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category_id);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
