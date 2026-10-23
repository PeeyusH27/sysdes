class Email {
  send(to, text) { return `email to ${to}: ${text}`; }
  get costInCents() { return 0; }
}

class Sms {
  send(to, text) { return `sms to ${to}: ${text.slice(0, 160)}`; }
  get costInCents() { return 4; }
}

// The one place that knows which kinds exist. A new kind is one register() call.
export class ChannelRegistry {
  #makers = new Map();

  register(kind, make) {
    this.#makers.set(kind, make);
    return this;
  }

  create(kind) {
    const make = this.#makers.get(kind);
    if (!make) throw new Error(`unknown channel: ${kind}`);
    return make();
  }
}

export const defaultChannels = () =>
  new ChannelRegistry().register('email', () => new Email()).register('sms', () => new Sms());
