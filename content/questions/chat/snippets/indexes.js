// @display-only: needs a MongoDB database handle (db)
await db.messages.createIndex({ conversationId: 1, seq: -1 });             // history pages and sync
await db.messages.createIndex({ from: 1, clientId: 1 }, { unique: true });  // retries can't duplicate a message
await db.members.createIndex({ conversationId: 1, userId: 1 }, { unique: true });   // { lastReadSeq: 0, … }
await db.members.createIndex({ userId: 1 });                                 // "my conversations"
