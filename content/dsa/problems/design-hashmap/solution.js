class MyHashMap {
  constructor() {
    this.size = 1009; // a prime keeps keys spread evenly over the buckets
    this.buckets = Array.from({ length: this.size }, () => []); // each bucket: [[key, value], ...]
  }

  bucketOf(key) {
    return this.buckets[key % this.size];
  }

  put(key, value) {
    const bucket = this.bucketOf(key);
    for (const pair of bucket) {
      if (pair[0] === key) {
        pair[1] = value; // key exists: replace the value
        return;
      }
    }
    bucket.push([key, value]);
  }

  get(key) {
    for (const pair of this.bucketOf(key)) {
      if (pair[0] === key) return pair[1];
    }
    return -1;
  }

  remove(key) {
    const bucket = this.bucketOf(key);
    const i = bucket.findIndex((pair) => pair[0] === key);
    if (i !== -1) bucket.splice(i, 1);
  }
}
