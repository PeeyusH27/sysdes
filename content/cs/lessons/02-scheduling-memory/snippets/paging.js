export const PAGE_SIZE = 4096;

export class PageFault extends Error {
  constructor(vpn) {
    super(`page fault on page ${vpn}`);
    this.vpn = vpn;
  }
}

// A virtual address is (page number, offset). The TLB remembers a few recent page -> frame answers.
export class Mmu {
  constructor(pageTable, tlbSize = 2) {
    this.pageTable = pageTable; // Map: page number -> frame number
    this.tlbSize = tlbSize;
    this.tlb = new Map(); // insertion order = least recently used first
    this.stats = { tlbHits: 0, walks: 0, faults: 0 };
  }

  translate(vaddr) {
    const vpn = Math.floor(vaddr / PAGE_SIZE);
    const offset = vaddr % PAGE_SIZE;
    let frame = this.tlb.get(vpn);
    if (frame !== undefined) {
      this.stats.tlbHits += 1;
      this.tlb.delete(vpn); // re-insert below to mark it most recent
    } else {
      this.stats.walks += 1; // TLB miss: walk the page table in memory
      frame = this.pageTable.get(vpn);
      if (frame === undefined) {
        this.stats.faults += 1; // not mapped: the kernel must step in
        throw new PageFault(vpn);
      }
      if (this.tlb.size >= this.tlbSize) this.tlb.delete(this.tlb.keys().next().value);
    }
    this.tlb.set(vpn, frame);
    return frame * PAGE_SIZE + offset;
  }
}
