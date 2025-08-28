import './index.css'
import { Geometry, RTree } from './rtree/rtree';
import { RTreeRender } from './rtree/rtree_render';

async function main() {
    const rtree = new RTree(2, 5);
    const render = new RTreeRender(rtree);
    const [xmin, ymin, xmax, ymax] = [0, 0, 10, 10];
    document.getElementById("the-button").addEventListener("click", () => {
        rtree.insert(Geometry.buildRandom(xmin, ymin, xmax, ymax));
        render.render();
    })
}

main();

