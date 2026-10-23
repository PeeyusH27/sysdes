// A quadtree splits the map into four quarters, and splits a quarter again only where it holds too many businesses.
// Downtown ends up with many tiny leaves; the desert stays one big leaf. Each leaf holds at most `capacity` points
// (unless it has hit maxDepth, which stops identical points from splitting forever).
import { boundingBox, haversineKm } from './distance.js';

class Node {
  constructor(box, depth) {
    this.box = box;                 // { latLo, latHi, lonLo, lonHi }
    this.depth = depth;
    this.points = [];               // only leaves hold points
    this.kids = null;               // four children once split
  }
}

const intersects = (a, b) => a.latLo <= b.latHi && a.latHi >= b.latLo && a.lonLo <= b.lonHi && a.lonHi >= b.lonLo;

export class QuadTree {
  constructor({ capacity = 100, maxDepth = 24 } = {}) {
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.root = new Node({ latLo: -90, latHi: 90, lonLo: -180, lonHi: 180 }, 0);
    this.size = 0;
  }

  #childFor(node, p) {
    const latMid = (node.box.latLo + node.box.latHi) / 2;
    const lonMid = (node.box.lonLo + node.box.lonHi) / 2;
    return node.kids[(p.lat >= latMid ? 2 : 0) + (p.lon >= lonMid ? 1 : 0)];
  }

  #split(node) {
    const { latLo, latHi, lonLo, lonHi } = node.box;
    const latMid = (latLo + latHi) / 2;
    const lonMid = (lonLo + lonHi) / 2;
    node.kids = [
      new Node({ latLo, latHi: latMid, lonLo, lonHi: lonMid }, node.depth + 1),
      new Node({ latLo, latHi: latMid, lonLo: lonMid, lonHi }, node.depth + 1),
      new Node({ latLo: latMid, latHi, lonLo, lonHi: lonMid }, node.depth + 1),
      new Node({ latLo: latMid, latHi, lonLo: lonMid, lonHi }, node.depth + 1),
    ];
    const old = node.points;
    node.points = [];
    for (const p of old) this.#childFor(node, p).points.push(p);
  }

  insert(p) {
    let node = this.root;
    while (node.kids) node = this.#childFor(node, p);
    node.points.push(p);
    this.size++;
    // Split a full leaf; repeat if all its points landed in one child.
    while (node.points.length > this.capacity && node.depth < this.maxDepth) {
      this.#split(node);
      const next = node.kids.find((k) => k.points.length > this.capacity);
      if (!next) break;
      node = next;
    }
  }

  remove(id, lat, lon) {
    let node = this.root;
    while (node.kids) node = this.#childFor(node, { lat, lon });
    const i = node.points.findIndex((p) => p.id === id);
    if (i < 0) return false;
    node.points.splice(i, 1);
    this.size--;
    return true;
  }

  // Everything within radiusKm: visit only nodes that touch the circle's bounding box, then check exact distances.
  nearby(lat, lon, radiusKm, limit = 20) {
    const box = boundingBox(lat, lon, radiusKm);
    const found = [];
    let visited = 0;
    const walk = (node) => {
      visited++;
      if (!intersects(node.box, box)) return;
      if (node.kids) { node.kids.forEach(walk); return; }
      for (const p of node.points) {
        const distKm = haversineKm({ lat, lon }, p);
        if (distKm <= radiusKm) found.push({ ...p, distKm });
      }
    };
    walk(this.root);
    found.sort((a, b) => a.distKm - b.distKm);
    return { results: found.slice(0, limit), visited };
  }

  stats() {
    let nodes = 0, leaves = 0, depth = 0, biggest = 0;
    const walk = (n) => {
      nodes++;
      depth = Math.max(depth, n.depth);
      if (n.kids) n.kids.forEach(walk); else { leaves++; biggest = Math.max(biggest, n.points.length); }
    };
    walk(this.root);
    return { nodes, leaves, depth, biggestLeaf: biggest };
  }
}

// The sum for 200 million businesses with 100 per leaf: about 2 million full leaves, and a quarter-tree adds a third more nodes.
export function memoryEstimate(businesses, capacity = 100, bytesPerId = 8, bytesPerNode = 100) {
  const leaves = Math.ceil(businesses / capacity);
  const nodes = leaves + Math.ceil((leaves - 1) / 3);          // a tree with 4 children per internal node
  return { leaves, nodes, bytes: businesses * bytesPerId + nodes * bytesPerNode };
}
