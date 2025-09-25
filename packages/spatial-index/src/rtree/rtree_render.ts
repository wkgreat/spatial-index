import cytoscape from "cytoscape";
import Probe from "./probe";
import { RTreeMBR, RTree, RTreeEntry, RTreeNode, RTreeRecord } from "./rtree";

type RTreeRenderExtent = [number, number, number, number];
type RTreeRenderCanvasCoordConvertFuncType = (x: number, y: number) => [number, number];
type RTreeState = 'NULL' | 'SELECT' | 'INSERT' | 'SEARCH' | 'DELETE';

/**
 * @internal
*/
class RTreeStateMachine {

    state: RTreeState = "NULL";

    selectEntry: RTreeEntry | null = null;
    selectNode: RTreeNode | null = null;
    selectRecord: RTreeRecord | null = null;

    insertResultNode: RTreeNode | null = null;
    insertResultEntry: RTreeEntry | null = null;
    insertRecord: RTreeRecord | null = null;
    insertData: object | null = null;


    searchCondition: RTreeMBR | null = null;
    searchPath: (RTreeNode | RTreeEntry)[] | null = [];
    searchResults: RTreeEntry[] | null = null;

    constructor() {}

    setInsert(resultNode: RTreeNode | null, resultEntry: RTreeEntry | null, record: RTreeRecord | null, data: object | null) {
        this.state = 'INSERT';
        this.insertResultNode = resultNode;
        this.insertResultEntry = resultEntry;
        this.insertRecord = record;
        this.insertData = data;
    }

    setSelect(selectEntry: RTreeEntry | null, selectNode: RTreeNode | null, selectRecord: RTreeRecord | null) {
        this.state = 'SELECT';
        this.selectEntry = selectEntry;
        this.selectNode = selectNode;
        this.selectRecord = selectRecord;
    }

    startSearch(searchCondition: RTreeMBR | null) {
        this.state = 'SEARCH';
        this.searchCondition = searchCondition;
        this.searchPath = [];
    }

    addSearchPath(node: RTreeNode, entry: RTreeEntry) {

        if (this.searchPath === null) {
            this.searchPath = [];
        }
        if (entry) {
            this.searchPath.push(entry);
        } else if (node) {
            this.searchPath.push(node);
        }

    }

    finishSearch(searchResults: RTreeEntry[]) {
        this.searchResults = searchResults;
    }

    setDelete() {
        this.state = 'DELETE';
    }

    clear() {
        this.state = "NULL";
    }

}


/**
 * the RTreeRender construct options
*/
interface RTreeRenderOptions {
    /**
     * the tree for render
    */
    rtree: RTree;

    /**
     * the div dom id for render rtree tree structure
    */
    graph_div_id: string;

    /**
     * the canvas dom id for render tree mbr structure
    */
    canvas_div_id: string;
}


/**
 * the web render for the rtree structure
*/
export class RTreeRender extends Probe {

    /**
     * @internal
    */
    layout_breadthfirst = {
        name: 'breadthfirst',
        roots: "",
        rankDir: 'TB',        // 从左到右
        spacingFactor: 1.3,   // 增加节点间距
        nodeSpacing: 1000,
        directed: true,
        fit: false,             // 缩放以适应容器,
        avoidOverlap: true,
        grid: false,
        circle: false,
        // nodeDimensionsIncludeLabels: true,
        // animate: true,                      // 启用动画
        // animationDuration: 800,             // 动画持续 800 毫秒
    }

    /**
     * @internal
     */
    layout_cose = {
        name: 'cose'
    }

    /**
     * the div dom id for render rtree tree structure
    */
    graph_div_id = "";

    /**
     * the canvas dom id for render tree mbr structure
    */
    canvas_div_id = "";

