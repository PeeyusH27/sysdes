function floodFill(image, sr, sc, color) {
  const original = image[sr][sc];
  if (original === color) return image; // nothing would change, and the fill would never stop
  const rows = image.length;
  const cols = image[0].length;

  function fill(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return; // off the image
    if (image[r][c] !== original) return;                  // another colour, or already filled
    image[r][c] = color;                                   // recolouring doubles as the visited mark
    fill(r + 1, c);
    fill(r - 1, c);
    fill(r, c + 1);
    fill(r, c - 1);
  }

  fill(sr, sc);
  return image;
}
