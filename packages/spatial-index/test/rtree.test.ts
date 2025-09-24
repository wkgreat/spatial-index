import { RTree, RTreeMBR } from "../src/rtree/rtree";
import { randomFloat } from "../src/utils/utils";
import { geom } from 'jsts';
import { BoxSize, randomPolygon, randomPolygons } from "./jsts_utils";
import fs from 'fs';
import { createRandomMesh, meshOverlapByAABB, meshToAABB } from "./three_utils";
import * as THREE from 'three';

function randomMbrinMbr(mbr: RTreeMBR) {

    const xmin = randomFloat(mbr.xmin, mbr.xmax);
    const xmax = randomFloat(xmin, mbr.xmax);
    const ymin = randomFloat(mbr.ymin, mbr.ymax);
    const ymax = randomFloat(ymin, mbr.ymax);

    return RTreeMBR.build(xmin, xmax, ymin, ymax);

}

describe('rtree', () => {

    test('create', () => {

        for (let r = 0; r < 1000; r++) {

            const ext = RTreeMBR.build(0, 100, 0, 100);

            const mbrs: RTreeMBR[] = [];

            // fs.writeFileSync("rtree.test.out", "");

            for (let i = 0; i < 20; ++i) {
                const mbr = randomMbrinMbr(ext);
                // fs.appendFileSync("rtree.test.out", `${mbr.xmin}, ${mbr.ymin}, ${mbr.xmax}, ${mbr.ymax}\n`)
                mbrs.push(mbr);
            }

            const rtree = new RTree(2, 5);

            rtree.setToMbrFunc((mbr) => mbr);

            for (let mbr of mbrs) {
                rtree.insert(mbr);
            }

            expect(rtree.root).not.toBeNull();
        }

    })

});


describe("rtree_2d_with_jsts", () => {

    const worldBox = new geom.Envelope(0, 100, 0, 100);
    const geomsize: BoxSize = { hmin: 2, wmin: 2, hmax: 10, wmax: 10 };
    const polygons = randomPolygons(worldBox, 1000, geomsize);
    const polygonToRTreeMBR = (g: geom.Geometry) => {
        const envelope = g.getEnvelopeInternal();
        const mbr = RTreeMBR.build(envelope.getMinX(), envelope.getMaxX(), envelope.getMinY(), envelope.getMaxY());
        return mbr;
    }

    const rtree = new RTree(2, 5);
    rtree.setToMbrFunc(polygonToRTreeMBR);
    for (let g of polygons) {
        rtree.insert(g);
    }

    test("query_geometry", () => {

        const search_size: BoxSize = { hmin: 20, wmin: 20, hmax: 40, wmax: 40 };
        const search_polygon = randomPolygon(worldBox, search_size);

        const search_result = rtree.search_overlap(polygonToRTreeMBR(search_polygon))
            .map(e => e.record?.data as geom.Geometry)
            .filter(g => g.overlaps(search_polygon));

        const correct_result = polygons.filter(g => g.overlaps(search_polygon));

        expect(search_result.length).toBe(correct_result.length);

        for (let g of correct_result) {
            expect(search_result.includes(g)).toBeTruthy();
        }
    })

});


describe("rtree_3d_with_three", () => {

    test("rtree_3d_with_three_search", () => {

        const N = 100;
        const m = 5;
        const M = 10;
        const dim = 3;

        const meshes: THREE.Mesh[] = [];

        const meshToRTreeMBR = (mesh: THREE.Mesh) => {
            const aabb = meshToAABB(mesh);
            const mbr = RTreeMBR.build(
                aabb.min.x, aabb.max.x,
                aabb.min.y, aabb.max.y,
                aabb.min.z, aabb.max.z);
            return mbr;
        }

        for (let i = 0; i < N; ++i) {
            meshes.push(createRandomMesh());
        }

        const searchMesh = createRandomMesh();

        const rtree = new RTree(m, M, dim);

        rtree.setToMbrFunc(meshToRTreeMBR);

        for (let mesh of meshes) {
            rtree.insert(mesh);
        }

        const results = rtree
            .search_overlap(meshToRTreeMBR(searchMesh))
            .map(e => e.record!.data);

        const correctResults = meshes.filter(mesh => meshOverlapByAABB(mesh, searchMesh));

        expect(results.length).toBe(correctResults.length);

        for (let mesh of correctResults) {
            expect(results.includes(mesh)).toBeTruthy();
        }
    })

})