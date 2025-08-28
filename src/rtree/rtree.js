/**
 * @class MBR
 * Minimum Bounding Rectangle
*/
export class MBR {
    /** @type {number}*/
    xmin = 0;
    /** @type {number}*/
    ymin = 0;
    /** @type {number}*/
    xmax = 0;
    /** @type {number}*/
    ymax = 0;
    constructor(xmin, ymin, xmax, ymax) {
        this.xmin = xmin;
        this.ymin = ymin;
        this.xmax = xmax;
        this.ymax = ymax;
    }

    /**@returns {number}*/
    area() {
        return (this.xmax - this.xmin) * (this.ymax - this.ymin);
    }

    /**@returns {MBR}*/
    merge(mbr) {
        return new MBR(
            Math.min(this.xmin, mbr.xmin),
            Math.min(this.ymin, mbr.ymin),
            Math.max(this.xmax, mbr.xmax),
            Math.max(this.ymax, mbr.ymax));
    }

    _intervalOverlap(amin, amax, bmin, bmax) {
        return Math.max(amin, bmin) <= Math.min(amax, bmax);
    }

    overlap(mbr) {
        const b1 = this._intervalOverlap(this.xmin, this.xmax, mbr.xmin, mbr.xmax);
        const b2 = this._intervalOverlap(this.ymin, this.ymax, mbr.ymin, mbr.ymax);
        return b1 && b2;
    }
}

function randomFloat(a, b) {
    return Math.random() * (b - a) + a;
}

/**
 * @class Geometry
 * 
*/
export class Geometry {
    /** @type {number} */
    id = 0;
    /** @type {MBR} */
    mbr = null;

    //TODO add geometry spatial data
    //data;

    static counter = 0;

    static buildRandom(xmin, ymin, xmax, ymax) {

        let x0 = randomFloat(xmin, xmax);
        let x1 = randomFloat(xmin, xmax);
        let y0 = randomFloat(ymin, ymax);
        let y1 = randomFloat(ymin, ymax);
        if (x0 > x1) {
            [x0, x1] = [x1, x0];
        }
        if (y0 > y1) {
            [y0, y1] = [y1, y0];
        }

        const g = new Geometry();
        g.id = Geometry.counter++;
        g.mbr = new MBR(x0, y0, x1, y1);
        return g;
    }
};

/**
 * @class RTree
 * 
 * RTree class
*/
export class RTree {

    /**@type {RTreeNode|null}*/
    root = null;

    /**
     * @constructor 
     * @param {number} m - minimum number of entries in a node, m should be little or equal than M.
     * @param {number} M - maximum number of entries in a node.
    */
    constructor(m, M) {
        this.m = m;
        this.M = M;
    }

    /**
     * @static
     * @param {Geometry[]} geoms 
     * @returns {RTree}
    */
    static build(geoms) {
        //TODO
    };

    /**
     * @param {Geometry} geom 
     * @returns {void}
    */
    insert(geom) {

        if (geom === null) {
            console.error("not support null geom now.");
            return;
        }

        let entry = RTreeEntry.buildFromGeom(geom);

        let leaf = this.chooseLeaf(entry);

        leaf.addEntry(entry); // add entry to leaf

        if (leaf.entries.length > this.M) { // leaf is full, split

            const [lnode, rnode] = this.splitNode(leaf);

            this.adjustTree(leaf, lnode, rnode);

        }

    };

    /**
     * @param {RTreeEntry} entry
     * @returns {RTreeNode} leaf node 
    */
    chooseLeaf(entry) {

        if (this.root === null) {
            this.root = RTreeNode.buildRoot();
        }

        let N = this.root;

        while (!N.isLeaf) {

            let bestEntry = null;
            let bestCost = Infinity;
            let bestArea = Infinity;

            for (let e of N.entries) {
                let a0 = e.mbr.area();
                let a1 = e.mbr.merge(entry.mbr).area();
                let cost = a1 - a0;
                if (cost < bestCost) {
                    bestEntry = e;
                    bestCost = cost;
                    bestArea = a0;
                } else if (cost === bestCost) {
                    if (a0 < bestArea) {
                        bestEntry = e;
                        bestCost = cost;
                        bestArea = a0;
                    }
                }
            }

            N = bestEntry.node;

        }

        return N;

    }

