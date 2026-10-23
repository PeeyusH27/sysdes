function serialize(root) {
  // Level order, one token per node, "#" for every missing child: "1,2,3,#,#,4,5,#,#,#,#".
  const tokens = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node === null) {
      tokens.push("#");
      continue;
    }
    tokens.push(String(node.val));
    queue.push(node.left ?? null, node.right ?? null);
  }
  return tokens.join(",");
}

function deserialize(data) {
  const tokens = data.split(",");
  if (tokens[0] === "#") return null;
  const root = new TreeNode(Number(tokens[0]));
  const queue = [root];
  let i = 1;
  for (let head = 0; head < queue.length; head++) {
    const parent = queue[head];
    // The next two tokens are this parent's left and right child.
    if (tokens[i] !== "#") queue.push((parent.left = new TreeNode(Number(tokens[i]))));
    i++;
    if (tokens[i] !== "#") queue.push((parent.right = new TreeNode(Number(tokens[i]))));
    i++;
  }
  return root;
}

function roundTrip(root) {
  const text = serialize(root);
  return [text, deserialize(text)];
}
