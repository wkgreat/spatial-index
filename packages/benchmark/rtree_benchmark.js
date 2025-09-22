import Benchmark from "benchmark";
import * as geom from 'jsts/org/locationtech/jts/geom.js';
import RelateOp from 'jsts/org/locationtech/jts/operation/relate/RelateOp.js'
import { RTree, RTreeMBR } from "spatial-index-js/rtree";
import { randomPolygon, randomPolygons } from "./utils.js";

const suite = new Benchmark.Suite();

const polygonToRTreeMBR = (g) => {
    const envelope = g.getEnvelopeInternal();
    const mbr = new RTreeMBR(envelope.getMinX(), envelope.getMinY(), envelope.getMaxX(), envelope.getMaxY());
    return mbr;
}

function prepareData() {
    const worldBox = new geom.Envelope(0, 100, 0, 100);
    const geomsize = { hmin: 2, wmin: 2, hmax: 10, wmax: 10 };
    const polygons = randomPolygons(worldBox, 1000, geomsize);

    const rtree = new RTree(5, 10);
    rtree.setToMbrFunc(polygonToRTreeMBR);
    for (let g of polygons) {
        rtree.insert(g);
    }

    const search_size = { hmin: 20, wmin: 20, hmax: 40, wmax: 40 };
    const search_polygon = randomPolygon(worldBox, search_size);

    return {
        polygons,
        rtree,
        search_polygon,
    }
}

const { polygons, rtree, search_polygon } = prepareData();

suite
    .add('search brute force', () => {
        for (let i = 0; i < 100; ++i) {
            const search_result = polygons.filter(g => RelateOp.overlaps(g, search_polygon));
        }

    })
    .add('search rtree', () => {
        for (let i = 0; i < 100; ++i) {
            const search_result = rtree.search_overlap(polygonToRTreeMBR(search_polygon))
                .map(e => e.record.data)
                .filter(g => RelateOp.overlaps(g, search_polygon));
        }

    }).on('cycle', function (event) {
        const t = event.target;
        console.log(`=====Name: ${t.name}=====`);
        console.log(`Ops/sec: ${t.hz.toFixed(2)}`);
        console.log(`Avg time per op: ${(t.stats.mean * 1000).toFixed(6)} ms`);
        console.log(`StdDev: ${(t.stats.deviation * 1000).toFixed(6)} ms`);
        console.log(`RME: ${t.stats.rme.toFixed(2)}%`);
        console.log(`Samples: ${t.stats.sample.length}`);
    })
    // 测试完成后输出最快的
    .on('complete', function (event) {
        // console.log('=====complete=====');
        // const t = event.target;
        // console.log(`=====Name: ${t.name}=====`);
        // console.log(`Ops/sec: ${t.hz.toFixed(2)}`);
        // console.log(`Avg time per op: ${(t.stats.mean * 1000).toFixed(6)} ms`);
        // console.log(`StdDev: ${(t.stats.deviation * 1000).toFixed(6)} ms`);
        // console.log(`RME: ${t.stats.rme.toFixed(2)}%`);
        // console.log(`Samples: ${t.stats.sample.length}`);
    })
    .run({ async: false });