    /**
     * @param {RTreeNode} rawnode 
     * @param {RTreeNode} node1
     * @param {RTreeNode|null} node2
    */
    adjustTree(rawnode, node1, node2) {

        let R = rawnode;
        let P = R.parent;
        let N1 = node1;
        let N2 = node2;

        while (R !== this.root) {

            if (N2 !== null) {
                N2.parent = N1.parent;
                const e1 = RTreeEntry.buildFromNode(N1);
                const e2 = RTreeEntry.buildFromNode(N2);
                P.entries = P.entries.filter(e => e.node !== R); // remove old entry
                P.addEntry(e1); // add new entry
                P.addEntry(e2); // add new entry
                if (N2.parent.entries.length > this.M) {
                    R = R.parent;
                    P = R.parent;
                    [N1, N2] = this.splitNode(N2.parent);
                } else {
                    R = R.parent;
                    P = R.parent;
                    N1 = R;
                    N2 = null;
                }
            } else {

                N1.entry.refreshMBR();

                R = N1.parent;
                P = R.parent;
                N1 = R;
                N2 = null;
            }
        }

        if (R === this.root && N2 !== null) { // has propagated to root
            const newRoot = RTreeNode.buildRoot();
            newRoot.parent = null;
            newRoot.isLeaf = false;
            N1.parent = newRoot;
            N2.parent = newRoot;
            newRoot.addEntry(RTreeEntry.buildFromNode(N1));
            newRoot.addEntry(RTreeEntry.buildFromNode(N2));
            this.root = newRoot;
        }
    }

    /**
     * @param {Geometry} geom 
     * @returns {void}
    */
    delete(geom) {};


    /**
     * @param {RTreeNode} node 
     * @returns {RTreeNode[]} return two nodes
    */
    splitNode(node) {

        //TODO temporarily simply split node to two nodes;

        // debugger;

        const lnode = RTreeNode.buildEmptyNode();
        lnode.parent = node.parent;
        lnode.entry = node.entry;
        lnode.isLeaf = node.isLeaf;

        const rnode = RTreeNode.buildEmptyNode();
        rnode.parent = node.parent;
        rnode.entry = null;
        rnode.isLeaf = node.isLeaf;

        lnode.entries = [...node.entries.slice(0, this.m)];
        rnode.entries = [...node.entries.slice(this.m)];

        if (!lnode.isLeaf) {
            for (let e of lnode.entries) {
                e.node.parent = lnode;
            }
            for (let e of rnode.entries) {
                e.node.parent = rnode;
            }
        }

        return [lnode, rnode];
    }

    /**
     * @param {Geometry} geom
     * @returns {Geometry[]} 
    */
    overlap(geom) {};

    /**
     * draw to graph
    */
    draw() {}

};

class RTreeNode {

    /**@type {string}*/
    id = "";

    /**
     * @type {RTreeNode|null}
     * parent node of this.
    */
    parent = null;

    /**
     * @type {RTreeEntry|null}
     * this entry point to this in parent node
    */
    entry = null;

    /**@type {boolean}*/
    isLeaf = false;

    /**
     * @type {RTreeEntry[]}
    */
    entries = [];

    static counter = 0;

    /**
     * @static
     * @returns {RTreeNode}
    */
    static buildRoot() {
        const root = new RTreeNode();
        root.id = RTreeNode.counter++;
        root.parent = null;
        root.entry = null;
        root.isLeaf = true;
        root.entries = [];
        return root;
    }

    static buildEmptyNode() {
        const node = new RTreeNode();
        node.id = RTreeNode.counter++;
        node.parent = null;
        node.entry = null;
        node.isLeaf = false;
        node.entries = [];
        return node;
    }

    addEntry(entry) {

        this.entries.push(entry);

    }

    setParent(node) {
        this.parent = node;
    }

    getParent() {
        return this.parent;
    }

    /**
     * draw to graph
    */
    draw() {}

}

class RTreeEntry {

    /**
     * @type {MBR}
     * mbr of this entry
    */
    mbr = null;
    /**
     * @type {boolean}
     * is leaf entry.
    */
    isLeaf = false;
    /**
     * @type {RTreeNode}
     * if not leaf entry, node is child node that the entry point
    */
    node = null;
    /**
     * @type {Geometry}
     * if leaf entry, geom is the geometry that the entry point
    */
    geom = null;

    /**
     * @static
     * @param {Geometry} geom
     * @returns {RTreeEntry} 
    */
    static buildFromGeom(geom) {
        const entry = new RTreeEntry();
        entry.mbr = geom.mbr;
        entry.isLeaf = true;
        entry.node = null;
        entry.geom = geom;
        return entry;
    }

    static buildFromNode(node) {
        const entry = new RTreeEntry();
        entry.isLeaf = false;
        entry.node = node;
        entry.refreshMBR();
        node.entry = entry;
        return entry;
    }

    refreshMBR() {

        if (this.isLeaf) {
            this.mbr = this.geom.mbr;
        } else {
            let mbr = this.node.entries[0].mbr;
            for (let i = 1; i < this.node.entries.length; ++i) {
                mbr = mbr.merge(this.node.entries[i].mbr);
            }
            this.mbr = mbr;
        }

    }

    setIsLeaf(b) {
        this.isLeaf = b;
    }
    getIsLeaf() {
        return this.isLeaf();
    }

    setNode(node) {
        this.node = node;
    }
    getNode() {
        return this.node;
    }

    setGeom(geom) {
        this.geom = geom;
    }
    getGeom() {
        return this.geom;
    }

    /**
     * draw to graph
    */
    draw() {}

};