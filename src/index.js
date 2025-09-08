import './index.css'
import { Geometry, MBR, RTree } from './rtree/rtree';
import { RTreeRender } from './rtree/rtree_render';

async function main() {
    const rtree = new RTree(2, 5);
    const render = new RTreeRender(rtree);
    const ext = [0, 0, 50, 50];
    const wmin = 2;
    const hmin = 2;
    const wmax = 5;
    const hmax = 5;
    render.setDataExtent(ext);

    for (let i = 0; i < 20; i++) {
        rtree.insert(Geometry.buildRandom(ext, wmin, hmin, wmax, hmax));
    }
    render.render();

    document.getElementById("the-button").addEventListener("click", () => {
        const g = Geometry.buildRandom(ext, wmin, hmin, wmax, hmax);
        rtree.insert(g);
        console.log(g.mbr.xmin, g.mbr.ymin, g.mbr.xmax, g.mbr.ymax);
        render.render();
    })

}

main();

