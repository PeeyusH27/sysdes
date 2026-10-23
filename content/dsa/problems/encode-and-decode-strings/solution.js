function encode(strs) {
  // length, a marker, then the raw text: "4#lint4#code"
  return strs.map((s) => `${s.length}#${s}`).join("");
}

function decode(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const hash = s.indexOf("#", i); // the first # after position i always ends the length digits
    const len = Number(s.slice(i, hash));
    out.push(s.slice(hash + 1, hash + 1 + len)); // take exactly len characters, whatever they are
    i = hash + 1 + len;
  }
  return out;
}

function roundTrip(strs) {
  const encoded = encode(strs);
  return [encoded, decode(encoded)];
}
