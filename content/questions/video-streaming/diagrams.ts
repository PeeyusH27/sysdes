import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "video-streaming-architecture",
  title: "Video streaming architecture",
  description:
    "Uploads go in chunks straight to object storage. An event queues a transcoding job that cuts the video into short segments and encodes each one at five qualities in parallel. Viewers fetch a playlist from the metadata API, then pull segments from a CDN, which asks the video store only on a miss.",
  nodes: [
    { id: "uploader", label: "Uploader app", kind: "client", col: 0, row: 0, sub: "resumable" },
    { id: "upload", label: "Upload API", kind: "service", col: 1, row: 0, sub: "sessions + URLs", note: "Creates the video row and an upload session, and hands out chunk URLs. The bytes go to object storage, not through these servers." },
    { id: "raw", label: "Raw store", kind: "storage", col: 2, row: 0, sub: "original files" },
    { id: "xcode", label: "Transcoders", kind: "worker", col: 4, row: 0, sub: "~8,700 cores", note: "Stateless workers. Each takes one task: encode segment N of video V at quality Q. Same input, same output path, so a task can safely run twice." },
    { id: "vstore", label: "Video store", kind: "storage", col: 5, row: 0, sub: "segments + playlists", note: "Object storage holding every encoded segment and the HLS playlists. Segment files never change, so they can be cached for a very long time." },
    { id: "meta", label: "Metadata API", kind: "service", col: 1, row: 1, sub: "titles, status" },
    { id: "db", label: "Metadata DB", kind: "database", col: 2, row: 1, sub: "sharded by video" },
    { id: "queue", label: "Job queue", kind: "queue", col: 3, row: 1, sub: "one job per video" },
    { id: "viewer", label: "Viewer app", kind: "client", col: 0, row: 2, sub: "adaptive player" },
    { id: "cdn", label: "CDN edge", kind: "cdn", col: 3, row: 2, sub: "~95% hit rate", note: "Serves nearly all traffic from servers near the viewer. About 5% of requests miss and go back to the video store." },
  ],
  edges: [
    { from: "uploader", to: "upload", label: "init, chunks" },
    { from: "upload", to: "raw", label: "put chunks" },
    { from: "upload", to: "db", label: "row" },
    { from: "raw", to: "queue", label: "uploaded", style: "async" },
    { from: "queue", to: "xcode", label: "job", style: "async" },
    { from: "raw", to: "xcode", label: "read source" },
    { from: "xcode", to: "vstore", label: "segments" },
    { from: "xcode", to: "db", label: "READY" },
    { from: "viewer", to: "meta", label: "watch page" },
    { from: "meta", to: "db", label: "lookup" },
    { from: "viewer", to: "cdn", label: "playlist, segments" },
    { from: "cdn", to: "vstore", label: "miss" },
  ],
  scenarios: [
    {
      id: "upload",
      name: "Upload and process",
      steps: [
        { edge: "uploader>upload", caption: "The app starts an upload: size 500 MiB, type video/mp4. The API creates the video row and an upload session." },
        { edge: "upload>db", caption: "The row starts in status UPLOADING. The viewer pages will refuse it until it is READY." },
        { edge: "uploader>upload", caption: "The app sends 8 MiB chunks. 500 MiB is 63 chunks, each sent to the raw store with a signed URL." },
        { edge: "upload>raw", caption: "The raw store holds the original file. The API servers never hold the video bytes in memory.", mark: [{ node: "raw", state: "ok" }] },
        { edge: "raw>queue", caption: "When the last chunk lands, an 'object created' event queues one job for the video." },
        { edge: "queue>xcode", caption: "A coordinator splits the job into 750 encode tasks: 150 four-second segments at 5 qualities." },
        { edge: "raw>xcode", caption: "Many transcoders read the source at once, each cutting its own piece." },
        { edge: "xcode>vstore", caption: "Each task writes a segment to a path that depends only on the video, quality and index. Then one task writes the playlists.", mark: [{ node: "vstore", state: "ok" }] },
        { edge: "xcode>db", tone: "ok", caption: "The row flips to READY. With this much parallelism a 10 minute video is ready in minutes, not hours.", mark: [{ node: "db", state: "ok" }] },
      ],
    },
    {
      id: "watch",
      name: "Watch a video",
      steps: [
        { edge: "viewer>meta", caption: "The viewer opens the watch page. The metadata API checks the video is READY." },
        { edge: "meta>db", caption: "One lookup by video id: title, owner, duration, playlist URL." },
        { edge: "meta>db", reverse: true, caption: "The page gets the master playlist URL on the CDN." },
        { edge: "viewer>cdn", caption: "The player fetches the master playlist, then the first segments at a low quality for a fast start." },
        { edge: "cdn>vstore", tone: "miss", caption: "First request for this video in this region: a miss. The edge asks the video store.", mark: [{ node: "cdn", state: "miss" }] },
        { edge: "cdn>vstore", reverse: true, caption: "The segment comes back and is cached. It will not change, so it can stay cached for a long time." },
        { edge: "viewer>cdn", reverse: true, tone: "ok", caption: "The next viewer in the region gets every segment straight from the edge.", mark: [{ node: "cdn", state: "hit" }] },
      ],
    },
    {
      id: "network",
      name: "Network gets worse",
      steps: [
        { edge: "viewer>cdn", caption: "The player is on 1080p: 5 Mbps. A segment downloads in about 1.5 seconds, and the buffer holds 20 seconds." },
        { edge: "viewer>cdn", reverse: true, tone: "miss", caption: "The phone moves from Wi-Fi to a weak signal. The next segment takes 5 seconds, longer than it plays.", mark: [{ node: "viewer", state: "miss" }] },
        { edge: "viewer>cdn", caption: "The player re-estimates throughput: about 1 Mbps. 80% of that is 0.8 Mbps, so only 360p fits. It asks for the next segment at 360p." },
        { edge: "viewer>cdn", reverse: true, tone: "ok", caption: "The picture gets softer, but it keeps playing. A new quality starts at a segment boundary, so there is no glitch.", mark: [{ node: "viewer", state: "ok" }] },
        { edge: "viewer>cdn", caption: "When the signal improves and the buffer is above 12 seconds, the player steps up one quality at a time." },
      ],
    },
    {
      id: "resume",
      name: "Upload interrupted",
      steps: [
        { edge: "uploader>upload", caption: "A creator is uploading 500 MiB from a train. Chunk 40 of 63 is in flight." },
        { edge: "upload>raw", tone: "error", caption: "The connection drops mid-chunk. Chunks 1 to 39 are safely stored; chunk 40 is thrown away.", mark: [{ node: "uploader", state: "down" }] },
        { edge: "uploader>upload", caption: "Back online, the app asks: how many bytes do you have, in order?", mark: [{ node: "uploader", state: null }] },
        { edge: "uploader>upload", reverse: true, caption: "The server answers: 39 chunks, 312 MiB. The app continues from chunk 40." },
        { edge: "upload>raw", tone: "ok", caption: "24 chunks later the file is complete. Nothing was sent twice except the broken chunk.", mark: [{ node: "raw", state: "ok" }] },
      ],
    },
  ],
};

