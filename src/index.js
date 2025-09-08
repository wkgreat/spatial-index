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

    document.getElementById("insert-button").addEventListener("click", () => {
        const g = Geometry.buildRandom(ext, wmin, hmin, wmax, hmax);
        rtree.insert(g);
        render.render();
    })

    document.getElementById("search-button").addEventListener("click", () => {
        const g = Geometry.buildRandom(ext, 5, 5, 50, 50);
        const entries = rtree.search_overlap(g.mbr);
        render.setSearch(g.mbr, entries);
        render.render();
    })

}

main();

