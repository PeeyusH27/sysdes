-- allocate.sql: many gates on many servers. Postgres picks and locks one free spot atomically.
UPDATE spots SET ticket_id = $1, taken_at = now()
WHERE id = (
  SELECT id FROM spots
  WHERE lot_id = $2 AND type = ANY($3) AND ticket_id IS NULL
  ORDER BY array_position($3, type), floor, id      -- smallest fitting type, then lowest floor
  LIMIT 1
  FOR UPDATE SKIP LOCKED                            -- concurrent gates skip rows another gate is locking
)
RETURNING id, floor;
