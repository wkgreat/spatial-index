import Probe from "./probe";

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
 * @class RTreeRecord
 * @template T
 * A leaf node point to a RTreeRecord object
 * RTreeRecord contains a data field (geometry object or other object contains spatial information) and a mbr and a record id.
 * @todo replace RTreeEntry geom field to record field
*/
export class RTreeRecord {

    /**@type {number}*/
    id = 0;
    /**@type {MBR}*/
    mbr = null;
    /**@type {T}*/
    data = null;

    static counter = 0;

    /**
     * @constructor
     * @param {T} data
     * @param {(T)=>MBR} toMBRFunc  
    */
    constructor(data, toMBRFunc) {
        this.data = data;
        this.mbr = toMBRFunc(data);
        this.id = RTreeRecord.counter++;
    }
}

/**
 * @class Geometry
 * @todo This is geometry class for R-tree test. Only contains mbr without shape data now.
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

    static buildRandom(ext, wmin, hmin, wmax, hmax) {
        const [xmin, ymin, xmax, ymax] = ext;
        let x0 = randomFloat(xmin, xmax);
        let y0 = randomFloat(ymin, ymax);
        let x1 = Math.min(x0 + randomFloat(wmin, wmax), xmax);
        let y1 = Math.min(y0 + randomFloat(hmin, hmax), ymax);
        const g = new Geometry();
        g.id = Geometry.counter++;
        g.mbr = new MBR(x0, y0, x1, y1);
        return g;
    }

    static buildFromMbr(mbr) {
        const g = new Geometry();
        g.id = Geometry.counter++;
        g.mbr = mbr;
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

    /**@type {Probe}*/
    probe = null;

    /**
     * @constructor 
     * @param {number} m - minimum number of entries in a node, m should be little or equal than M.
     * @param {number} M - maximum number of entries in a node.
    */
    constructor(m, M) {
        this.m = m;
        this.M = M;
    }

    __probe__(tag, data) {
        if (this.probe) {
            this.probe.probe(tag, data);
        }
    }

    /**
     * @static
     * @param {Geometry[]} geoms 
     * @returns {RTree}
    */
    static buildFromGeoms(geoms) {
        //TODO
    };

    /**
     * @returns {number} the level of leaf node
     * the root level is zero.
    */
    getLeafLevel() {
        if (this.root == null) {
            return -1;
        }
        let l = 0;
        let n = this.root;
        while (!n.isLeaf) {
            n = n.entries[0].node;
            l += 1;
        }
        return l;
    }

    /**
     * @param {RTreeNode} node
     * @returns {number} get depth from node downward 
     * leaf node depth is zero.
    */
    getDepthFromNode(node) {
        let depth = 0;
        let n = node;
        while (!n.isLeaf) {
            n = n.entries[0].node;
            depth += 1;
        }
        return depth;
    }

    insertEntry(entry, level) {

        let pnode = this._chooseNodeEntryIn(entry, level);

        pnode.addEntry(entry); // add entry to pnode

        let lnode = null, rnode = null;

        if (pnode.entries.length > this.M) { // leaf is full, split

            [lnode, rnode] = this.splitNode(pnode);

        } else {
            lnode = pnode;
            rnode = null;
        }

        this.adjustTree(pnode, lnode, rnode);
    }

    _chooseNodeEntryIn(entry, entry_level) {
        if (this.root === null) {
            this.root = RTreeNode.buildRoot();
        }

        let level = 0;
        let N = this.root;

        while (level < entry_level) {

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
            level += 1;

        }

        return N;
    }

    /**
     * @param {Geometry} geom 
     * @returns {void}
    */
    insert(geom) {

        this.__probe__("rtree:insert:start", { target: this, geom: geom });

        if (geom === null) {
            console.error("not support null geom now.");
            return;
        }

        let entry = RTreeEntry.buildFromGeom(geom);

        let leaf = this.chooseLeaf(entry);

        leaf.addEntry(entry); // add entry to leaf

        let lnode = null, rnode = null;

        if (leaf.entries.length > this.M) { // leaf is full, split

            [lnode, rnode] = this.splitNode(leaf);

        } else {
            lnode = leaf;
            rnode = null;
        }

        this.adjustTree(leaf, lnode, rnode);

        this.__probe__("rtree:insert:finish", { target: this, geom: geom });

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
     * @private
     * @param {RTreeNode} node
     * @param {RTreeEntry} entry  
    */
    _removeEntryFromNode(node, entry) {
        node.entries.splice(node.entries.indexOf(entry), 1);
    }

    /**
     * @param {Geometry} geom 
     * @returns {void}
    */
    delete(geom) {

        this.__probe__("rtree:delete:start", { target: this, geom: geom });

        const [leaf, entry] = this.findLeaf(geom);
        if (leaf === null || entry === null) {
            return;
        }

        this._removeEntryFromNode(leaf, entry);
        this.condenseTree(leaf);

        if (this.root.entries.length === 1 && !this.root.isLeaf) {
            const newRoot = this.root.entries[0].node;
            newRoot.parent = null;
            newRoot.entry = null;
            this.root = newRoot;
        }

        this.__probe__("rtree:delete:finish", { target: this, geom: geom });
    };

    /**
     * @param {Geometry} geom
     * @returns {[RTreeNode,RTreeEntry]} 
    */
    findLeaf(geom) {

        const nodes = []; //stack of nodes
        nodes.push(this.root);
        while (nodes.length > 0) {
            const node = nodes.pop();
            if (!node.isLeaf) {
                for (let e of node.entries) {
                    if (geom.mbr.overlap(e.mbr)) {
                        nodes.push(e.node);
                    }
                }
            } else {
                for (let e of node.entries) {
                    if (e.geom === geom) { //here check geom is equal
                        return [node, e];
                    }
                }
            }
        }
        return [null, null];
    };

    _getEntryInsertLevelByNode(node) {
        const level = this.getLeafLevel();
        const depth = this.getDepthFromNode(node);
        return level - depth;
    }

    /**
     * @param {RTreeNode} node the node need condense 
     * @returns {void}
    */
    condenseTree(node) {

        const q = [];
        let n = node;

        while (n != this.root) { // if n is not root node

            const p = n.parent;
            const e = n.entry;

            if (n.entries.length < this.m) { // need delete node n and delete entry e of n  

                this._removeEntryFromNode(p, e);// delete entry from parent node
                q.push(n); // q add deleted n

            } else { // not delete and refresh mbr of entry e
                e.refreshMBR();
            }

            n = n.parent; //move upward
        }

        // here n is already root node. reinsert
        for (let n of q) {
            const level = this._getEntryInsertLevelByNode(n);
            for (let e of n.entries) {
                this.insertEntry(e, level);
            }
        }
    }


    /**
     * @param {RTreeNode} node 
     * @returns {[RTreeNode,RTreeNode]} return two nodes
    */
    splitNode(node) {

        //TODO temporarily simply split node to two nodes;

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
     * @param {RTreeNode} node
     * @returns {[RTreeNode,RTreeNode]} 
    */
    _randomSplit(node) {
        //TODO
    }

    /**
     * @param {RTreeNode} node
     * @returns {[RTreeNode,RTreeNode]} 
    */
    _linearSplit(node) {
        //TODO
    }

    /**
     * @param {RTreeNode} node
     * @returns {[RTreeNode,RTreeNode]} 
    */
    _doubleSortSplit(node) {
        //TODO
    }

    /**
     * @param {MBR} mbr search mbr 
     * @param {(RTreeEntry,MBR)=>boolean} check_func check the entry and the mbr is matched
     * @returns {RTreeEntry[]}
    */
    search(mbr, check_func) {

        const nodes = [];
        const res_entries = [];

        nodes.push(this.root);

        while (nodes.length > 0) {
            const node = nodes.shift();
            if (node.isLeaf) {
                for (let e of node.entries) {
                    if (check_func(e, mbr)) {
                        res_entries.push(e);
                    }
                }
            } else {
                for (let e of node.entries) {
                    if (check_func(e, mbr)) {
                        nodes.push(e.node);
                    }
                }
            }
        }

        return res_entries;
    };


    /**
     * @param {MBR} mbr
     * @returns {RTreeEntry[]}
    */
    search_overlap(mbr) {
        this.__probe__("rtree:search_overlap:start", { target: this, mbr });
        const result = this.search(mbr, (entry, mbr) => {
            return entry.mbr.overlap(mbr);
        });
        this.__probe__("rtree:search_overlap:finish", { target: this, mbr: mbr, result: result });
        return result;
    }

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
        this.isLeaf = entry.isLeaf;
        if (!entry.isLeaf) {
            entry.node.parent = this;
        }

    }

    setParent(node) {
        this.parent = node;
    }

    getParent() {
        return this.parent;
    }

}

class RTreeEntry {

    id = 0;

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

    static counter = 0;

    /**
     * @static
     * @param {Geometry} geom
     * @returns {RTreeEntry} 
    */
    static buildFromGeom(geom) {
        const entry = new RTreeEntry();
        entry.id = RTreeEntry.counter++;
        entry.mbr = geom.mbr;
        entry.isLeaf = true;
        entry.node = null;
        entry.geom = geom;
        return entry;
    }

    static buildFromNode(node) {
        const entry = new RTreeEntry();
        entry.id = RTreeEntry.counter++;
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

};