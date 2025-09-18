import { RTree, RTreeMBR } from "../src/rtree/rtree";
import { randomFloat } from "../src/utils/utils";

function randomMbrinMbr(mbr: RTreeMBR) {

    const xmin = randomFloat(mbr.xmin, mbr.xmax);
    const xmax = randomFloat(xmin, mbr.xmax);
    const ymin = randomFloat(mbr.ymin, mbr.ymax);
    const ymax = randomFloat(ymin, mbr.ymax);

    return new RTreeMBR(xmin, ymin, xmax, ymax);

}

describe('rtree', () => {

    test('rtree create', () => {

        const ext = new RTreeMBR(0, 0, 100, 100);

        const mbrs: RTreeMBR[] = [];
        for (let i = 0; i < 20; ++i) {
            mbrs.push(randomMbrinMbr(ext));
        }

        const rtree = new RTree(2, 5);

        rtree.setToMbrFunc((mbr) => mbr);

        for (let mbr of mbrs) {
            rtree.insert(mbr);
        }

        expect(rtree.root).not.toBeNull();

    })
});