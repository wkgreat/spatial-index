import { RTree, RTreeMBR } from "spatial-index-js/rtree";

class Point5D {
    x = 0;
    y = 0;
    z = 0;
    m = 0;
    t = 0;

    constructor(x, y, z, m, t) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.m = m;
        this.t = t;
    }
}

function randomFloat(a, b) {
    return Math.random() * (b - a) + a;
}

function randomPoint5D(a, b) {
    const x = randomFloat(a, b);
    const y = randomFloat(a, b);
    const z = randomFloat(a, b);
    const m = randomFloat(a, b);
    const t = randomFloat(a, b);
    const p = new Point5D(x, y, z, m, t);
    return p;
}

function rtree_nd_with_customized_data() {

    const N = 100;
    const m = 20;
    const M = 50;
    const dim = 5;

    const point5DToMbr = (p) => {
        return RTreeMBR.build(
            p.x, p.x,
            p.y, p.y,
            p.z, p.z,
            p.m, p.m,
            p.t, p.t
        );
    }

    const rtree = new RTree(m, M, dim);
    rtree.setToMbrFunc(point5DToMbr);
    for (let i = 0; i < N; ++i) {
        rtree.insert(randomPoint5D(0, 100));
    }

    const searchArea = RTreeMBR.build(
        0, 50,
        0, 50,
        0, 50,
        0, 50,
        0, 50);

    const results = rtree.search_overlap(searchArea).map(e => e.record.data);

    console.log(`search ${results.length} points`);

}

rtree_nd_with_customized_data();