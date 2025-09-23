import './rtree.css';
import { RTree, RTreeEntry, RTreeMBR } from "spatial-index-js/rtree";
import { RTreeRender } from "spatial-index-js/rtree_render";
import { randomFloat, sleep } from 'spatial-index-js/utils';

/**
 * @class Geometry
 * @todo This is geometry class for R-tree test. Only contains mbr without shape data now.
 * 
*/
export class Geometry {

    /** @type {number} */
    id = 0;

    /** @type {RTreeMBR} */
    mbr = null;

    static counter = 0;

    /**
     * @static
     * @param {[number,number,number,number]} ext
     * @param {number} wmin
     * @param {number} hmin
     * @param {number} wmax
     * @param {number} hmax
     * @returns {Geometry}
     */
    static buildRandom(ext, wmin, hmin, wmax, hmax) {
        const [xmin, ymin, xmax, ymax] = ext;
        let x0 = randomFloat(xmin, xmax);
        let y0 = randomFloat(ymin, ymax);
        let x1 = Math.min(x0 + randomFloat(wmin, wmax), xmax);
        let y1 = Math.min(y0 + randomFloat(hmin, hmax), ymax);
        const g = new Geometry();
        g.id = Geometry.counter++;
        g.mbr = RTreeMBR.build(x0, x1, y0, y1);
        return g;
    }

    /**
     * @static
     * @param {RTreeMBR} mbr
     * @returns {Geometry}
     */
    static buildFromMbr(mbr) {
        const g = new Geometry();
        g.id = Geometry.counter++;
        g.mbr = mbr;
        return g;
    }
};

export class RTreeDemo {

    /** @type {number} */
    _m = 2;
    /** @type {number} */
    _M = 5;
    /** @type {RTree|null} */
    _rtree = null
    /** @type {Geometry[]} */
    _insertedGeometries = [];
    /** @type {RTreeRender|null} */
    _render = null;
    /** @type {Geometry} */
    _search_condition = null;
    /** @type {RTreeEntry[]} */
    _search_result_entries = [];

    _world_extent = [0, 0, 50, 50];

    _geom_random_min_width = 2;
    _geom_random_min_height = 2;
    _geom_random_max_width = 5;
    _geom_random_max_height = 5;

    /**
     * @constructor
    */
    constructor() {
        const graph_div_id = "graph-div";
        const canvas_div_id = "rtree-canvas";
        this._rtree = new RTree(this._m, this._M);
        this._render = new RTreeRender({
            rtree: this._rtree,
            graph_div_id: graph_div_id,
            canvas_div_id: canvas_div_id
        });
        this._render.setDataExtent(this._world_extent);
    }

    setMinMaxNumberOfEntries(m, M) {
        this._m = m;
        this._M = M;
        this.refreshRtree();
    }

    /**
     * @param {number} [n=20]
     * @returns {void} 
    */
    async insertRandomGeometries(n = 20) {
        for (let i = 0; i < n; ++i) {
            this.insertGeometry(Geometry.buildRandom(
                this._world_extent,
                this._geom_random_min_width,
                this._geom_random_min_height,
                this._geom_random_max_width,
                this._geom_random_max_height
            ));
            await sleep(100);
        }
    }

    insertGeometries(geoms) {
        for (let g of geoms) {
            this.insertGeometry(g);
        }
    }

    /**
     * @param {Geometry} geom 
     * @returns {null}
    */
    insertGeometry(geom) {
        this._rtree.insert(geom, (g) => g.mbr);
        this._insertedGeometries.push(geom);
        this._render.render();
    }

    deleteRandomGeometry() {
        if (this._insertedGeometries.length > 0) {
            const randomIndex = Math.floor(Math.random() * this._insertedGeometries.length);
            const geom = this._insertedGeometries[randomIndex];
            this._rtree.delete(geom, (g) => g.mbr);
            this._insertedGeometries.splice(randomIndex, 1);
        }

    }

    makeRandomSearchGeometry() {
        const [xmin, ymin, xmax, ymax] = this._world_extent;
        const dx = xmax - xmin;
        const dy = ymax - ymin;
        const g = Geometry.buildRandom(
            this._world_extent,
            0.2 * dx,
            0.2 * dy,
            0.9 * dx,
            0.9 * dy
        );
        return g;
    }

    /**
     * @param {Geometry} geom 
     * @returns {null}
    */
    search_overlap(geom) {
        const entries = this._rtree.search_overlap(geom.mbr);
        this._search_condition = geom;
        this._search_result_entries = entries;
        this._render.render();
    }

    refreshRtree() {
        this.clear();
        this._rtree.m = this._m;
        this._rtree.M = this._M;
        const geoms = this._insertedGeometries;
        this._insertedGeometries = [];
        this.insertGeometries(geoms);
        this._render.render();
    }

    clear() {
        this._rtree.clear();
    }
}

export function rtree_demo_main() {

    const rtree_demo = new RTreeDemo();
    const m_input = document.getElementById("m_input");
    const M_input = document.getElementById("M_input");
    let m = m_input.value;
    let M = M_input.value;

    rtree_demo.setMinMaxNumberOfEntries(m, M);

    rtree_demo.insertRandomGeometries(20);

    m_input.addEventListener("input", (evt) => {
        m_input.disabled = true;
        const v = parseFloat(evt.target.value);
        if (v < 2 || v > M / 2) {
            evt.target.value = `${m}`;
            alert(`m should small or equal to M / 2`);
        } else {
            m = v;
            rtree_demo.setMinMaxNumberOfEntries(m, M);
        }
        m_input.disabled = false;
    })

    M_input.addEventListener("input", (evt) => {
        M_input.disabled = true;
        const v = parseFloat(evt.target.value);
        if (m > v / 2) {
            evt.target.value = `${M}`;
            alert(`m should small or equal to M / 2`);
        } else {
            M = v;
            rtree_demo.setMinMaxNumberOfEntries(m, M);
        }
        M_input.disabled = false;
    })

    document.getElementById("insert-button").addEventListener("click", () => {
        rtree_demo.insertRandomGeometries(1);
    })

    document.getElementById("search-button").addEventListener("click", () => {
        const g = rtree_demo.makeRandomSearchGeometry();
        rtree_demo.search_overlap(g);
    })

    document.getElementById("delete-button").addEventListener("click", () => {
        rtree_demo.deleteRandomGeometry();
    })

    document.getElementById("clear-button").addEventListener("click", () => {
        rtree_demo.clear();
    })

}