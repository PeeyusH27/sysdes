// HLS playlists are plain text. The master playlist lists the renditions; each rendition has a media playlist listing its segments.
// The player downloads the master once, then switches between renditions at segment boundaries.
const RESOLUTION = { '240p': '426x240', '360p': '640x360', '480p': '854x480', '720p': '1280x720', '1080p': '1920x1080' };

export function masterPlaylist(videoId, ladder) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const r of ladder) {
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${r.bps},RESOLUTION=${RESOLUTION[r.label]}`);
    lines.push(`${r.label}/index.m3u8`);
  }
  return lines.join('\n') + '\n';
}

export function mediaPlaylist(durationS, segmentS = 4) {
  const count = Math.ceil(durationS / segmentS);
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', `#EXT-X-TARGETDURATION:${segmentS}`, '#EXT-X-PLAYLIST-TYPE:VOD'];
  for (let i = 0; i < count; i++) {
    const len = Math.min(segmentS, durationS - i * segmentS);
    lines.push(`#EXTINF:${len.toFixed(3)},`, `seg_${String(i).padStart(5, '0')}.m4s`);
  }
  lines.push('#EXT-X-ENDLIST');
  return lines.join('\n') + '\n';
}
