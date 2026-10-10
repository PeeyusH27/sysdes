-- token-bucket.lua · KEYS[1] = bucket key · ARGV[1] = tokens per second · ARGV[2] = capacity
local rate = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
local t = redis.call('TIME')                                      -- Redis's clock: no skew between app servers
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local s = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(s[1]) or cap
local ts = tonumber(s[2]) or now
tokens = math.min(cap, tokens + math.max(0, now - ts) * rate / 1000)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000))      -- an idle bucket is full again by then, so drop it
local retry = 0
if allowed == 0 then retry = math.ceil((1 - tokens) / rate * 1000) end
return { allowed, math.floor(tokens), retry }
