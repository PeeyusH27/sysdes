/** @param {string[]} strs @return {string} one string that decode can turn back into strs */
function encode(strs) {
  
}

/** @param {string} s @return {string[]} the original list */
function decode(s) {
  
}

// The tests call this one. Keep it as is.
function roundTrip(strs) {
  const encoded = encode(strs);
  return [encoded, decode(encoded)];
}