    /**
     * @internal
     * */
    data = {
        container: document.getElementById(''),
        elements: [],
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(name)',
                }
            },
            {
                selector: 'edge',
                style: {}
            }
        ],
    };

    /**
     * the r-tree for render
    */
    rtree: RTree;

    /**
     * the data spatial extent for render
    */
    data_ext: RTreeRenderExtent = [0, 0, 0, 0];

    /** @internal */
    coordConvert: RTreeRenderCanvasCoordConvertFuncType | null = null;

    /** @internal */
    cy: cytoscape.Core | null = null;

    /** @internal */
    layout = null;

    /** @internal */
    selected_node = null;

    /** @internal */
    selected_entry = null;

    /** @internal */
    search_mbr = null;

    /** @internal */
    search_result_entries = [];

    /** @internal */
    stateMachine = new RTreeStateMachine();

    /**
     * @param {RTreeRenderOptions} options
     */
    constructor(options: RTreeRenderOptions) {

        super();

        this.rtree = options.rtree;
        this.graph_div_id = options.graph_div_id;
        this.canvas_div_id = options.canvas_div_id;
        this.data.container = document.getElementById(options.graph_div_id);

        this.rtree.setProbe(this);
        this.initGraph();
        this.addTrigger("rtree:insert:finish", this.probeRtreeInsertFinish.bind(this));
        this.addTrigger("rtree:search_overlap:start", this.probeRtreeSearchOverlapStart.bind(this));
        this.addTrigger("rtree:search:path", this.probeRtreeSearchPath.bind(this));
        this.addTrigger("rtree:search_overlap:finish", this.probeRtreeSearchOverlapFinish.bind(this));
        this.addTrigger("rtree:delete:finish", this.probeRtreeDeleteFinish.bind(this));
        this.addTrigger("rtree:clear:finish", this.probeRtreeClearFinish.bind(this));
    }

    /** @internal */
    initGraph() {

        this.cy = cytoscape(this.data);

        const that = this;

        this.cy.on('tap', 'node', (evt) => {

            let node = evt.target;

            if (node.data("type") === 'node') {

                const node_id = parseFloat(node.data("id").split("-")[1]);

                if (this.rtree === null || this.rtree.root === null) {
                    return;
                }

                const selectNode = this.searchNodeById(this.rtree.root, node_id);
                if (selectNode) {
                    let selectEntry = null;
                    if (selectNode === this.rtree.root) {
                        selectEntry = null;
                    } else {
                        selectEntry = selectNode.entry;
                    }
                    this.stateMachine.setSelect(selectEntry, selectNode, null);

                    this.refreshGraphStyle();
                    this.canvas_render();
                }

            }

            if (node.data("type") === 'entry') {

                const entry_id = parseFloat(node.data("id").split("-")[1]);

                const selectEntry = this.searchEntryById(entry_id);
                if (selectEntry) {
                    let selectNode = null;
                    let selectRecord = null;
                    if (selectEntry!.isLeaf) {
                        selectNode = null;
                        selectRecord = selectEntry.record;
                    } else {
                        selectNode = selectEntry.node;
                        selectRecord = null;
                    }
                    this.stateMachine.setSelect(selectEntry, selectNode, selectRecord);

                    this.refreshGraphStyle();
                    this.canvas_render();
                }
            }
        })
    }

    /** @internal */
    refreshGraphStyle() {
        this.refreshGraphDefaultStyle();
        this.refreshGraphStateStyle();
    }

    /** @internal */
    refreshGraphDefaultStyle() {
        if (this.cy) {
            this.cy.nodes().style({
                'shape': 'rectangle',
                'padding': '10px',
                'background-color': 'blue',
                'color': '#fff',
                'text-valign': 'center',
                'text-halign': 'center',
                'border-color': 'white',
                'border-width': '1px',
            });
            this.cy.edges().style({
                'line-color': 'white',
                'width': 2,
                'curve-style': 'bezier',
                'target-arrow-color': 'white',
                'target-arrow-shape': 'triangle'
            })
            this.cy.nodes('[type = "node"]').style({
                'background-color': 'red',
                'text-rotation': 'autorotate',
                'text-margin-y': -50
            });
            this.cy.nodes('[isLeaf = "true"]').style({
                'border-color': 'white',
                'background-color': 'green',
            });
            this.cy.nodes('[isLeaf = "false"]').style({
                'border-color': 'white',
                'background-color': 'blue',
            });
            this.cy.nodes('[type = "entry"]').style({
                'border-width': '1px',
                'border-color': 'white',
                'background-color': 'white',
                'width': 10,
                'height': 10,
                'background-opacity': 0.5
            });
            this.cy.nodes('[classes = "aux"]').style({
                'display': 'none'
            });
            this.cy.edges('[classes = "aux"]').style({
                'display': 'none'
            });
            this.cy.nodes('[type = "record"]').style({
                'background-color': 'red',
                'background-opacity': 0.4,
                'width': 8,
                'height': 8,
            })
        }
    }

    /** @internal */
    refreshGraphStateStyle() {

        if (!this.cy) {
            return;
        }

        if (this.stateMachine.state === 'NULL') {
            // do nothing
        }
        else if (this.stateMachine.state === 'SELECT') {

            const nodeId = this.stateMachine.selectNode ? this.stateMachine.selectNode.id : -1;
            const entryId = this.stateMachine.selectEntry ? this.stateMachine.selectEntry.id : -1;
            const recordId = this.stateMachine.selectRecord ? this.stateMachine.selectRecord.id : -1;

            const nodeGraphId = nodeId >= 0 ? `#node-${nodeId}` : null;
            const entryGraphId = entryId >= 0 ? `#entry-${entryId}` : null;
            const recordGraphId = recordId >= 0 ? `#record-${recordId}` : null;

            if (nodeGraphId) {
                const nodeElement = this.cy.$(nodeGraphId).first();
                nodeElement.style({
                    // 'border-opacity': 1,
                    'border-width': '4px',
                    'border-color': 'red'
                });
            }

            if (entryGraphId) {
                const entryElement = this.cy.$(entryGraphId).first();
                entryElement.style({
                    // 'border-opacity': 1,
                    'border-width': '4px',
                    'border-color': 'red'
                });
            }

            if (recordGraphId) {
                const recordElement = this.cy.$(recordGraphId).first();
                recordElement.style({
                    // 'border-opacity': 1,
                    'border-width': '4px',
                    'border-color': 'red'
                });
            }

            if (nodeId >= 0 && entryId >= 0) {
                const edgeGraphId = `#edge-${entryId}-${nodeId}`
                const edgeElement = this.cy.$(edgeGraphId).first();
                edgeElement.style({
                    'line-color': 'red',
                    'width': '4px',
                    'target-arrow-color': 'red',
                });
            }

            if (entryId >= 0 && recordId >= 0) {
                const edgeGraphId = `#edge-${entryId}-record-${recordId}`
                const edgeElement = this.cy.$(edgeGraphId).first();
                edgeElement.style({
                    'line-color': 'red',
                    'width': '4px',
                    'target-arrow-color': 'red'
                });
            }
        }
        else if (this.stateMachine.state === 'INSERT') {

            if (this.stateMachine.insertData === null ||
                this.stateMachine.insertResultEntry === null ||
                this.stateMachine.insertRecord === null) {
                return;
            }

            const entry = this.stateMachine.insertResultEntry;
            const entryGraphId = `#entry-${entry.id}`;
            const entryElement = this.cy.$(entryGraphId).first();
            entryElement.style({
                'border-width': '4px',
                'border-color': 'red'
            });
            const recordId = entry!.record!.id;
            const recordGraphId = `#record-${recordId}`;
            const recordGraphElem = this.cy.$(recordGraphId).first();
            recordGraphElem.style({
                'border-width': '4px',
                'border-color': 'red'
            });
            const edgeId = `#edge-${entry.id}-record-${recordId}`
            const edgeElement = this.cy.$(edgeId).first();
            edgeElement.style({
                'line-color': 'red',
                'width': '4px',
                'target-arrow-color': 'red'
            });

        }
        else if (this.stateMachine.state === 'SEARCH') {

            if (this.stateMachine.searchPath) {
                for (let elem of this.stateMachine.searchPath) {

                    if (elem instanceof RTreeNode) {
                        const elemId = `#node-${elem.id}`;
                        const graphElem = this.cy.$(elemId).first();
                        graphElem.style({
                            'border-width': '4px',
                            'border-color': 'red'
                        });
                    }
                    else if (elem instanceof RTreeEntry) {
                        const elemId = `#entry-${elem.id}`;
                        const graphElem = this.cy.$(elemId).first();
                        graphElem.style({
                            'border-width': '4px',
                            'border-color': 'red'
                        });
                        if (elem.isLeaf) {
                            const recordId = elem!.record!.id;
                            const recordGraphId = `#record-${recordId}`;
                            const recordGraphElem = this.cy.$(recordGraphId).first();
                            recordGraphElem.style({
                                'border-width': '4px',
                                'border-color': 'red'
                            });
                            const edgeId = `#edge-${elem.id}-record-${recordId}`
                            const edge = this.cy.$(edgeId).first();
                            edge.style({
                                'line-color': 'red',
                                'width': '4px',
                                'target-arrow-color': 'red'
                            });
                        } else {
                            const edgeId = `#edge-${elem.id}-${elem!.node!.id}`;
                            const edge = this.cy.$(edgeId).first();
                            edge.style({
                                'line-color': 'red',
                                'width': '4px',
                                'target-arrow-color': 'red'
                            });
                        }
                    }
                }
            }


        }
    }

    /** @internal */
    refreshGraph() {

        if (this.cy) {
            const roots = this.rtree.isEmpty() ? "" : `#inner-node-${this.rtree!.root!.id}`
            this.layout_breadthfirst.roots = roots;
            this.cy.layout(this.layout_breadthfirst).run();
            this.refreshGraphStyle();
        }



    }


    /** @internal */
    probeRtreeInsertFinish(tag: string, data: any) {
        this.stateMachine.setInsert(data["node"], data["entry"], data["record"], data["data"]);
        this.render(); //TODO only add insert node and edge
    }

    /** @internal */
    probeRtreeSearchOverlapStart(tag: string, data: any) {
        this.stateMachine.startSearch(data["mbr"]);
    }

    /** @internal */
    probeRtreeSearchOverlapFinish(tag: string, data: any) {
        this.stateMachine.finishSearch(data["result"]);
        this.refreshGraphStyle();
    }

    /** @internal */
    probeRtreeSearchPath(tag: string, data: any) {
        const node = data["node"]
        const entry = data["entry"];
        this.stateMachine.addSearchPath(node, entry);
    }

    /** @internal */
    probeRtreeDeleteFinish(tag: string, data: any) {
        this.stateMachine.setDelete();
        this.render();
    }

    /** @internal */
    probeRtreeClearFinish(tag: string, data: any) {

        this.selected_node = null;
        this.selected_entry = null;
        this.search_mbr = null;
        this.search_result_entries = [];
        this.render();

    }

    /**
     * set the spatial extent for render
     * @param ext the spatial extent, [xmin, ymin, xmax, ymax]
     */
    setDataExtent(ext: RTreeRenderExtent): void {
        this.data_ext = ext;
        this.coordConvert = this.getCanvasCoordFunc(ext);
    }

    /**
     * @internal
     * @param {RTreeNode} node
     * @param {number} id
     * @returns {RTreeNode}
     */
    searchNodeById(node: RTreeNode, id: number): RTreeNode | null {
        if (node.id === id) {
            return node;
        } else if (node.isLeaf) {
            return null;
        }
        for (let e of node.entries) {
            let r = this.searchNodeById(e!.node as RTreeNode, id)
            if (r !== null) {
                return r;
            }
        }
        return null;
    }

    /**
     * @internal
     * @param {number} id
     * @returns {RTreeEntry}
     */
    searchEntryById(id: number): RTreeEntry | null {

        const entries = [];

        if (!this.rtree || !this.rtree.root) {
            return null;
        }

        entries.push(...this.rtree.root.entries);

        while (entries.length > 0) {
            const entry = entries.shift() as RTreeEntry;
            if (entry.id === id) {
                return entry;
            }
            if (!entry.isLeaf) {
                entries.push(...entry!.node!.entries);
            }

        }

        return null;

    }

    /**
     * @internal
     * @param {RTreeEntry} entry
     * @returns {RTreeNode}
     */
    getNodeContainingEntry(entry: RTreeEntry): RTreeNode | null {
        const nodes = [];
        if (this.rtree === null || this.rtree.root === null) {
            return null;
        }
        nodes.push(this.rtree.root);
        while (nodes.length > 0) {
            const node = nodes.shift() as RTreeNode;
            if (node.entries.includes(entry)) {
                return node;
            }
            if (!node.isLeaf) {
                for (let e of node.entries) {
                    nodes.push(e!.node);
                }
            }
        }
        return null;
    }

    /** @internal */
    clearSeletedNodeAndEntry() {
        this.selected_node = null;
        this.selected_entry = null;
    }

    /** @internal */
    clearSearch() {
        this.search_mbr = null;
        this.search_result_entries = [];
    }

    /**
     * start render
     */
    render() {
        this.graph_render();
        this.canvas_render();
    }

    /** @internal */
    addNodeToGraph(node: RTreeNode | null) {
        if (node == null) {
            return;
        }

        if (this.cy === null) {
            return;
        }

        this.cy.batch(() => {
            //node
            let d: any = { data: { id: `node-${node.id}`, type: "node", isLeaf: node.isLeaf ? "true" : "false", name: `${node.id}(${node.entries.length})` } };
            this.cy!.add({ group: 'nodes', data: d.data });

            d = { data: { id: `inner-node-${node.id}`, parent: `node-${node.id}`, type: "inner-node", isLeaf: node.isLeaf ? "true" : "false", name: `xxx`, classes: 'aux' } };
            this.cy!.add({ group: 'nodes', data: d.data });

            if (node.parent !== null) {

                //aux edge
                d = { data: { id: `inner-edge-${node.parent.id}-${node.id}`, type: "inner-edge", name: `xxx`, source: `inner-node-${node.parent.id}`, target: `inner-node-${node.id}`, classes: 'aux' } };
                this.cy!.add({ group: 'edges', data: d.data });

                //entry to node
                d = { data: { id: `edge-${node!.entry!.id}-${node.id}`, type: "edge", name: `${node.parent.id}->${node.id}`, source: `entry-${node!.entry!.id}`, target: `node-${node.id}` } };
                this.cy!.add({ group: 'edges', data: d.data });
            }
            for (let e of node.entries) {

                if (e === null) {
                    return;
                }

                //entry
                d = { data: { id: `entry-${e.id}`, type: 'entry', parent: `node-${node.id}`, isLeaf: e.isLeaf ? "true" : "false", name: `${e.id}` } };
                this.cy!.add({ group: 'nodes', data: d.data });

                //inner node to entry
                d = { data: { id: `edge-${e.id}-node-${node.id}`, type: 'inner-edge', name: "", source: `inner-node-${node.id}`, target: `entry-${e.id}`, classes: 'aux' } };
                this.cy!.add({ group: 'edges', data: d.data });

                if (e!.isLeaf) {
                    const g = e.record as RTreeRecord;
                    //record node
                    d = { data: { id: `record-${g.id}`, type: 'record', parent: `record-${g.id}`, name: `${g.id}` } };
                    this.cy!.add({ group: 'nodes', data: d.data });

                    //entry to record
                    d = { data: { id: `edge-${e.id}-record-${g.id}`, type: 'edge', name: "", source: `entry-${e.id}`, target: `record-${g.id}` } };
                    this.cy!.add({ group: 'edges', data: d.data });
                }

            }
        })
    }

    /** @internal */
    graph_render() {

        const nodes = [];

        if (this.cy === null) {
            return;
        }

        this.cy.elements().remove();

        this.refreshGraph();

        if (!this.rtree.isEmpty()) {

            nodes.push(this.rtree.root);

            while (nodes.length > 0) {

                const node = nodes.shift() as RTreeNode;

                this.addNodeToGraph(node);

                for (let e of node.entries) {

                    if (!e!.isLeaf) {
                        nodes.push(e!.node);
                    }
                }

            }
        }

        this.refreshGraph();

    }

    /** @internal */
    getCanvasCoordFunc(data_ext: RTreeRenderExtent): RTreeRenderCanvasCoordConvertFuncType {

        //TODO revert y coordinate.

        const canvas = document.getElementById(this.canvas_div_id) as HTMLCanvasElement;
        if (!canvas) {
            console.error("canvas is null!");
            return (x, y) => [0, 0];
        }
        const clientWidth = canvas.clientWidth;
        const clientHeight = canvas.clientHeight;
        canvas.height = clientHeight;
        canvas.width = clientWidth;

        const dx = 0 - data_ext[0];
        const dy = 0 - data_ext[1];
        const rx = canvas.width / (data_ext[2] - data_ext[0]);
        const ry = canvas.height / (data_ext[3] - data_ext[1]);

        return (x, y) => [dx + x * rx, dy + y * ry];
    }

    /** @internal */
    canvas_render() {

        const that = this;

        /**
         *
         * @param {CanvasRenderingContext2D} ctx
         * @param {RTreeMBR} mbr
         * @param {object} props
         * @returns {void}
         */
        function render_mbr(ctx: CanvasRenderingContext2D, mbr: RTreeMBR, props: object): void {

            const defaultProps = {
                lineWidth: 1,
                color: 'black',
                linedash: [],

            }

            const newProps = { ...defaultProps, ...props };

            if (that.coordConvert === null) {
                console.log("canvas coordinate convert function is null");
                return;
            }

            const [xmin, ymin] = that.coordConvert(mbr.xmin, mbr.ymin);
            const [xmax, ymax] = that.coordConvert(mbr.xmax, mbr.ymax);

            const x = xmin;
            const y = ymin;
            const w = xmax - xmin;
            const h = ymax - ymin;

            ctx.strokeStyle = newProps.color;
            ctx.lineWidth = newProps.lineWidth;
            ctx.setLineDash(newProps.linedash);
            ctx.strokeRect(x, y, w, h);
        }

        const canvas = document.getElementById(this.canvas_div_id) as HTMLCanvasElement | null;
        if (canvas === null) {
            console.error("canvas is null!");
            return;
        }
        const ctx = canvas.getContext("2d");
        const clientWidth = canvas.clientWidth;
        const clientHeight = canvas.clientHeight;
        canvas.height = clientHeight;
        canvas.width = clientWidth;

        if (ctx === null) {
            console.error("canvas context is null!");
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.rtree.isEmpty()) {
            return;
        }

        if (this.stateMachine.state === 'SEARCH') {
            if (this.stateMachine.searchCondition) {
                render_mbr(ctx, this.stateMachine.searchCondition, {
                    lineWidth: 5,
                    color: 'blue'
                });
            }

        }

        if (this.rtree && this.rtree.root) {

            // root
            let root_mbr = this.rtree.root.entries[0]!.mbr as RTreeMBR;
            for (let e of this.rtree.root.entries) {
                root_mbr = root_mbr.merge(e!.mbr);
            }
            let props = {
                lineWidth: 1,
                color: '#d3d3d3',
                linedash: [5, 3]
            }
            if (this.stateMachine.state === 'SELECT' && this.rtree.root === this.stateMachine.selectNode) {
                props.color = 'red';
                props.lineWidth = 5;
            }
            render_mbr(ctx, root_mbr, props);

            // not root
            const entries = [];
            entries.push(...this.rtree.root.entries);

            while (entries.length > 0) {
                const e = entries.shift() as RTreeEntry;
                const mbr = e.mbr as RTreeMBR;
                const n = this.getNodeContainingEntry(e);

                props = {
                    lineWidth: 1,
                    color: '#d3d3d3',
                    linedash: [5, 3]
                }

                if (this.stateMachine.state === 'SELECT') {
                    if (this.stateMachine.selectEntry === e) { // the selected entry or the entry of corresponding selected node
                        props.color = 'red';
                        props.lineWidth = 5;
                    } else if (this.stateMachine.selectNode === n) { // the child node of selected node
                        props.color = 'green';
                        props.lineWidth = 2;
                    }
                }

                if (this.stateMachine.state === 'SEARCH') {
                    if (this.stateMachine.searchResults?.includes(e)) {
                        props.color = 'red';
                        props.lineWidth = 2;
                    }
                }

                if (e.isLeaf) {
                    props.linedash = [];
                }

                render_mbr(ctx, mbr, props);

                if (!e.isLeaf) {
                    entries.push(...e.node!.entries);
                }
            }

        }


    }



}