import { test, expect } from 'vitest';
import { EmailBuilder } from './email-builder.js';

test('builds an email step by step', () => {
  const email = new EmailBuilder().to('ann@x.com').cc('bob@x.com').subject('Lunch').body('12:30?').build();
  expect(email).toEqual({ to: ['ann@x.com'], cc: ['bob@x.com'], subject: 'Lunch', body: '12:30?' });
});

test('an invalid combination never becomes an object', () => {
  expect(() => new EmailBuilder().subject('Hi').build()).toThrow('an email needs a recipient');
  expect(() => new EmailBuilder().to('ann@x.com').build()).toThrow('an email needs a subject');
});

test('a built email is frozen and independent of the builder', () => {
  const builder = new EmailBuilder().to('ann@x.com').subject('Hi');
  const first = builder.build();
  builder.to('bob@x.com');
  expect(first.to).toEqual(['ann@x.com']);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.to)).toBe(true);
  expect(builder.build().to).toEqual(['ann@x.com', 'bob@x.com']);
});
