-- hold-seats.lua: Redis front-line hold for several seats at once.
-- KEYS are seat keys sharing a hash tag, e.g. {show:42}:A5, so Redis Cluster keeps them in one slot.
-- ARGV[1] = userId · ARGV[2] = ttl in ms
for _, k in ipairs(KEYS) do
  if redis.call('EXISTS', k) == 1 then return 0 end
end
for _, k in ipairs(KEYS) do
  redis.call('SET', k, ARGV[1], 'PX', ARGV[2])
end
return 1
