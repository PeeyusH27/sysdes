// The Instagram-lite worked example as code: every number on the page comes from here
const SECONDS_PER_DAY = 86_400;

export function instagramLite({
  dau = 100e6, uploaderShare = 0.1, photosPerUploader = 2, photoBytes = 500_000,
  viewsPerUser = 10, thumbsPerView = 10, thumbBytes = 50_000, peakFactor = 3,
} = {}) {
  const uploadsPerDay = dau * uploaderShare * photosPerUploader;           // 20M photos a day
  const uploadQps = uploadsPerDay / SECONDS_PER_DAY;
  const mediaPerDayTB = (uploadsPerDay * photoBytes) / 1e12;
  const feedQps = (dau * viewsPerUser) / SECONDS_PER_DAY;                  // 1B feed views a day
  const egressBytesPerSec = feedQps * thumbsPerView * thumbBytes;          // each view loads 10 thumbnails
  return {
    uploadQps: Math.round(uploadQps),
    peakUploadQps: Math.round(uploadQps * peakFactor),
    mediaPerDayTB,
    mediaPerYearPB: (mediaPerDayTB * 365) / 1_000,
    feedQps: Math.round(feedQps),
    peakFeedQps: Math.round(feedQps * peakFactor),
    egressGBps: +(egressBytesPerSec / 1e9).toFixed(1),
    egressGbps: Math.round((egressBytesPerSec * 8) / 1e9),              // network links are sold in bits
  };
}

// instagramLite()
// → { uploadQps: 231, peakUploadQps: 694, mediaPerDayTB: 10, mediaPerYearPB: 3.65,
//     feedQps: 11574, peakFeedQps: 34722, egressGBps: 5.8, egressGbps: 46 }
