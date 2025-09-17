import { RTree } from "../src/rtree/rtree.js"

describe('rtree', () => {

    test('rtree create', () => {

        const rtree = new RTree(2, 5);
        expect(rtree.root).toBeNull();

    })
});