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
    /**
     * @constructor
     * @param {number} xmin
     * @param {number} ymin
     * @param {number} xmax
     * @param {number} ymax
     */
    constructor(xmin, ymin, xmax, ymax) {
        this.xmin = xmin;
        this.ymin = ymin;
        this.xmax = xmax;
        this.ymax = ymax;
    }

    /**
     * @returns {number} 
     */
    area() {
        return (this.xmax - this.xmin) * (this.ymax - this.ymin);
    }

    /**
     * @param {MBR} mbr
     * @returns {MBR}
     */
    merge(mbr) {
        return new MBR(
            Math.min(this.xmin, mbr.xmin),
            Math.min(this.ymin, mbr.ymin),
            Math.max(this.xmax, mbr.xmax),
            Math.max(this.ymax, mbr.ymax));
    }

    /**
     * @param {MBR} mbr
     * @returns {void} 
    */
    addMbrInplace(mbr) {
        this.xmin = Math.min(this.xmin, mbr.xmin);
        this.ymin = Math.min(this.ymin, mbr.ymin);
        this.xmax = Math.max(this.xmax, mbr.xmax);
        this.ymax = Math.max(this.ymax, mbr.ymax);
    }

    /**
     * @param {number} amin
     * @param {number} amax
     * @param {number} bmin
     * @param {number} bmax
     * @returns {boolean}
     */
    _intervalOverlap(amin, amax, bmin, bmax) {
        return Math.max(amin, bmin) <= Math.min(amax, bmax);
    }

    /**
     *
     * @param {MBR} mbr
     * @returns {boolean}
     */
    overlap(mbr) {
        const b1 = this._intervalOverlap(this.xmin, this.xmax, mbr.xmin, mbr.xmax);
        const b2 = this._intervalOverlap(this.ymin, this.ymax, mbr.ymin, mbr.ymax);
        return b1 && b2;
    }

    /**
     * @returns {MBR}
     */
    clone() {
        return new MBR(this.xmin, this.ymin, this.xmax, this.ymax);
    }
}

