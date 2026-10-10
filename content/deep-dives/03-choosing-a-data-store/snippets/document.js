// @display-only: needs a MongoDB database handle (`db`)
// Embed bounded children that are read together: an order and its line items are one document
await db.collection('orders').insertOne({
  userId, status: 'paid',
  items: [{ sku: 'a1', qty: 2, price: 499 }],   // embedded line items
  total: 998,
});

// Reference unbounded children: a product can collect millions of reviews, far past the 16 MB document limit
await db.collection('reviews').insertOne({ productId, userId, stars: 5, text, createdAt: new Date() });
await db.collection('reviews').createIndex({ productId: 1, createdAt: -1 });   // "latest reviews for a product"
