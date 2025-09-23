import { RTreeMBR } from "../src/rtree/rtree";


describe("RTreeMBR_test", () => {


    test("RTreeMBR", () => {

        let mbr = RTreeMBR.build(1, 2, 3, 4);
        expect(mbr.dim === 2);
        expect(mbr.intervals.length).toBe(2);
        expect(mbr.intervals[0].l).toBe(1);
        expect(mbr.intervals[0].r).toBe(2);
        expect(mbr.intervals[1].l).toBe(3);
        expect(mbr.intervals[1].r).toBe(4);

        mbr = RTreeMBR.build(1, 2, 3, 4, 5, 6, 7, 8);
        expect(mbr.dim === 4);
        expect(mbr.intervals.length).toBe(4);
        expect(mbr.intervals[0].l).toBe(1);
        expect(mbr.intervals[0].r).toBe(2);
        expect(mbr.intervals[1].l).toBe(3);
        expect(mbr.intervals[1].r).toBe(4);
        expect(mbr.intervals[2].l).toBe(5);
        expect(mbr.intervals[2].r).toBe(6);
        expect(mbr.intervals[3].l).toBe(7);
        expect(mbr.intervals[3].r).toBe(8);

    });

    test("RTreeMBR_clone", () => {

        let mbr = RTreeMBR.build(1, 2, 3, 4, 5, 6);

        let mbr2 = mbr.clone();

        expect(mbr2.dim).toBe(mbr.dim);
        expect(mbr2.intervals.length).toBe(mbr.intervals.length);
        for (let d = 0; d < mbr.dim; ++d) {
            expect(mbr.intervals[d].equals(mbr2.intervals[d])).toBeTruthy();
        }


    });

    test("RTreeMBR_forceDim", () => {

        let mbr2 = RTreeMBR.build(1, 2, 3, 4);

        let mbr1 = mbr2.forceDim(1);
        let mbr3 = mbr2.forceDim(3);

        expect(mbr1.dim).toBe(1);
        expect(mbr1.intervals.length).toBe(1);
        expect(mbr1.intervals[0].l).toBe(1);
        expect(mbr1.intervals[0].r).toBe(2);

        expect(mbr3.dim).toBe(3);
        expect(mbr3.intervals.length).toBe(3);
        expect(mbr3.intervals[0].l).toBe(1);
        expect(mbr3.intervals[0].r).toBe(2);
        expect(mbr3.intervals[1].l).toBe(3);
        expect(mbr3.intervals[1].r).toBe(4);
        expect(mbr3.intervals[2].l).toBe(0);
        expect(mbr3.intervals[2].r).toBe(0);

    });

    test("RTreeMBR_merge", () => {

        let mbr0 = RTreeMBR.build(20, 70, 120, 170);
        let mbr1 = RTreeMBR.build(10, 80, 110, 180);
        const mbr2 = mbr0.merge(mbr1);
        expect(mbr2.intervals[0].l).toBe(10);
        expect(mbr2.intervals[0].r).toBe(80);
        expect(mbr2.intervals[1].l).toBe(110);
        expect(mbr2.intervals[1].r).toBe(180);


    });

    test("RTreeMBR_addMbrInplace", () => {
        let mbr0 = RTreeMBR.build(20, 70, 120, 170);
        let mbr1 = RTreeMBR.build(10, 80, 110, 180);
        mbr0.addMbrInplace(mbr1);
        expect(mbr0.intervals[0].l).toBe(10);
        expect(mbr0.intervals[0].r).toBe(80);
        expect(mbr0.intervals[1].l).toBe(110);
        expect(mbr0.intervals[1].r).toBe(180);
    });

    test("RTreeMBR_area", () => {
        let mbr0 = RTreeMBR.build(10, 20, 40, 50);
        expect(mbr0.area()).toBe(100);

        let mbr1 = RTreeMBR.build(10, 20, 40, 50, 70, 80);
        expect(mbr1.area()).toBe(1000);
    });

    test("RTreeMBR_overlap", () => {
        let mbr0 = RTreeMBR.build(10, 20, 40, 50);
        let mbr1 = RTreeMBR.build(15, 25, 45, 55);
        expect(mbr0.overlap(mbr1)).toBeTruthy();


        mbr0 = RTreeMBR.build(10, 20, 40, 50);
        mbr1 = RTreeMBR.build(30, 40, 45, 55);
        expect(mbr0.overlap(mbr1)).toBeFalsy();

    });

    test("RTreeMBR_within", () => {
        let mbr0 = RTreeMBR.build(10, 20, 40, 50);
        let mbr1 = RTreeMBR.build(15, 25, 45, 55);
        expect(mbr0.within(mbr1)).toBeFalsy();


        mbr0 = RTreeMBR.build(10, 20, 40, 50);
        mbr1 = RTreeMBR.build(0, 30, 35, 55);
        expect(mbr0.within(mbr1)).toBeTruthy();
    });


});