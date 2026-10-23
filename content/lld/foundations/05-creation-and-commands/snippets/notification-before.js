// The same switch, pasted wherever the channel matters.
export function send(channel, to, text) {
  switch (channel) {
    case 'email': return `email to ${to}: ${text}`;
    case 'sms': return `sms to ${to}: ${text.slice(0, 160)}`;
    default: throw new Error(`unknown channel: ${channel}`);
  }
}

export function costInCents(channel) {
  switch (channel) {
    case 'email': return 0;
    case 'sms': return 4;
    default: throw new Error(`unknown channel: ${channel}`);
  }
}
// Adding 'push' means finding every switch like these, in every file, and editing each one.
