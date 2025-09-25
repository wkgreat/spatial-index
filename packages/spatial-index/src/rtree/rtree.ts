import { Interval } from "../utils/common";
import { IDGenerator } from "../utils/utils";
import type Probe from "./probe";

/**
 * @internal
*/
class RTreeIdGenerator {

    _nodeIdGenerator: IDGenerator = new IDGenerator();
    _entryIdGenerator: IDGenerator = new IDGenerator();
    _recordIdGenerator: IDGenerator = new IDGenerator();

    constructor() {}

    genNodeId(): number {
        return this._nodeIdGenerator.genId();
    }

    genEntryId(): number {
        return this._entryIdGenerator.genId();
    }

    genRecordId(): number {
        return this._recordIdGenerator.genId();
    }
}

/**
 * Minimum Bounding Rectangle of spatial object
*/
export class RTreeMBR {


    /**
     * dimension of mbr
    */
    dim: number = 0;

    /**
     * interval of each dimension
    */
    intervals: Interval[] = [];

    constructor(...args: number[]) {
        const len = args.length;
        if (len % 2 !== 0) {
            console.error("RTreeMBR.build input must be even!");
        }
        this.dim = args.length / 2;
        for (let i = 0; i < args.length; i += 2) {
            const itv = new Interval(args[i], args[i + 1]);
            this.intervals.push(itv);
        }
    }

    /**
     * @param args number of box boundary.
     * @returns the mbr
     * @example
     * RTreeMBR.build(d1_min, d1_max, d2_min, d2_max, d3_min, d3_max,...);
    */
    static build(...args: number[]): RTreeMBR {
        const len = args.length;
        if (len % 2 !== 0) {
            console.error("RTreeMBR.build input must be even!");
        }
        const mbr = new RTreeMBR();
        mbr.dim = args.length / 2;
        for (let i = 0; i < args.length; i += 2) {
            const itv = new Interval(args[i], args[i + 1]);
            mbr.intervals.push(itv);
        }
        return mbr;
    }

    static buildFromIntervals(intervals: Interval[]): RTreeMBR {
        const mbr = new RTreeMBR();
        mbr.dim = intervals.length;
        mbr.intervals = intervals;
        return mbr;
    }

    get xmin(): number {
        return this.intervals[0].l;
    }
    get xmax(): number {
        return this.intervals[0].r;
    }
    get ymin(): number {
        return this.intervals[1].l;
    }
    get ymax(): number {
        return this.intervals[1].r;
    }
    get zmin(): number {
        return this.intervals[2].l;
    }
    get zmax(): number {
        return this.intervals[2].r;
    }

    dmin(d: number): number {
        return this.intervals[d].l;
    }

    dmax(d: number): number {
        return this.intervals[d].r;
    }

    forceDim(d: number): RTreeMBR {
        const mbr = this.clone();
        if (this.dim < d) {
            for (let i = mbr.dim; i < d; i++) {
                mbr.intervals.push(new Interval(0, 0));
            }
            mbr.dim = d;
        } else if (this.dim > d) {
            mbr.intervals = mbr.intervals.slice(0, d);
            mbr.dim = d;
        }
        return mbr;
    }

    /**
     * @returns the length of 1d mbr, the area of 2d mbr, or the volume of 3d or nd mbr.
     */
    area(): number {
        let area = 1;
        for (let d = 0; d < this.dim; ++d) {
            area *= this.intervals[d].length();
        }
        return area;
    }

    /**
     * @param mbr the mbr that this mbr merge with
     * @returns the merged mbr
     */
    merge(mbr: RTreeMBR | null): RTreeMBR {

        if (mbr === null) {
            return this.clone();
        }
        if (this.dim !== mbr.dim) {
            console.error("RTreeMBR merge, different dimension!");
        }
        const newItv: Interval[] = [];
        for (let d = 0; d < this.dim; ++d) {
            newItv.push(this.intervals[d].merge(mbr.intervals[d]));
        }
        return RTreeMBR.buildFromIntervals(newItv);
    }