export const transcodeSequence: SequenceSpec = {
  id: "video-streaming-transcode-sequence",
  title: "A transcoding job",
  description:
    "A coordinator splits the video into segments and fans out encode tasks to workers. Tasks are idempotent: a failed task is retried on another worker while the others carry on. Only after all segments exist does the packager write the playlists.",
  actors: [
    { id: "queue", label: "Job queue", kind: "queue" },
    { id: "coord", label: "Coordinator", kind: "service" },
    { id: "w1", label: "Worker A", kind: "worker" },
    { id: "w2", label: "Worker B", kind: "worker" },
    { id: "store", label: "Video store", kind: "storage" },
    { id: "db", label: "Metadata DB", kind: "database" },
  ],
  items: [
    { from: "queue", to: "coord", label: "job: video V, 600 s" },
    { note: "Plan 750 tasks: 150 segments x 5 qualities", over: ["coord", "w1"] },
    { from: "coord", to: "w1", label: "encode V/720p/7", type: "async" },
    { from: "coord", to: "w2", label: "encode V/720p/8", type: "async" },
    {
      alt: [
        {
          when: "all succeed",
          items: [
            { from: "w1", to: "store", label: "put segment 7" },
            { from: "w2", to: "store", label: "put segment 8" },
            { from: "w1", to: "coord", label: "done", type: "reply" },
            { from: "w2", to: "coord", label: "done", type: "reply" },
            { note: "After the 750th task, the package task runs", over: ["coord", "store"] },
            { from: "coord", to: "store", label: "put master + playlists" },
            { from: "coord", to: "db", label: "status = READY" },
          ],
        },
        {
          when: "worker B dies",
          items: [
            { from: "w1", to: "coord", label: "done V/720p/7", type: "reply" },
            { note: "No heartbeat from B for 30 s: its task lease expires", over: ["coord", "w2"] },
            { from: "coord", to: "w1", label: "encode V/720p/8 (again)", type: "async" },
            { from: "w1", to: "store", label: "put segment 8 (same path)" },
            { note: "If B had written it too, the file is identical: the retry is harmless", over: ["w1", "store"] },
          ],
        },
        {
          when: "bad source",
          items: [
            { from: "w1", to: "coord", label: "failed: corrupt frame", type: "reply" },
            { note: "Retry 3 times, then give up", over: ["coord", "w1"] },
            { from: "coord", to: "db", label: "status = FAILED, reason" },
            { note: "The creator is told to re-upload; no partial video is ever shown", over: ["coord", "db"] },
          ],
        },
      ],
    },
  ],
};
