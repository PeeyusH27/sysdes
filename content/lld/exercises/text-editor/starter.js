class Editor {
  constructor() {
    
  }

  /** Append `text`. @return {number} how many characters were typed (0 for an empty string, which is not recorded) */
  type(text) {
    
  }

  /** Remove up to `count` characters from the end. @return {number} how many were removed (0 means nothing happened and nothing is recorded) */
  delete(count) {
    
  }

  /** Reverse the latest recorded action. @return {boolean} true if something was undone */
  undo() {
    
  }

  /** Re-apply the latest undone action. @return {boolean} true if something was redone */
  redo() {
    
  }

  /** @return {string} the current text */
  text() {
    
  }

  /** @return {boolean} whether undo() would do something */
  canUndo() {
    
  }

  /** @return {boolean} whether redo() would do something */
  canRedo() {
    
  }

  /** Open a group: everything until the matching endGroup() becomes one undo step. Groups nest. */
  beginGroup() {
    
  }

  /** Close the innermost open group. @return {boolean} false if no group is open */
  endGroup() {
    
  }
}