    /**
     * @param mbr the mbr will merge into this mbr.
    */
    addMbrInplace(mbr: RTreeMBR): void {
        if (this.dim !== mbr.dim) {
            console.error("RTreeMBR addMbrInplace, different dimension!");
        }
        for (let d = 0; d < this.dim; ++d) {
            this.intervals[d].mergeInplace(mbr.intervals[d]);
        }
    }

    /**
     * if this mbr overlaps with other mbr
     * @param mbr other mbr
     */
    overlap(mbr: RTreeMBR): boolean {
        if (this.dim !== mbr.dim) {
            console.error("RTreeMBR overlap, different dimension!");
        }
        for (let d = 0; d < this.dim; ++d) {
            if (!this.intervals[d].overlap(mbr.intervals[d])) {
                return false;
            }
        }
        return true;
    }

    /**
     * if this mbr within other mbr
     * @param mbr other mbr
    */
    within(mbr: RTreeMBR): boolean {
        if (this.dim !== mbr.dim) {
            console.error("RTreeMBR within, different dimension!");
        }
        for (let d = 0; d < this.dim; ++d) {
            if (!this.intervals[d].within(mbr.intervals[d])) {
                return false;
            }
        }
        return true;
    }

    /**
     * clone this mbr
     * @returns the cloned mbr
     */
    clone(): RTreeMBR {
        const nums = this.intervals.flatMap(t => [t.l, t.r]);
        const mbr = RTreeMBR.build(...nums);
        return mbr;
    }
}

type ToRtreeMBRFunc = (object: any) => RTreeMBR;

type PickSeedsFuncType = (node: RTreeNode) => [number, number];
type PickNextFuncType = (node1: RTreeNode, node2: RTreeNode, node3: RTreeNode, mbr1: RTreeMBR, mbr2: RTreeMBR) => [number, RTreeNode]
type RTreeSearchCheckFuncType = (entry: RTreeEntry, mbr: RTreeMBR) => boolean;

interface LinearPickSeedsDimInfo {
    maxLow: number;
    minHigh: number;
    minLow: number;
    maxHigh: number;
    maxLow_eidx: number;
    minHigh_eidx: number;
}

/**
 * RTree class
*/
export class RTree {

    /**
     * @readonly
     * the minimum number of entries per node
    */
    m: number = 2;

    /**
     * @readonly
     * the maximum number of entries per node
    */
    M: number = 5;

    /**
     * @internal
     * dimension of Rtree
     * */
    _dim: number = 2;

    /**
     * @internal
     * */
    _toMbrFunc: ToRtreeMBRFunc | null = null;

    /**
     * the root of r-tree
    */
    root: RTreeNode | null = null;

    /**
     * @internal
     * */
    _probe: Probe | null = null;

    /**
     * @internal
     * */
    _idGenerator: RTreeIdGenerator = new RTreeIdGenerator();

    /**
     * @param m minimum number of entries in a node, m should be little or equal than M.
     * @param M maximum number of entries in a node.
     * @param d dimension of rtree
     */
    constructor(m: number = 2, M: number = 5, d: number = 2) {
        if (m < 2) {
            console.error("RTree should m >= 2");
        }
        if (m > M / 2) {
            console.error("RTree should m <= M / 2");
        }
        if (d <= 0) {
            console.error("RTree should d >= 1");
        }
        this.m = m;
        this.M = M;
        this._dim = d;
    }

    /**
     * @param {Probe} probe 
    */
    setProbe(probe: Probe) {
        this._probe = probe;
    }

    /**
     * @param {ToRtreeMBRFunc} f 
    */
    setToMbrFunc(f: ToRtreeMBRFunc) {
        this._toMbrFunc = f;
    }

    /**
     * @internal
     * @param {object} data
     * @param {ToRtreeMBRFunc} toMbrFunc
     * @returns {RTreeMBR|null}
    */
    _getDataMbr(data: any, toMbrFunc?: ToRtreeMBRFunc): RTreeMBR | null {
        if (toMbrFunc) {
            return toMbrFunc(data);
        } else if (this._toMbrFunc) {
            return this._toMbrFunc(data);
        } else {
            console.error("toMbrFunc is NULL! you must set a toMbrFunc before.");
            return null;
        }
    }

