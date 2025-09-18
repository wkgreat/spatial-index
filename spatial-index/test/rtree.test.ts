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

    test('create', () => {

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


    test("insert", () => {

        const rtree = new RTree(2, 5);

        rtree.setToMbrFunc((mbr) => mbr);

        const mbrs = [
            new RTreeMBR(1.779455549771014, 76.54730144976159, 79.62660401470413, 96.07302531179162),
            new RTreeMBR(41.184647637096575, 20.470665477910764, 84.56331121979294, 83.6782921839544),
            new RTreeMBR(99.81770518232975, 40.37621212493314, 99.94429233628391, 96.24543229374524),
            new RTreeMBR(59.86440850333841, 82.11874931473673, 87.77126348827358, 84.64557883968405),
            new RTreeMBR(45.893032132791454, 10.395290293236403, 61.28675988430331, 45.277187139674695),
            new RTreeMBR(88.78218035031745, 28.21531587559718, 95.34890903496486, 65.27712394409555),
            new RTreeMBR(99.59901011569032, 68.28794020555011, 99.92060699990817, 84.23858105138632),
            new RTreeMBR(40.52529911613241, 84.24560706518322, 43.30566043722836, 87.66487748136666),
            new RTreeMBR(98.4681866748208, 95.28774436635213, 98.989776131385, 95.60884193709832),
            new RTreeMBR(34.91764624797982, 44.515830926894154, 76.98751804919237, 68.26965297648583),
            new RTreeMBR(12.115847952763236, 40.20994705623531, 71.18099711674509, 41.45220286875837),
            new RTreeMBR(44.91906849921292, 5.783949733938165, 79.89473658387163, 87.31449969558076),
            new RTreeMBR(65.52316863147523, 18.532270985024635, 68.99839642700235, 24.800180952422142),
            new RTreeMBR(39.02559723440766, 99.38369025135646, 80.32670515103246, 99.66743132697717),
            new RTreeMBR(41.47410788181203, 30.071503997219786, 82.13572692849735, 57.049489763047085),
            new RTreeMBR(33.62043463450979, 4.3875228195148885, 52.86085604610132, 95.46568578557716),
            new RTreeMBR(81.85847225712972, 53.40247887080491, 95.7734350220854, 61.033233096213756),
            new RTreeMBR(15.246590213350753, 11.595963040881884, 86.93115977618316, 97.33990624106004)
        ];

        for (let i = 0; i < mbrs.length; ++i) {
            rtree.insert(mbrs[i]);
        }

    })

});