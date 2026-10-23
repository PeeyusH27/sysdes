export class EmailBuilder {
  #to = [];
  #cc = [];
  #subject = '';
  #body = '';

  to(address) { this.#to.push(address); return this; }
  cc(address) { this.#cc.push(address); return this; }
  subject(text) { this.#subject = text; return this; }
  body(text) { this.#body = text; return this; }

  // Every rule about a valid combination lives here. The result is frozen, and
  // it holds copies, so changing the builder later cannot change an email already built.
  build() {
    if (this.#to.length === 0) throw new Error('an email needs a recipient');
    if (this.#subject === '') throw new Error('an email needs a subject');
    return Object.freeze({
      to: Object.freeze([...this.#to]),
      cc: Object.freeze([...this.#cc]),
      subject: this.#subject,
      body: this.#body,
    });
  }
}
