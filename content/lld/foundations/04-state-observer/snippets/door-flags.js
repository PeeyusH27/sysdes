// Two flags describe four doors. Only three of them exist, and nothing stops the fourth.
export class Door {
  isOpen = false;
  isLocked = false;

  open() { if (!this.isLocked) this.isOpen = true; }
  close() { this.isOpen = false; }
  lock() { this.isLocked = true; }      // forgot: an open door must not lock
  unlock() { this.isLocked = false; }
}