    /**
     * @internal
     * @param {string} tag
     * @param {object} data
     */
    __probe__(tag: string, data: object) {
        if (this._probe) {
            this._probe.probe(tag, data);
        }
    }

    /**
     * @returns {number} the level of leaf node
     * the root level is zero.
    */
    getLeafLevel(): number {
        if (this.root == null) {
            return -1;
        }
        let l = 0;
        let n: RTreeNode | null = this.root;
        while (n && !n.isLeaf) {
            const entry = n.entries[0] as RTreeEntry;
            if (entry) {
                n = entry.node;
                l += 1;
            }
        }
        return l;
    }

    /**
     * @param {RTreeNode} node
     * @returns {number} get depth from node downward 
     * leaf node depth is zero.
    */
    getDepthFromNode(node: RTreeNode): number {
        let depth = 0;
        let n: RTreeNode | null = node;
        while (n && !n.isLeaf) {
            const entry: RTreeEntry = n.entries[0] as RTreeEntry;
            if (entry) {
                n = entry.node;
                depth += 1;
            }
        }
        return depth;
    }

    /**
     * @internal
     * @param {RTreeEntry} entry
     * @param {number} level
     */
    _insertEntry(entry: RTreeEntry, level: number) {

        let pnode = this._chooseNodeEntryIn(entry, level);

        if (pnode) {
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
    }

    /**
     * @internal
     * @param {RTreeEntry} entry
     * @param {number} entry_level
     * @returns {RTreeNode}
     */
    _chooseNodeEntryIn(entry: RTreeEntry, entry_level: number): RTreeNode | null {
        if (this.root === null) {
            this.root = RTreeNode.buildRoot(this);
        }

        let level = 0;
        let N: RTreeNode | null = this.root;

        if (N === null) {
            return null;
        }

        while (level < entry_level) {

            let bestEntry: RTreeEntry | null = null;
            let bestCost = Infinity;
            let bestArea = Infinity;

            if (N) {
                for (let e of N.entries) {

                    let a0 = e!.mbr!.area();
                    let a1 = e!.mbr!.merge(entry.mbr).area();
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
            }

            if (bestEntry) {
                N = bestEntry.node;
                level += 1;
            }
        }

        return N;
    }

    /**
     * insert a data into rtree
     * @param data the data or object
     * @param toMbrFunc the function that convert the data to mbr
     * toMbrFunc is optional.
     * if not provide toMbrFunc parameter, rtree will use predefined ToRtreeMBRFunc to convert this data.
     * the predefined ToRtreeMBRFunc should be set by calling rtree.setToMbrFunc function.
    */
    insert(data: any, toMbrFunc?: ToRtreeMBRFunc) {

        this.__probe__("rtree:insert:start", { target: this, data: data });

        if (data === null) {
            console.warn("RTree insert, data is null!");
            this.__probe__("rtree:insert:finish", { target: this, node: null, entry: null, record: null, data: null });
            return;
        }

        let mbr = this._getDataMbr(data, toMbrFunc);

        if (mbr === null) {
            console.warn("RTree insert, mbr is null!");
            this.__probe__("rtree:insert:finish", { target: this, node: null, entry: null, record: null, data: null });
            return;
        }

        if (this._dim !== mbr.dim) {
            console.warn("RTree insert, dim is not same, mbr will be forced to rtree dim!");
            mbr = mbr.forceDim(this._dim);
        }

        const record = new RTreeRecord(this, data, mbr);

        if (data === null) {
            console.warn("RTree insert, ");
            this.__probe__("rtree:insert:finish", { target: this, node: null, entry: null, record: null, data: null });
            return;
        }

        let entry = RTreeEntry.buildFromRecord(record);

        let leaf = this._chooseLeaf(entry);

        if (leaf) {
            leaf.addEntry(entry); // add entry to leaf

            let lnode = null, rnode = null;

            if (leaf.entries.length > this.M) { // leaf is full, split

                [lnode, rnode] = this._splitNode(leaf);

            } else {
                lnode = leaf;
                rnode = null;
            }

            this._adjustTree(leaf, lnode, rnode);
        }

        this.__probe__("rtree:insert:finish", { target: this, node: leaf, entry: entry, record: record, data: data });

    }

    /**
     * @internal
     * 
     * @param {RTreeEntry} entry
     * @returns {RTreeNode} leaf node 
    */
    _chooseLeaf(entry: RTreeEntry): RTreeNode | null {

        if (this.root === null) {
            this.root = RTreeNode.buildRoot(this);
        }

        let N: RTreeNode | null = this.root;

        if (!N) {
            return null;
        }

        while (N && !N.isLeaf) {

            let bestEntry: RTreeEntry | null = null;
            let bestCost = Infinity;
            let bestArea = Infinity;

            for (let e of N!.entries) {
                let a0 = e!.mbr!.area();
                let a1 = e!.mbr!.merge(entry.mbr).area();
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

            N = bestEntry ? bestEntry.node : null;

        }

        return N;

    }

    /**
     * @internal
     * 
     * @param {RTreeNode} rawnode 
     * @param {RTreeNode} node1
     * @param {RTreeNode|null} node2
    */
    _adjustTree(rawnode: RTreeNode, node1: RTreeNode, node2: RTreeNode | null) {

        let R: RTreeNode = rawnode;
        let P: RTreeNode | null = R.parent;
        let N1: RTreeNode = node1;
        let N2: RTreeNode | null = node2;

        while (R !== this.root) {

            if (N2 !== null) {
                N2.parent = N1!.parent;
                const e1 = RTreeEntry.buildFromNode(N1);
                const e2 = RTreeEntry.buildFromNode(N2);
                P!.entries = P!.entries.filter(e => e!.node !== R); // remove old entry
                P!.addEntry(e1); // add new entry
                P!.addEntry(e2); // add new entry

                if (N2 && N2.parent && N2.parent.entries.length > this.M) {
                    R = R!.parent as RTreeNode;
                    P = R!.parent;
                    [N1, N2] = this._splitNode(N2.parent);
                } else {
                    R = R!.parent as RTreeNode;
                    P = R!.parent;
                    N1 = R;
                    N2 = null;
                }
            } else {


                N1!.entry!.refreshMBR();

                R = N1!.parent as RTreeNode;
                P = R!.parent;
                N1 = R;
                N2 = null;
            }
        }

        if (R === this.root && N1 !== null && N2 !== null) { // has propagated to root
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
     * @internal
     * @private
     * @param {RTreeNode} node
     * @param {RTreeEntry} entry  
    */
    _removeEntryFromNode(node: RTreeNode, entry: RTreeEntry) {
        node.entries.splice(node.entries.indexOf(entry), 1);
    }

    /**
     * 
     * @param data the data need delete from the rtree
     * @param toMbrFunc the function that convert the data to mbr
     * toMbrFunc is optional.
     * if not provide toMbrFunc parameter, rtree will use predefined ToRtreeMBRFunc to convert this data.
     * the predefined ToRtreeMBRFunc should be set by calling rtree.setToMbrFunc function.
    */
    delete(data: any, toMbrFunc?: ToRtreeMBRFunc): void {

        this.__probe__("rtree:delete:start", { target: this, data: data });

        const mbr = this._getDataMbr(data, toMbrFunc);

        if (!mbr) {
            return;
        }

        const [leaf, entry] = this._findLeaf(data, mbr);
        if (leaf === null || entry === null) {
            return;
        }

        this._removeEntryFromNode(leaf, entry);
        this._condenseTree(leaf);

        if (this.root && this.root.entries.length === 1 && !this.root.isLeaf) {
            const newRoot = this.root.entries[0]!.node;
            newRoot!.parent = null;
            newRoot!.entry = null;
            this.root = newRoot;
        }

        this.__probe__("rtree:delete:finish", { target: this, data: data });
    };

    /**
     * @internal
     * 
     * @param {object} data
     * @param {RTreeMBR} mbr 
     * @returns {[RTreeNode,RTreeEntry]} 
    */
    _findLeaf(data: any, mbr: RTreeMBR): [RTreeNode | null, RTreeEntry | null] {

        const nodes: RTreeNode[] = []; //stack of nodes
        if (this.root) {
            nodes.push(this.root);
        }
        while (nodes.length > 0) {
            const node = nodes.pop() as RTreeNode;
            if (!node!.isLeaf) {
                for (let e of node!.entries) {
                    if (mbr.overlap(e!.mbr as RTreeMBR)) {
                        nodes.push(e!.node as RTreeNode);
                    }
                }
            } else {
                for (let e of node!.entries) {
                    if (e!.record!.data === data) { //here check geom is equal
                        return [node, e];
                    }
                }
            }
        }
        return [null, null];
    };

    /**
     * @internal
     * 
     * @param {RTreeNode} node
     * @returns {number}
     */
    _getEntryInsertLevelByNode(node: RTreeNode) {
        const level = this.getLeafLevel();
        const depth = this.getDepthFromNode(node);
        return level - depth;
    }

    /**
     * @internal
     * 
     * @param {RTreeNode} node the node need condense 
     * @returns {void}
    */
    _condenseTree(node: RTreeNode) {

        const q = [];
        let n: RTreeNode = node;

        while (n != this.root) { // if n is not root node

            const p = n.parent as RTreeNode;
            const e = n.entry as RTreeEntry;

            if (n.entries.length < this.m) { // need delete node n and delete entry e of n  

                this._removeEntryFromNode(p, e);// delete entry from parent node
                q.push(n); // q add deleted n

            } else { // not delete and refresh mbr of entry e
                e.refreshMBR();
            }

            n = n.parent as RTreeNode; //move upward
        }

        // here n is already root node. reinsert
        for (let n of q) {
            const level = this._getEntryInsertLevelByNode(n);
            for (let e of n!.entries) {
                this._insertEntry(e as RTreeEntry, level);
            }
        }
    }


    /**
     * @internal
     * 
     * @param {RTreeNode} node 
     * @returns {[RTreeNode,RTreeNode]} return two nodes
    */
    _splitNode(node: RTreeNode): [RTreeNode, RTreeNode] {
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
                if (e!.node) {
                    e!.node.parent = lnode;
                }

            }
            for (let e of rnode.entries) {
                if (e!.node) {
                    e!.node.parent = rnode;
                }
            }
        }

        return [lnode, rnode];

    }

    /**
     * @internal
     * 
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _randomSplit(node: RTreeNode, lnode: RTreeNode, rnode: RTreeNode) {

        lnode.entries = [...node.entries.slice(0, this.m)];
        rnode.entries = [...node.entries.slice(this.m)];

    }

    /**
     * @internal
     * 
     * @param {RTreeNode} fromNode
     * @param {RTreeNode} toNode
     * @param {number} idx
     * move the idx-th entry of node1 to node2, and remove this entry from node1   
    */
    _moveEntryToNode(fromNode: RTreeNode, toNode: RTreeNode, idx: number) {
        if (fromNode.entries[idx] === null) {
            console.error("entry is NULL!");
        }
        toNode.entries.push(fromNode.entries[idx] as RTreeEntry);
        fromNode.entries[idx] = null; // soft remove
    }

    /**
     * @internal
     * 
     * @param {RTreeNode} node
     * @returns {RTreeMBR}
     */
    _computeNodeMbr(node: RTreeNode) {
        if (node === null || node.entries.length === 0) {
            return null;
        }
        const mbr = node.entries[0]!.mbr!.clone();
        for (let i = 1; i < node.entries.length; ++i) {
            if (node.entries[i]) {
                mbr.addMbrInplace(node.entries[i]!.mbr as RTreeMBR);
            }

        }
        return mbr;
    }

    /**
     * @internal
     * 
     * @typedef {(node)=>[number,number]} PickSeedsFuncType
     * @typedef {(RTreeNode,RTreeNode,RTreeNode,MBR,MBR)=>[number,RTreeNode]} PickNextFuncType
     * 
     * @param {RTreeNode} node
     * @param {RTreeNode} lnode
     * @param {RTreeNode} rnode
     * @param {PickSeedsFuncType} pickSeedsFunc    
     * @param {PickNextFuncType} pickNextFunc 
    */
    _splitFramework(node: RTreeNode, lnode: RTreeNode, rnode: RTreeNode, pickSeedsFunc: PickSeedsFuncType, pickNextFunc: PickNextFuncType) {
        let tot = node.entries.length;
        let cnt = 0;
        let lcnt = 0;
        let rcnt = 0;
        let lmbr = null;
        let rmbr = null;
        const [idx1, idx2] = pickSeedsFunc(node);
        if (idx1 === idx2) {
            console.error("idx1===idx2");
        }
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

            const [idx, target] = pickNextFunc(node, lnode, rnode, lmbr as RTreeMBR, rmbr as RTreeMBR);
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
     * @internal
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _quadtaticSplit(node: RTreeNode, lnode: RTreeNode, rnode: RTreeNode) {
        this._splitFramework(node, lnode, rnode, this._quadtaticPickSeeds.bind(this), this._pickNext_minExpandArea.bind(this));
    }

    /**
     * @internal
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void} 
    */
    _linearSplit(node: RTreeNode, lnode: RTreeNode, rnode: RTreeNode) {
        this._splitFramework(node, lnode, rnode, this._linearPickSeeds.bind(this), this._pickNext_minExpandArea.bind(this));
    }

    /**
     * @internal
     * @param {RTreeNode} node the old node
     * @param {RTreeNode} lnode the new left node
     * @param {RTreeNode} rnode the new right node 
     * @returns {void}
    */
    _doubleSortSplit(node: RTreeNode, lnode: RTreeNode, rnode: RTreeNode) {
        //TODO
    }

    /**
     * @internal
     * @type {PickSeedsFuncType}
     */
    _quadtaticPickSeeds(node: RTreeNode): [number, number] {
        let maxd = -1;
        let idx1 = -1;
        let idx2 = -1;

        for (let i = 0; i < node.entries.length; ++i) {
            for (let j = i + 1; j < node.entries.length; ++j) {
                const e1 = node.entries[i];
                const e2 = node.entries[j];
                const d = e1!.mbr!.merge(e2!.mbr).area() - e1!.mbr!.area() - e2!.mbr!.area();
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
     * @internal
    */
    _genLinearSeedDimInfo(): LinearPickSeedsDimInfo {

        return {
            maxLow: -Infinity,
            minHigh: Infinity,
            minLow: Infinity,
            maxHigh: -Infinity,
            maxLow_eidx: -1,
            minHigh_eidx: -1
        }
    }

    /**
     * @internal
    */
    _calDimInfoSeperation(dinfo: LinearPickSeedsDimInfo) {
        return (dinfo.maxLow - dinfo.minHigh) / (dinfo.maxHigh - dinfo.minLow);
    }

    /**
     * @internal
     * @type {PickSeedsFuncType}
     */
    _linearPickSeeds(node: RTreeNode): [number, number] {

        const dimInfos: LinearPickSeedsDimInfo[] = [];
        for (let d = 0; d < this._dim; ++d) {
            dimInfos.push(this._genLinearSeedDimInfo());
        }

        for (let i = 0; i < node.entries.length; ++i) {
            const e = node.entries[i];
            for (let d = 0; d < this._dim; ++d) {
                if (e!.mbr!.dmin(d) > dimInfos[d].maxLow) {
                    dimInfos[d].maxLow = e!.mbr!.dmin(d);
                    dimInfos[d].maxLow_eidx = i;
                }
                if (e!.mbr!.dmax(d) < dimInfos[d].minHigh) {
                    dimInfos[d].minHigh = e!.mbr!.dmax(d);
                    dimInfos[d].minHigh_eidx = i;
                }
                if (e!.mbr!.dmin(d) < dimInfos[d].minLow) {
                    dimInfos[d].minLow = e!.mbr!.dmin(d);
                }
                if (e!.mbr!.dmax(d) > dimInfos[d].maxHigh) {
                    dimInfos[d].maxHigh = e!.mbr!.dmax(d);
                }
            }
        }

        const validDimInfos = dimInfos.filter(info => info.maxLow_eidx !== info.minHigh_eidx);

        if (validDimInfos.length === 0) {
            const dinfo = dimInfos.reduce((p, c) => this._calDimInfoSeperation(p) > this._calDimInfoSeperation(c) ? p : c);
            return [dinfo.maxLow_eidx, (dinfo.minHigh_eidx + 1) % node.entries.length];
        } else {
            const dinfo = validDimInfos.reduce((p, c) => this._calDimInfoSeperation(p) > this._calDimInfoSeperation(c) ? p : c);
            return [dinfo.maxLow_eidx, dinfo.minHigh_eidx];
        }
    }

    /**
     * @internal
     * @type {PickNextFuncType}
     */
    _pickNext_minExpandArea(node: RTreeNode, lnode: RTreeNode, rnode: RTreeNode, lmbr: RTreeMBR, rmbr: RTreeMBR): [number, RTreeNode] {
        let maxd = -1;
        let idx = -1;
        let target = null;
        for (let i = 0; i < node.entries.length; ++i) {
            const e = node.entries[i];
            if (e === null) {
                continue;
            }
            const d1 = lmbr.merge(e!.mbr).area() - lmbr.area();
            const d2 = rmbr.merge(e!.mbr).area() - rmbr.area();
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
        return [idx, target as RTreeNode];
    }

    /**
     * use mbr to search for leaf entries that check func returns true
     * @param mbr search mbr 
     * @param check_func check the entry and the mbr is matched
     * @returns the leaf entries that match. these entries point to records contain the target spatial data.
    */
    search(mbr: RTreeMBR, check_func: RTreeSearchCheckFuncType): RTreeEntry[] {

        const nodes = [];
        const res_entries = [];

        if (!this.root) {
            return [];
        }

        nodes.push(this.root);

        while (nodes.length > 0) {
            const node = nodes.shift() as RTreeNode;

            this.__probe__("rtree:search:path", { target: this, node: node, entry: null });

            if (node.isLeaf) {
                for (let e of node.entries) {
                    if (check_func(e as RTreeEntry, mbr)) {
                        this.__probe__("rtree:search:path", { target: this, node: node, entry: e });
                        res_entries.push(e);
                    }
                }
            } else {
                for (let e of node.entries) {
                    if (check_func(e as RTreeEntry, mbr)) {
                        this.__probe__("rtree:search:path", { target: this, node: node, entry: e });
                        nodes.push(e!.node);
                    }
                }
            }
        }

        return res_entries as RTreeEntry[];
    };


    /**
     * search data that overlap with mbr.
     * @param mbr the mbr
     * @returns some of leaf entries. these entries point to records contain the target spatial data.
    */
    search_overlap(mbr: RTreeMBR): RTreeEntry[] {
        this.__probe__("rtree:search_overlap:start", { target: this, mbr });
        const result = this.search(mbr, (entry, mbr) => {
            return entry!.mbr!.overlap(mbr);
        });
        this.__probe__("rtree:search_overlap:finish", { target: this, mbr: mbr, result: result });
        return result;
    }

    /**
     * clear the rtree to empty.
    */
    clear() {
        this.__probe__("rtree:clear:start", { target: this });
        this.root = null;
        this.__probe__("rtree:clear:finish", { target: this });
    }

    /**
     * is the rtree is empty
    */
    isEmpty(): boolean {
        return this.root === null || this.root.entries.length === 0;
    }

};

/**
 * The node of r-tree
*/
export class RTreeNode {

    /**
     * The tree that belongs to
    */
    tree: RTree | null = null;

    /**
     * @internal
     * */
    _id: number | null = null;

    /**
     * parent node of this.
    */
    parent: RTreeNode | null = null;

    /**
     * this entry point to this in parent node
    */
    entry: RTreeEntry | null = null;

    /**
     * is the node leaf or not.
    */
    isLeaf: boolean = false;

    /**
     * the entries in this node.
    */
    entries: (RTreeEntry | null)[] = [];

    /**
     * build a root node for a tree
     * @param tree the tree
     * @returns the root node
    */
    static buildRoot(tree: RTree) {
        const root = new RTreeNode();
        root.tree = tree;
        root.parent = null;
        root.entry = null;
        root.isLeaf = true;
        root.entries = [];
        return root;
    }

    get id() {
        if (!this.tree) {
            return -1;
        }
        if (this._id === null) {
            this._id = this.tree._idGenerator.genNodeId();
        }
        return this._id;
    }

    /**
     * build a empty node for a tree
     * @param tree the tree
     * @returns the empty node
     */
    static buildEmptyNode(tree: RTree): RTreeNode {
        const node = new RTreeNode();
        node.tree = tree;
        node.parent = null;
        node.entry = null;
        node.isLeaf = false;
        node.entries = [];
        return node;
    }

    /**
     * add a entry into the node
     * @param entry
     */
    addEntry(entry: RTreeEntry): void {

        this.entries.push(entry);
        this.isLeaf = entry.isLeaf;
        if (!entry.isLeaf && entry.node) {
            entry.node.parent = this;
        }

    }

}

/**
 * Entry of r-tree
*/
export class RTreeEntry {

    /**
     * the tree that belongs to
    */
    tree: RTree | null = null;

    /**
     * @internal
    */
    _id: number | null = null;

    /**
     * mbr of this entry
    */
    mbr: RTreeMBR | null = null;

    /**
     * is leaf entry.
    */
    isLeaf: boolean = false;

    /**
     * if not leaf entry, node is child node that the entry point
    */
    node: RTreeNode | null = null;

    /**
     * if leaf entry, record is not null
    */
    record: RTreeRecord | null = null;

    /**
     * build a entry for the record
     * @param record the record
     * @returns the entry
    */
    static buildFromRecord(record: RTreeRecord): RTreeEntry {
        const entry = new RTreeEntry();
        entry.tree = record.tree;
        entry.mbr = record.mbr;
        entry.isLeaf = true;
        entry.node = null;
        entry.record = record;
        return entry;
    }

    /**
     * build a entry for a node
     * @param node the node
     * @returns the entry
     */
    static buildFromNode(node: RTreeNode): RTreeEntry {
        const entry = new RTreeEntry();
        entry.tree = node.tree;
        entry.isLeaf = false;
        entry.node = node;
        entry.refreshMBR();
        node.entry = entry;
        return entry;
    }

    get id() {
        if (!this.tree) {
            return -1;
        }
        if (this._id === null) {
            this._id = this.tree._idGenerator.genEntryId();
        }
        return this._id;
    }

    /**
     * refresh the mbr of this entry
    */
    refreshMBR() {

        if (this.isLeaf && this.record) {
            this.mbr = this.record.mbr;
        } else {
            if (this.node && this.node.entries.length > 0) {
                let entry = this.node.entries[0];
                if (entry) {
                    let mbr = entry.mbr;
                    for (let i = 1; i < this.node.entries.length; ++i) {
                        mbr = mbr!.merge(this.node.entries[i]!.mbr as RTreeMBR);
                    }
                    this.mbr = mbr;
                }

            }
        }
    }
};

/**
 * A leaf node point to a RTreeRecord object
 * RTreeRecord contains a data field (geometry object or other object contains spatial information) and a mbr and a record id.
*/
export class RTreeRecord {

    /**
     * the tree that belongs to
    */
    tree: RTree | null = null;

    /**
     * @internal
    */
    _id: number | null = null;

    /**
     * the mbr
    */
    mbr: RTreeMBR | null = null;

    /**
     * the data that the record contains. it is the ultimate object the r-tree index for
    */
    data: object | null = null;

    /**
     * @param tree the tree
     * @param data the data for indexing
     * @param mbr the mbr of this data
    */
    constructor(tree: RTree, data: object, mbr: RTreeMBR | null) {
        this.tree = tree;
        this.data = data;
        this.mbr = mbr;
    }

    get id() {
        if (!this.tree) {
            return -1;
        }
        if (this._id === null) {
            this._id = this.tree._idGenerator.genRecordId();
        }
        return this._id;
    }
}