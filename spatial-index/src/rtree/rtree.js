import { IDGenerator } from "../utils/utils.js";
import Probe from "./probe.js";

class RTreeIdGenerator {

    _nodeIdGenerator = new IDGenerator();
    _entryIdGenerator = new IDGenerator();
    _recordIdGenerator = new IDGenerator();

    constructor() {}

    genNodeId() {
        return this._nodeIdGenerator.genId();
    }

    genEntryId() {
        return this._entryIdGenerator.genId();
    }

    genRecordId() {
        return this._recordIdGenerator.genId();
    }
}

/**
 * @class RTreeMBR
 * Minimum Bounding Rectangle
*/
export class RTreeMBR {
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
     * @param {RTreeMBR} mbr
     * @returns {RTreeMBR}
     */
    merge(mbr) {
        return new RTreeMBR(
            Math.min(this.xmin, mbr.xmin),
            Math.min(this.ymin, mbr.ymin),
            Math.max(this.xmax, mbr.xmax),
            Math.max(this.ymax, mbr.ymax));
    }

    /**
     * @param {RTreeMBR} mbr
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
     * @param {RTreeMBR} mbr
     * @returns {boolean}
     */
    overlap(mbr) {
        const b1 = this._intervalOverlap(this.xmin, this.xmax, mbr.xmin, mbr.xmax);
        const b2 = this._intervalOverlap(this.ymin, this.ymax, mbr.ymin, mbr.ymax);
        return b1 && b2;
    }

    /**
     * @returns {RTreeMBR}
     */
    clone() {
        return new RTreeMBR(this.xmin, this.ymin, this.xmax, this.ymax);
    }
}

/**
 * @class RTree
 * @todo add write lock
 * @todo replace geometry to record
 * RTree class
 * @typedef {(object)=>RTreeMBR} ToRtreeMBRFunc
*/
export class RTree {

    /**@type {number} dimension of Rtree*/
    _dim = 2;

    /**@type {ToRtreeMBRFunc}*/
    _toMbrFunc = null;

    /**@type {RTreeNode|null}*/
    root = null;

    /**@type {Probe}*/
    _probe = null;

    /**@type {RTreeIdGenerator}*/
    _idGenerator = new RTreeIdGenerator();

    /**
     * @constructor 
     * @param {number} [m=2] - minimum number of entries in a node, m should be little or equal than M.
     * @param {number} [m=5] - maximum number of entries in a node.
     * @param {number} [d=2] - dimension of rtree
     */
    constructor(m = 2, M = 5, d = 2) {
        // TODO validate m and M
        this.m = m;
        this.M = M;
        this._dim = d;
    }

    /**
     * @param {Probe} probe 
    */
    setProbe(probe) {
        this._probe = probe;
    }

    /**
     * @param {ToRtreeMBRFunc} f 
    */
    setToMbrFunc(f) {
        this._toMbrFunc = f;
    }

    /**
     * @param {object} data
     * @param {ToRtreeMBRFunc} [toMbrFunc=null]  
    */
    _getDataMbr(data, toMbrFunc = null) {
        if (toMbrFunc) {
            return toMbrFunc(data);
        } else if (this._toMbrFunc) {
            return this._toMbrFunc(data);
        } else {
            console.error("toMbrFunc is NULL! you must set a toMbrFunc before.");
        }
    }

    /**
     * @param {string} tag
     * @param {object} data
     */
    __probe__(tag, data) {
        if (this._probe) {
            this._probe.probe(tag, data);
        }
    }

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
    _insertEntry(entry, level) {

        let pnode = this._chooseNodeEntryIn(entry, level);

        pnode.addEntry(entry); // add entry to pnode

        let lnode = null, rnode = null;

        if (pnode.entries.length > this.M) { // leaf is full, split

            [lnode, rnode] = this._splitNode(pnode);

        } else {
            lnode = pnode;
            rnode = null;
        }

        this._adjustTree(pnode, lnode, rnode);
    }

