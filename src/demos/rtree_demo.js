import './rtree.css';
import { Geometry, RTree, RTreeEntry } from "../rtree/rtree";
import { RTreeRender } from "../rtree/rtree_render";

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
        this._rtree = new RTree(this._m, this._M);
        this._render = new RTreeRender(this._rtree);
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
    insertRandomGeometries(n = 20) {
        for (let i = 0; i < n; ++i) {
            this.insertGeometry(Geometry.buildRandom(
                this._world_extent,
                this._geom_random_min_width,
                this._geom_random_min_height,
                this._geom_random_max_width,
                this._geom_random_max_height
            ));
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
        this._rtree.insert(geom);
        this._insertedGeometries.push(geom);
        this._render.render();
    }

    deleteRandomGeometry() {
        if (this._insertedGeometries.length > 0) {
            const randomIndex = Math.floor(Math.random() * this._insertedGeometries.length);
            const geom = this._insertedGeometries[randomIndex];
            this._rtree.delete(geom);
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