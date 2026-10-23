// @display-only: needs a file watcher, the network and a block store
// The desktop client's loop: notice a change, chunk it, upload only what the server lacks, then commit.
import { fixedChunks } from './chunker.js';
import { conflictedCopyName } from './metadata.js';

export async function pushFile({ api, path, bytes, baseRev, device }) {
  const chunks = await fixedChunks(bytes);                              // 1. name every chunk by its hash
  const need = await api.unknownChunks(chunks.map((c) => c.hash));      // 2. ask which ones the server lacks
  for (const c of chunks.filter((x) => need.includes(x.hash))) {
    await api.putChunk(c.hash, bytes.subarray(c.start, c.start + c.length));   // 3. upload only those (resumable per chunk)
  }
  const res = await api.commit({ path, baseRev, chunks: chunks.map((c) => c.hash) });   // 4. point the file at the new chunks
  if (res.conflict) {
    // Someone else committed first. Keep both: ours goes to a new name, theirs stays in place.
    const copy = conflictedCopyName(path, device, new Date().toISOString().slice(0, 10));
    return api.commit({ path: copy, baseRev: 0, chunks: chunks.map((c) => c.hash) });
  }
  return res;
}

// Other devices: wake on a notification, then ask for everything after the last cursor we applied.
export async function pull({ api, state, applyChange }) {
  const { changes, cursor } = await api.changesSince(state.cursor);
  for (const ch of changes) await applyChange(ch);                      // download missing chunks, rebuild the file
  state.cursor = cursor;                                                // saved only after the changes are applied
}
