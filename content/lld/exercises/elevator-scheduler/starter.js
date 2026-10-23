class ElevatorController {
  /** @param {number} floors  @param {number} start  @param {"look"|"fcfs"} policy */
  constructor(floors, start, policy) {
    
  }

  /** @param {number} floor  @param {"up"|"down"} dir  @return {boolean} true if it is a new, valid pending call */
  hallCall(floor, dir) {
    
  }

  /** @return {boolean} true if it is a new, valid pending call */
  carCall(floor) {
    
  }

  /** Advance one step. @return {string} "IDLE@f", "UP@f", "DOWN@f" or "OPEN@f" */
  tick() {
    
  }

  /** @return {string} the status from the last tick */
  state() {
    
  }

  /** @return {Array<[number, string]>} pending [floor, kind] pairs sorted by floor then kind */
  pending() {
    
  }
}