/**
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
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
        g.mbr = new MBR(x0, y0, x1, y1);
        return g;
    }

    /**
     * @static
     * @param {MBR} mbr
     * @returns {Geometry}
     */
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

    /**
     * @param {string} tag
     * @param {object} data
     */
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

    /**
     *
     * @param {RTreeEntry} entry
     * @param {number} level
     */
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

    /**
     *
     * @param {RTreeEntry} entry
     * @param {number} entry_level
     * @returns {RTreeNode}
     */
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

    /**
     * @param {RTreeNode} node
     * @returns {number}
     */
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


        const lnode = RTreeNode.buildEmptyNode();
        lnode.parent = node.parent;
        lnode.entry = node.entry;
        lnode.isLeaf = node.isLeaf;

        const rnode = RTreeNode.buildEmptyNode();
        rnode.parent = node.parent;
        rnode.entry = null;
        rnode.isLeaf = node.isLeaf;

        // this._randomSplit(node, lnode, rnode);
        this._quadtaticSplit(node, lnode, rnode);

        //assign the parent of entries' node to new node
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
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _randomSplit(node, lnode, rnode) {

        lnode.entries = [...node.entries.slice(0, this.m)];
        rnode.entries = [...node.entries.slice(this.m)];

    }

    /**
     * @param {RTreeNode} fromNode
     * @param {RTreeNode} toNode
     * @param {number} idx
     * move the idx-th entry of node1 to node2, and remove this entry from node1   
    */
    _moveEntryToNode(fromNode, toNode, idx) {
        toNode.entries.push(fromNode.entries[idx]);
        fromNode.entries[idx] = null; // soft remove
    }

    /**
     * @param {RTreeNode} node
     * @returns {MBR}
     */
    _computeNodeMbr(node) {
        if (node === null || node.entries.length === 0) {
            return null;
        }
        const mbr = node.entries[0].mbr.clone();
        for (let i = 1; i < node.entries.length; ++i) {
            if (node.entries[i]) {
                mbr.addMbrInplace(node.entries[i].mbr);
            }

        }
        return mbr;
    }

    /**
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _quadtaticSplit(node, lnode, rnode) {
        let tot = node.entries.length;
        let cnt = 0;
        let lcnt = 0;
        let rcnt = 0;
        let lmbr = null;
        let rmbr = null;
        const [idx1, idx2] = this._quadtaticPeekSeeds(node);
        this._moveEntryToNode(node, lnode, idx1);
        cnt++;
        lcnt++;
        lmbr = this._computeNodeMbr(lnode);
        this._moveEntryToNode(node, rnode, idx2);
        cnt++;
        rcnt++;
        rmbr = this._computeNodeMbr(rnode);

        while (cnt < tot) {
            if (tot - cnt + lcnt <= this.m) {
                lnode.entries.push(...node.entries.filter(e => e !== null));
                return;
            }
            if (tot - cnt + rcnt <= this.m) {
                rnode.entries.push(...node.entries.filter(e => e !== null));
                return;
            }

            const [idx, target] = this._quadtaticPickNext(node, lnode, rnode, lmbr, rmbr);
            this._moveEntryToNode(node, target, idx);
            cnt++;
            if (target === lnode) {
                lmbr = this._computeNodeMbr(lnode);
                lcnt++;
            } else {
                rmbr = this._computeNodeMbr(rnode);
                rcnt++;
            }
        }
    }

    /**
     * @param {RTreeNode} node
     * @returns {[number,number]}
     */
    _quadtaticPeekSeeds(node) {
        let maxd = -1;
        let idx1 = -1;
        let idx2 = -1;

        for (let i = 0; i < node.entries.length; ++i) {
            for (let j = i + 1; j < node.entries.length; ++j) {
                const e1 = node.entries[i];
                const e2 = node.entries[j];
                const d = e1.mbr.merge(e2.mbr).area() - e1.mbr.area() - e2.mbr.area();
                if (d > maxd) {
                    maxd = d;
                    idx1 = i;
                    idx2 = j;
                }
            }
        }
        return [idx1, idx2];
    }

    /**
     *
     * @param {RTreeNode} node
     * @param {RTreeNode} lnode
     * @param {RTreeNode} rnode
     * @param {MBR} lmbr
     * @param {MBR} rmbr
     * @returns {[number, RTreeNode]}
     */
    _quadtaticPickNext(node, lnode, rnode, lmbr, rmbr) {
        let maxd = -1;
        let idx = -1;
        let target = null;
        for (let i = 0; i < node.entries.length; ++i) {
            const e = node.entries[i];
            if (e === null) {
                continue;
            }
            const d1 = lmbr.merge(e.mbr).area() - lmbr.area();
            const d2 = rmbr.merge(e.mbr).area() - rmbr.area();
            const d = Math.abs(d1 - d2);
            if (d > maxd) {
                maxd = d;
                idx = i;
                target = d1 < d2 ? lnode : rnode;
            }
        }
        if (Math.abs(maxd) <= 1E-10) {

            const a1 = lmbr.area();
            const a2 = lmbr.area();

            if (Math.abs(a2 - a1) <= 1E-10) {
                target = Math.random() < 0.5 ? lnode : rnode;
            } else {
                target = a1 < a2 ? lnode : rnode;
            }

        }
        return [idx, target];
    }

    /**
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _linearSplit(node, lnode, rnode) {
        //TODO
    }

    /**
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _doubleSortSplit(node, lnode, rnode) {
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

/**
 *
 */
export class RTreeNode {

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

    /**
     * @returns {RTreeNode}
     */
    static buildEmptyNode() {
        const node = new RTreeNode();
        node.id = RTreeNode.counter++;
        node.parent = null;
        node.entry = null;
        node.isLeaf = false;
        node.entries = [];
        return node;
    }

    /**
     * @param {RTreeEntry} entry
     */
    addEntry(entry) {

        this.entries.push(entry);
        this.isLeaf = entry.isLeaf;
        if (!entry.isLeaf) {
            entry.node.parent = this;
        }

    }

    /**
     * @param {RTreeNode} node
     */
    setParent(node) {
        this.parent = node;
    }

    /**
     * @returns {RTreeNode}
     */
    getParent() {
        return this.parent;
    }

}

/**
 *
 */
export class RTreeEntry {

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

    /**
     * @static
     * @param {RTreeNode} node
     * @returns {RTreeEntry}
     */
    static buildFromNode(node) {
        const entry = new RTreeEntry();
        entry.id = RTreeEntry.counter++;
        entry.isLeaf = false;
        entry.node = node;
        entry.refreshMBR();
        node.entry = entry;
        return entry;
    }

    /**
     *
     */
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

    /**
     * @param {boolean} b
     */
    setIsLeaf(b) {
        this.isLeaf = b;
    }
    /**
     * @returns {boolean}
     */
    getIsLeaf() {
        return this.isLeaf();
    }

    /**
     *
     * @param {RTreeNode} node
     */
    setNode(node) {
        this.node = node;
    }
    /**
     * @returns {RTreeNode}
     */
    getNode() {
        return this.node;
    }

    /**
     *
     * @param {Geometry} geom
     */
    setGeom(geom) {
        this.geom = geom;
    }
    /**
     * @returns {Geometry}
     */
    getGeom() {
        return this.geom;
    }

};