    /**
     *
     * @param {RTreeEntry} entry
     * @param {number} entry_level
     * @returns {RTreeNode}
     */
    _chooseNodeEntryIn(entry, entry_level) {
        if (this.root === null) {
            this.root = RTreeNode.buildRoot(this);
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

    insert(data, toMbrFunc = null) {

        const record = new RTreeRecord(this, data, this._getDataMbr(data, toMbrFunc));

        this.__probe__("rtree:insert:start", { target: this, record: record, data: data });

        if (data === null) {
            console.error("not support null geom now.");
            this.__probe__("rtree:insert:finish", { target: this, node: null, entry: null, record: null, data: null });
            return;
        }

        let entry = RTreeEntry.buildFromRecord(record);

        let leaf = this._chooseLeaf(entry);

        leaf.addEntry(entry); // add entry to leaf

        let lnode = null, rnode = null;

        if (leaf.entries.length > this.M) { // leaf is full, split

            [lnode, rnode] = this._splitNode(leaf);

        } else {
            lnode = leaf;
            rnode = null;
        }

        this._adjustTree(leaf, lnode, rnode);

        this.__probe__("rtree:insert:finish", { target: this, node: leaf, entry: entry, record: record, data: data });

    }

    /**
     * @param {RTreeEntry} entry
     * @returns {RTreeNode} leaf node 
    */
    _chooseLeaf(entry) {

        if (this.root === null) {
            this.root = RTreeNode.buildRoot(this);
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
    _adjustTree(rawnode, node1, node2) {

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
                    [N1, N2] = this._splitNode(N2.parent);
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
            const newRoot = RTreeNode.buildRoot(this);
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
     * @param {object} data 
     * @param {ToRtreeMBRFunc} [toMbrFunc=null]
     * @returns {void}
    */
    delete(data, toMbrFunc = null) {

        this.__probe__("rtree:delete:start", { target: this, data: data });

        const [leaf, entry] = this._findLeaf(data, this._getDataMbr(data, toMbrFunc));
        if (leaf === null || entry === null) {
            return;
        }

        this._removeEntryFromNode(leaf, entry);
        this._condenseTree(leaf);

        if (this.root.entries.length === 1 && !this.root.isLeaf) {
            const newRoot = this.root.entries[0].node;
            newRoot.parent = null;
            newRoot.entry = null;
            this.root = newRoot;
        }

        this.__probe__("rtree:delete:finish", { target: this, data: data });
    };

    /**
     * @param {object} data
     * @param {RTreeMBR} mbr 
     * @returns {[RTreeNode,RTreeEntry]} 
    */
    _findLeaf(data, mbr) {

        const nodes = []; //stack of nodes
        nodes.push(this.root);
        while (nodes.length > 0) {
            const node = nodes.pop();
            if (!node.isLeaf) {
                for (let e of node.entries) {
                    if (mbr.overlap(e.mbr)) {
                        nodes.push(e.node);
                    }
                }
            } else {
                for (let e of node.entries) {
                    if (e.record.data === data) { //here check geom is equal
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
    _condenseTree(node) {

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
                this._insertEntry(e, level);
            }
        }
    }


    /**
     * @param {RTreeNode} node 
     * @returns {[RTreeNode,RTreeNode]} return two nodes
    */
    _splitNode(node) {
        const lnode = RTreeNode.buildEmptyNode(this);
        lnode.parent = node.parent;
        lnode.entry = node.entry;
        lnode.isLeaf = node.isLeaf;

        const rnode = RTreeNode.buildEmptyNode(this);
        rnode.parent = node.parent;
        rnode.entry = null;
        rnode.isLeaf = node.isLeaf;

        // this._randomSplit(node, lnode, rnode);
        // this._quadtaticSplit(node, lnode, rnode);
        this._linearSplit(node, lnode, rnode);

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
     * @returns {RTreeMBR}
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
     * @typedef {(node)=>[number,number]} PickSeedsFuncType
     * @typedef {(RTreeNode,RTreeNode,RTreeNode,MBR,MBR)=>[number,RTreeNode]} PickNextFuncType
     * 
     * @param {RTreeNode} node
     * @param {RTreeNode} lnode
     * @param {RTreeNode} rnode
     * @param {PickSeedsFuncType} pickSeedsFunc    
     * @param {PickNextFuncType} pickNextFunc 
    */
    _splitFramework(node, lnode, rnode, pickSeedsFunc, pickNextFunc) {
        let tot = node.entries.length;
        let cnt = 0;
        let lcnt = 0;
        let rcnt = 0;
        let lmbr = null;
        let rmbr = null;
        const [idx1, idx2] = pickSeedsFunc(node);
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

            const [idx, target] = pickNextFunc(node, lnode, rnode, lmbr, rmbr);
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
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _quadtaticSplit(node, lnode, rnode) {
        return this._splitFramework(node, lnode, rnode, this._quadtaticPickSeeds.bind(this), this._pickNext_minExpandArea.bind(this));
    }

    /**
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _linearSplit(node, lnode, rnode) {
        return this._splitFramework(node, lnode, rnode, this._linearPickSeeds.bind(this), this._pickNext_minExpandArea.bind(this));
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
     * @type {PickSeedsFuncType}
     */
    _quadtaticPickSeeds(node) {
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
     * @type {PickSeedsFuncType}
     */
    _linearPickSeeds(node) {

        let x_maxLow = -Infinity;
        let x_minHigh = Infinity;
        let x_minLow = Infinity;
        let x_maxHigh = -Infinity;
        let x_maxLow_eidx = -1;
        let x_minHigh_eidx = -1;
        let y_maxLow = -Infinity;
        let y_minHigh = Infinity;
        let y_minLow = Infinity;
        let y_maxHigh = -Infinity;
        let y_maxLow_eidx = -1;
        let y_minHigh_eidx = -1;


        for (let i = 0; i < node.entries.length; ++i) {
            const e = node.entries[i];
            if (e.mbr.xmin > x_maxLow) {
                x_maxLow = e.mbr.xmin;
                x_maxLow_eidx = i;
            }
            if (e.mbr.xmax < x_minHigh) {
                x_minHigh = e.mbr.xmax;
                x_minHigh_eidx = i;
            }
            if (e.mbr.xmin < x_minLow) {
                x_maxLow = e.mbr.xmin;
            }
            if (e.mbr.xmax > x_maxHigh) {
                x_maxHigh = e.mbr.xmax;
            }
            if (e.mbr.ymin > y_maxLow) {
                y_maxLow = e.mbr.ymin;
                y_maxLow_eidx = i;
            }
            if (e.mbr.ymax < y_minHigh) {
                y_minHigh = e.mbr.ymax;
                y_minHigh_eidx = i;
            }
            if (e.mbr.ymin < y_minLow) {
                y_maxLow = e.mbr.ymin;
            }
            if (e.mbr.ymax > y_maxHigh) {
                y_maxHigh = e.mbr.ymax;
            }
        }

        const x_sep_norm = (x_maxLow - x_minHigh) / (x_maxHigh - x_minLow);
        const y_sep_norm = (y_maxLow - y_minHigh) / (y_maxHigh - y_minLow);

        if (x_sep_norm > y_sep_norm) {
            return [x_minHigh_eidx, x_maxLow_eidx];
        } else {
            return [y_minHigh_eidx, y_maxLow_eidx];
        }
    }

    /**
     *
     * @type {PickNextFuncType}
     */
    _pickNext_minExpandArea(node, lnode, rnode, lmbr, rmbr) {
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
     * @param {RTreeMBR} mbr search mbr 
     * @param {(RTreeEntry, RTreeMBR)=>boolean} check_func check the entry and the mbr is matched
     * @returns {RTreeEntry[]}
    */
    search(mbr, check_func) {

        const nodes = [];
        const res_entries = [];

        nodes.push(this.root);

        while (nodes.length > 0) {
            const node = nodes.shift();

            this.__probe__("rtree:search:path", { target: this, node: node, entry: null });

            if (node.isLeaf) {
                for (let e of node.entries) {
                    if (check_func(e, mbr)) {
                        this.__probe__("rtree:search:path", { target: this, node: node, entry: e });
                        res_entries.push(e);
                    }
                }
            } else {
                for (let e of node.entries) {
                    if (check_func(e, mbr)) {
                        this.__probe__("rtree:search:path", { target: this, node: node, entry: e });
                        nodes.push(e.node);
                    }
                }
            }
        }

        return res_entries;
    };


    /**
     * @param {RTreeMBR} mbr
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

    /**
     * @returns {void}
    */
    clear() {
        this.__probe__("rtree:clear:start", { target: this });
        this.root = null;
        this.__probe__("rtree:clear:finish", { target: this });
    }

    /**
     * @returns {boolean}
    */
    isEmpty() {
        return this.root === null || this.root.entries.length === 0;
    }

};

/**
 *
 */
export class RTreeNode {

    /**@type {RTree}*/
    tree = null;

    /**@type {string}*/
    _id = null;

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
     * @param {RTree} tree 
     * @returns {RTreeNode}
    */
    static buildRoot(tree) {
        const root = new RTreeNode();
        root.tree = tree;
        root.parent = null;
        root.entry = null;
        root.isLeaf = true;
        root.entries = [];
        return root;
    }

    get id() {
        if (this._id === null) {
            this._id = this.tree._idGenerator.genNodeId();
        }
        return this._id;
    }

    /**
     * @param {RTree} tree 
     * @returns {RTreeNode}
     */
    static buildEmptyNode(tree) {
        const node = new RTreeNode();
        node.tree = tree;
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

    /**@type {RTree}*/
    tree = null;

    /**@type {number}*/
    _id = null;

    /**
     * @type {RTreeMBR}
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
     * if leaf entry, record is not null
    */
    record = null;

    static buildFromRecord(record) {
        const entry = new RTreeEntry();
        entry.tree = record.tree;
        entry.mbr = record.mbr;
        entry.isLeaf = true;
        entry.node = null;
        entry.record = record;
        return entry;
    }

    /**
     * @static
     * @param {RTreeNode} node
     * @returns {RTreeEntry}
     */
    static buildFromNode(node) {
        const entry = new RTreeEntry();
        entry.tree = node.tree;
        entry.isLeaf = false;
        entry.node = node;
        entry.refreshMBR();
        node.entry = entry;
        return entry;
    }

    get id() {
        if (this._id === null) {
            this._id = this.tree._idGenerator.genEntryId();
        }
        return this._id;
    }

    /**
     *
     */
    refreshMBR() {

        if (this.isLeaf) {
            this.mbr = this.record.mbr;
        } else {
            let mbr = this.node.entries[0].mbr;
            for (let i = 1; i < this.node.entries.length; ++i) {
                mbr = mbr.merge(this.node.entries[i].mbr);
            }
            this.mbr = mbr;
        }

    }
};

/**
 * @class RTreeRecord
 * @template T
 * A leaf node point to a RTreeRecord object
 * RTreeRecord contains a data field (geometry object or other object contains spatial information) and a mbr and a record id.
 * @todo replace RTreeEntry geom field to record field
*/
export class RTreeRecord {

    tree = null;
    /**@type {number}*/
    _id = null;
    /**@type {RTreeMBR}*/
    mbr = null;
    /**@type {T}*/
    data = null;

    /**
     * @constructor
     * @param {T} data
     * @param {RTreeMBR} mbr
    */
    constructor(tree, data, mbr) {
        this.tree = tree;
        this.data = data;
        this.mbr = mbr;
    }

    get id() {
        if (this._id === null) {
            this._id = this.tree._idGenerator.genRecordId();
        }
        return this._id;
    }
}