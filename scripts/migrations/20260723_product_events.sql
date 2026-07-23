CREATE TABLE IF NOT EXISTS product_events (
  event_id UUID PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id UUID,
  session_id UUID,
  event_type VARCHAR(64) NOT NULL,
  path VARCHAR(255) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(200),
  utm_content VARCHAR(200),
  utm_term VARCHAR(200),
  referrer VARCHAR(500),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS product_events_occurred_at_idx
  ON product_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS product_events_event_type_occurred_at_idx
  ON product_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS product_events_anonymous_id_occurred_at_idx
  ON product_events (anonymous_id, occurred_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_events_session_id_idx
  ON product_events (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_events_user_id_occurred_at_idx
  ON product_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_events_campaign_occurred_at_idx
  ON product_events (utm_source, utm_medium, utm_campaign, occurred_at DESC);
