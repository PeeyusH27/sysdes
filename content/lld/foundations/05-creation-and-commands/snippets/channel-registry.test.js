import { test, expect } from 'vitest';
import { defaultChannels } from './channel-registry.js';

test('creates a channel from its name', () => {
  const channels = defaultChannels();
  expect(channels.create('email').send('ann@x.com', 'hi')).toBe('email to ann@x.com: hi');
  expect(channels.create('sms').costInCents).toBe(4);
  expect(channels.create('email').costInCents).toBe(0);
});

test('sms truncates to 160 characters', () => {
  const out = defaultChannels().create('sms').send('+1555', 'x'.repeat(200));
  expect(out).toBe(`sms to +1555: ${'x'.repeat(160)}`);
});

test('an unknown kind fails loudly, in one place', () => {
  expect(() => defaultChannels().create('fax')).toThrow('unknown channel: fax');
});

test('a new kind is registered without editing any existing class', () => {
  const channels = defaultChannels().register('push', () => ({
    send: (to, text) => `push to ${to}: ${text}`,
    costInCents: 0,
  }));
  expect(channels.create('push').send('device-7', 'hi')).toBe('push to device-7: hi');
});
