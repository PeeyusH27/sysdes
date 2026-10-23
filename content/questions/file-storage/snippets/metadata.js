// The metadata service for one user's folder tree, in memory. Three ideas:
//   1. A file is a path plus a revision number and an ordered list of chunk hashes. The bytes live elsewhere.
//   2. A commit says "I started from revision N". If the file is no longer at N, someone else changed it: conflict.
//   3. Every accepted change is appended to a journal. Devices ask "what changed since cursor C?", which is idempotent.
export class Namespace {
  files = new Map();             // path -> { rev, chunks: [hash], deleted }
  journal = [];                  // [{ cursor, path, rev, chunks, deleted }], cursor = index + 1
  chunkRefs = new Map();         // chunk hash -> how many file revisions use it (deleted when it reaches 0)

  // Which of these hashes do we not have yet? The client uploads only those.
  unknownChunks(hashes) {
    return hashes.filter((h) => !this.chunkRefs.has(h));
  }

  // All chunks must already be uploaded, or the commit is refused (a file must never point at missing bytes).
  commit({ path, baseRev, chunks, deleted = false }) {
    const cur = this.files.get(path);
    const curRev = cur?.rev ?? 0;
    if (baseRev !== curRev) return { ok: false, conflict: true, currentRev: curRev };
    const unknown = this.unknownChunks(chunks);
    if (unknown.length) return { ok: false, missing: unknown };

    for (const h of chunks) this.chunkRefs.set(h, (this.chunkRefs.get(h) ?? 0) + 1);
    const rev = curRev + 1;
    this.files.set(path, { rev, chunks, deleted });
    this.journal.push({ cursor: this.journal.length + 1, path, rev, chunks, deleted });
    return { ok: true, rev, cursor: this.journal.length };
  }

  // Called by the chunk uploader once a chunk is safely in the block store (before any commit refers to it).
  chunkStored(hash) {
    if (!this.chunkRefs.has(hash)) this.chunkRefs.set(hash, 0);
  }

  changesSince(cursor) {
    return { changes: this.journal.slice(cursor), cursor: this.journal.length };
  }
}

// The loser of a conflict keeps its work under a new name instead of overwriting or being dropped.
export function conflictedCopyName(path, device, isoDate) {
  const dot = path.lastIndexOf('.');
  const stem = dot > path.lastIndexOf('/') ? path.slice(0, dot) : path;
  const ext = dot > path.lastIndexOf('/') ? path.slice(dot) : '';
  return `${stem} (${device}'s conflicted copy ${isoDate})${ext}`;
}
