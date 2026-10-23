/** @param {TreeNode} root @return {string} a string that deserialize can turn back into the tree */
function serialize(root) {
  
}

/** @param {string} data @return {TreeNode} the root of the rebuilt tree (null for an empty tree) */
function deserialize(data) {
  
}

// The tests call this one. Keep it as is.
function roundTrip(root) {
  const text = serialize(root);
  return [text, deserialize(text)];
}
