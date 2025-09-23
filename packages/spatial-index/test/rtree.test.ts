import { RTree, RTreeMBR } from "../src/rtree/rtree";
import { randomFloat } from "../src/utils/utils";
import { geom } from 'jsts';
import { BoxSize, randomPolygon, randomPolygons } from "./jsts_utils";
import fs from 'fs';

function randomMbrinMbr(mbr: RTreeMBR) {

    const xmin = randomFloat(mbr.xmin, mbr.xmax);
    const xmax = randomFloat(xmin, mbr.xmax);
    const ymin = randomFloat(mbr.ymin, mbr.ymax);
    const ymax = randomFloat(ymin, mbr.ymax);

    return new RTreeMBR(xmin, ymin, xmax, ymax);

}

describe('rtree', () => {

    test('create', () => {

        for (let r = 0; r < 1000; r++) {

            const ext = new RTreeMBR(0, 0, 100, 100);

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


    test("insert", () => {

        const rtree = new RTree(2, 5);

        rtree.setToMbrFunc((mbr) => mbr);

        const mbrs = [

            new RTreeMBR(4.70227195569215, 3.3551665551595056, 76.82339507463483, 58.3056197094361),
            new RTreeMBR(72.04858220244846, 50.106578707007856, 79.08858156769476, 77.49594666631725),
            new RTreeMBR(29.655102228457952, 33.75710012702242, 87.02262647662637, 52.02581530158814),
            new RTreeMBR(63.37115405043296, 93.34851482763658, 89.60034640358431, 94.23142555094303),
            new RTreeMBR(44.99634188603632, 89.91776748595971, 78.60180871085485, 93.10467245730017),
            new RTreeMBR(61.327328260262995, 71.78581956512897, 67.9015328317955, 75.14811722197656),
            new RTreeMBR(45.79794241472832, 47.814815793722246, 71.4467487038905, 93.33729011297955),
            new RTreeMBR(14.694529802584789, 75.01513147770713, 75.8698333055799, 87.91387684489895),
            new RTreeMBR(93.94933360539659, 69.47372561920695, 98.48851929439279, 70.73010474600672),
            new RTreeMBR(54.411580418028095, 18.3112261029595, 71.48777587215447, 92.25707890908564),
            new RTreeMBR(99.10848387144719, 71.72680553155514, 99.79862281021448, 89.7915915113058),
            new RTreeMBR(54.298002974073015, 36.455994450336604, 83.19233400653073, 42.06660311065555),
            new RTreeMBR(30.79952025169832, 27.27570606565419, 32.05964293254575, 98.81249635449784),
            new RTreeMBR(64.32663326558155, 92.20333967058212, 98.18124381937554, 99.1695169378805),
            new RTreeMBR(46.968870635622295, 14.445596614472933, 54.81510546305915, 84.86564615402256),
            new RTreeMBR(19.30510733045152, 66.03872683121486, 55.999254199182396, 84.36043422311126),
            new RTreeMBR(45.95984624409826, 2.0822670610295857, 61.23134952515083, 44.03451310699208),
            new RTreeMBR(14.491335204345134, 92.64442818341365, 25.92089295973191, 92.740459137366),
            new RTreeMBR(22.96870745201065, 19.027456240978346, 79.87541281501949, 74.9150920224659),
            new RTreeMBR(4.386824892961383, 6.387196410882323, 78.00824406707011, 94.0173303445347),

        ];

        for (let i = 0; i < mbrs.length; ++i) {
            rtree.insert(mbrs[i]);
        }

    })

});


describe("rtree_with_jsts", () => {

    const worldBox = new geom.Envelope(0, 100, 0, 100);
    const geomsize: BoxSize = { hmin: 2, wmin: 2, hmax: 10, wmax: 10 };
    const polygons = randomPolygons(worldBox, 1000, geomsize);
    const polygonToRTreeMBR = (g: geom.Geometry) => {
        const envelope = g.getEnvelopeInternal();
        const mbr = new RTreeMBR(envelope.getMinX(), envelope.getMinY(), envelope.getMaxX(), envelope.getMaxY());
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