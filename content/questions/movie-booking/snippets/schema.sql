CREATE TABLE seats (
  show_id    bigint NOT NULL,
  seat_no    text   NOT NULL,
  status     text   NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'held', 'booked')),
  held_by    bigint,
  held_until timestamptz,
  booking_id bigint,
  PRIMARY KEY (show_id, seat_no)
);
CREATE INDEX seats_expiring ON seats (held_until) WHERE status = 'held';   -- keeps the sweeper cheap

CREATE TABLE bookings (
  id         bigserial PRIMARY KEY,
  user_id    bigint NOT NULL,
  show_id    bigint NOT NULL,
  seats      text[] NOT NULL,
  payment_id text   NOT NULL UNIQUE,                                     -- a retried webhook can't book twice
  status     text   NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
