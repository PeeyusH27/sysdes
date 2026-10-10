// @display-only: needs a message queue client (`queue`) and an Elasticsearch client (`es`)
// Producer: publish the change after the database commit (better still, the outbox or CDC, so it can't be lost)
export async function onProductSaved({ id, name, price, version }) {
  await queue.publish('product.updated', { id, name, price, version });
}

// Indexer: consumes the topic and upserts the search document. Replays and out-of-order events are safe:
// with external versioning, Elasticsearch rejects any version not newer than the one it already has.
export async function indexProduct({ id, name, price, version }) {
  try {
    await es.index({ index: 'products', id, document: { name, price }, version, version_type: 'external' });
  } catch (err) {
    if (err.meta?.statusCode !== 409) throw err;    // 409 = already have this or a newer version: skip
  }
}
