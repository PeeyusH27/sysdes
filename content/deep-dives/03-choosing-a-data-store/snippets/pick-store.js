// Walk the chooser with numbers. These thresholds are rules of thumb, not laws: measure your own workload.
export const LIMITS = {
  writesPerSec: 10_000,        // sustained writes one Postgres primary handles comfortably
  scanRows: 100_000_000,       // scans this big should not share a machine with checkout
  searchDocs: 1_000_000,       // below this, Postgres full-text search is often enough
  fileBytes: 1_000_000,        // files above about 1 MB belong in object storage
};

export function pickStore(w) {
  if (w.fileBytes >= LIMITS.fileBytes) return { store: 'object storage', why: 'blobs bloat a database and its backups' };
  if (w.transactions) {
    return w.writesPerSec > LIMITS.writesPerSec
      ? { store: 'sharded postgres', why: 'transactions needed, but one primary is too small' }
      : { store: 'postgres', why: 'transactions, constraints and joins' };
  }
  if (w.textSearch) {
    return w.docs >= LIMITS.searchDocs || w.typos
      ? { store: 'search engine', why: 'relevance, typo tolerance and facets' }
      : { store: 'postgres', why: 'full-text search is enough at this size' };
  }
  if (w.scanRows >= LIMITS.scanRows) return { store: 'columnar', why: 'big scans stay off the transactional database' };
  if (w.writesPerSec > LIMITS.writesPerSec) {
    return w.timeOrdered
      ? { store: 'wide-column', why: 'huge append rate, read by entity in time order' }
      : { store: 'key-value', why: 'huge rate, access always by key' };
  }
  return { store: 'postgres', why: 'nothing here crosses a line' };
}
