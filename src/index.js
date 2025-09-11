import './index.css';
import { Geometry, RTree } from './rtree/rtree';
import { RTreeRender } from './rtree/rtree_render';

/**
 *
 */
async function main() {
    const rtree = new RTree(2, 5);
    const render = new RTreeRender(rtree);
    const ext = [0, 0, 50, 50];
    const wmin = 2;
    const hmin = 2;
    const wmax = 5;
    const hmax = 5;
    render.setDataExtent(ext);
    rtree.probe = render;

    for (let i = 0; i < 20; i++) {
        const g = Geometry.buildRandom(ext, wmin, hmin, wmax, hmax);
        console.log(`${g.mbr.xmin},${g.mbr.ymin},${g.mbr.xmax},${g.mbr.ymax}`);
        rtree.insert(g);
    }

    document.getElementById("insert-button").addEventListener("click", () => {
        const g = Geometry.buildRandom(ext, wmin, hmin, wmax, hmax);
        rtree.insert(g);
    })

    document.getElementById("search-button").addEventListener("click", () => {
        const g = Geometry.buildRandom(ext, 5, 5, 50, 50);
        const entries = rtree.search_overlap(g.mbr);
    })

    document.getElementById("delete-button").addEventListener("click", () => {
        if (render.geometry_cache.length > 0) {
            const randomIndex = Math.floor(Math.random() * render.geometry_cache.length);
            const geom = render.geometry_cache[randomIndex];
            console.log(`geom: ${geom.id}`);
            rtree.delete(geom);
        }

    })
}

main();

