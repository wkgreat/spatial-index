import cytoscape from "cytoscape";
import Probe from "./probe.js";
import { RTreeMBR, RTree, RTreeEntry, RTreeNode } from "./rtree.js";

/**
 * @class RTreeStateMachine
 * @typedef {'NULL'|'SELECT'|'INSERT'|'SEARCH'|'DELETE'} RTreeState
*/
class RTreeStateMachine {


    /**@type {RTreeState}*/
    state = "NULL";

    selectEntry = null;
    selectNode = null;
    selectRecord = null;

    insertResultNode = null;
    insertResultEntry = null;
    insertRecord = null;
    insertData = null;


    searchCondition = null;
    searchPath = null;
    searchResults = null;

    constructor() {}

    setInsert(resultNode, resultEntry, record, data) {
        this.state = 'INSERT';
        this.insertResultNode = resultNode;
        this.insertResultEntry = resultEntry;
        this.insertRecord = record;
        this.insertData = data;
    }

    setSelect(selectEntry, selectNode, selectRecord) {
        this.state = 'SELECT';
        this.selectEntry = selectEntry;
        this.selectNode = selectNode;
        this.selectRecord = selectRecord;
    }

    startSearch(searchCondition) {
        this.state = 'SEARCH';
        this.searchCondition = searchCondition;
        this.searchPath = [];
    }

    addSearchPath(node, entry) {

        if (entry) {
            this.searchPath.push(entry);
        } else if (node) {
            this.searchPath.push(node);
        }

    }

    finishSearch(searchResults) {
        this.searchResults = searchResults;
    }

    setDelete() {
        this.state = 'DELETE';
    }

    clear() {
        this.state = "NULL";

        this.selectEntry = null;
        this.selectNode = null;

        this.insertParam = null;
        this.insertResultEntry = null;

        this.searchCondition = null;
        this.searchResults = null;
    }

}

/**
 *
 */
export class RTreeRender extends Probe {

    //TODO set graph element and canvas element
    //TODO use cytoscape batch

    layout_breadthfirst = {
        name: 'breadthfirst',
        roots: null,
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

    layout_cose = {
        name: 'cose'
    }

    data = {
        container: document.getElementById('graph-div'),
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

    /**@type {RTree|null}*/
    rtree = null;

    /**@type {cytoscape.Core}*/
    cy = null;
    layout = null;

    selected_node = null;
    selected_entry = null;
    search_mbr = null;
    search_result_entries = [];

    stateMachine = new RTreeStateMachine();

    /**
     * @constructor
     * @param {RTree} rtree
     */
    constructor(rtree) {

        super();

        this.rtree = rtree;
        this.rtree.setProbe(this);
        this.initGraph();
        const that = this;
        this.addTrigger("rtree:insert:finish", this.probeRtreeInsertFinish.bind(this));
        this.addTrigger("rtree:search_overlap:start", this.probeRtreeSearchOverlapStart.bind(this));
        this.addTrigger("rtree:search:path", this.probeRtreeSearchPath.bind(this));
        this.addTrigger("rtree:search_overlap:finish", this.probeRtreeSearchOverlapFinish.bind(this));
        this.addTrigger("rtree:delete:finish", this.probeRtreeDeleteFinish.bind(this));
        this.addTrigger("rtree:clear:finish", this.probeRtreeClearFinish.bind(this));


    }

    initGraph() {

        this.cy = cytoscape(this.data);

        const that = this;

        this.cy.on('tap', 'node', (evt) => {

            let node = evt.target;

            if (node.data("type") === 'node') {

                const node_id = parseFloat(node.data("id").split("-")[1]);

                const selectNode = this.searchNodeById(this.rtree.root, node_id);
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

            if (node.data("type") === 'entry') {

                const entry_id = parseFloat(node.data("id").split("-")[1]);

                const selectEntry = this.searchEntryById(entry_id);
                let selectNode = null;
                let selectRecord = null;
                if (selectEntry.isLeaf) {
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

        })
    }


    refreshGraphStyle() {
        this.refreshGraphDefaultStyle();
        this.refreshGraphStateStyle();
    }

    refreshGraphDefaultStyle() {
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
            'line-color': 'white',
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

    refreshGraphStateStyle() {

        if (this.stateMachine.state === 'NULL') {
            // do nothing
        }
        else if (this.stateMachine.state === 'SELECT') {

            const nodeId = this.stateMachine.selectNode ? this.stateMachine.selectNode.id : -1;
            const entryId = this.stateMachine.selectEntry ? this.stateMachine.selectEntry.id : -1;
            const recordId = this.stateMachine.selectRecord ? this.stateMachine.selectRecord.id : -1;

            const nodeGraphId = nodeId >= 0 ? `#node-${this.stateMachine.selectNode.id}` : null;
            const entryGraphId = entryId >= 0 ? `#entry-${this.stateMachine.selectEntry.id}` : null;
            const recordGraphId = recordId >= 0 ? `#record-${this.stateMachine.selectRecord.id}` : null;

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

            if (this.stateMachine.insertData === null) {
                return;
            }

            const entry = this.stateMachine.insertResultEntry;
            const entryGraphId = `#entry-${entry.id}`;
            const entryElement = this.cy.$(entryGraphId).first();
            entryElement.style({
                'border-width': '4px',
                'border-color': 'red'
            });
            const recordId = entry.record.id;
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
                        const recordId = elem.record.id;
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
                        const edgeId = `#edge-${elem.id}-${elem.node.id}`;
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

    refreshGraph() {

        const roots = this.rtree.isEmpty() ? "" : `#inner-node-${this.rtree.root.id}`
        this.layout_breadthfirst.roots = roots;
        this.cy.layout(this.layout_breadthfirst).run();
        this.refreshGraphStyle();

    }

    /**
     *
     * @param {string} tag
     * @param {object} data
     */
    probeRtreeInsertFinish(tag, data) {
        this.stateMachine.setInsert(data["node"], data["entry"], data["record"], data["data"]);
        this.render(); //TODO only add insert node and edge
    }

    probeRtreeSearchOverlapStart(tag, data) {
        this.stateMachine.startSearch(data["mbr"]);
    }

    /**
     *
     * @param {string} tag
     * @param {object} data
     */
    probeRtreeSearchOverlapFinish(tag, data) {
        this.stateMachine.finishSearch(data["result"]);
        this.refreshGraphStyle();
    }

    probeRtreeSearchPath(tag, data) {
        const node = data["node"]
        const entry = data["entry"];
        this.stateMachine.addSearchPath(node, entry);
    }

    /**
     *
     * @param {string} tag
     * @param {object} data
     */
    probeRtreeDeleteFinish(tag, data) {
        this.stateMachine.setDelete();
        this.render();
    }

    /**
 *
 * @param {string} tag
 * @param {object} data
 */
    probeRtreeClearFinish(tag, data) {

        this.selected_node = null;
        this.selected_entry = null;
        this.search_mbr = null;
        this.search_result_entries = [];
        this.render();

    }

    /**
     *
     * @param {[number,number,number,number]} ext
     */
    setDataExtent(ext) {
        this.data_ext = ext;
        this.coordConvert = this.getCanvasCoordFunc(ext);
    }

    /**
     *
     * @param {RTreeNode} node
     * @param {number} id
     * @returns {RTreeNode}
     */
    searchNodeById(node, id) {
        if (node.id === id) {
            return node;
        } else if (node.isLeaf) {
            return null;
        }
        for (let e of node.entries) {
            let r = this.searchNodeById(e.node, id)
            if (r !== null) {
                return r;
            }
        }
        return null;
    }

    /**
     *
     * @param {number} id
     * @returns {RTreeEntry}
     */
    searchEntryById(id) {

        const entries = [];

        entries.push(...this.rtree.root.entries);

        while (entries.length > 0) {
            const entry = entries.shift();
            if (entry.id === id) {
                return entry;
            }
            if (!entry.isLeaf) {
                entries.push(...entry.node.entries);
            }

        }

        return -1;

    }

    /**
     *
     * @param {RTreeEntry} entry
     * @returns {RTreeNode}
     */
    getNodeContainingEntry(entry) {
        const nodes = [];
        nodes.push(this.rtree.root);
        while (nodes.length > 0) {
            const node = nodes.shift();
            if (node.entries.includes(entry)) {
                return node;
            }
            if (!node.isLeaf) {
                for (let e of node.entries) {
                    nodes.push(e.node);
                }
            }
        }
        return null;
    }

    /**
     *
     */
    clearSeletedNodeAndEntry() {
        this.selected_node = null;
        this.selected_entry = null;
    }

    /**
     * @returns {void}
     */
    clearSearch() {
        this.search_mbr = null;
        this.search_result_entries = [];
    }

    /**
     * @returns {void}
     */
    render() {
        this.graph_render();
        this.canvas_render();
    }

    addNodeToGraph(node) {
        if (node == null) {
            return;
        }

        this.cy.batch(() => {
            //node
            let d = { data: { id: `node-${node.id}`, type: "node", isLeaf: node.isLeaf ? "true" : "false", name: `${node.id}(${node.entries.length})` } };
            this.cy.add({ group: 'nodes', data: d.data });

            d = { data: { id: `inner-node-${node.id}`, parent: `node-${node.id}`, type: "inner-node", isLeaf: node.isLeaf ? "true" : "false", name: `xxx`, classes: 'aux' } };
            this.cy.add({ group: 'nodes', data: d.data });

            if (node.parent !== null) {

                //aux edge
                d = { data: { id: `inner-edge-${node.parent.id}-${node.id}`, type: "inner-edge", name: `xxx`, source: `inner-node-${node.parent.id}`, target: `inner-node-${node.id}`, classes: 'aux' } };
                this.cy.add({ group: 'edges', data: d.data });

                //entry to node
                d = { data: { id: `edge-${node.entry.id}-${node.id}`, type: "edge", name: `${node.parent.id}->${node.id}`, source: `entry-${node.entry.id}`, target: `node-${node.id}` } };
                this.cy.add({ group: 'edges', data: d.data });
            }
            for (let e of node.entries) {

                //entry
                d = { data: { id: `entry-${e.id}`, type: 'entry', parent: `node-${node.id}`, isLeaf: e.isLeaf ? "true" : "false", name: `${e.id}` } };
                this.cy.add({ group: 'nodes', data: d.data });

                //inner node to entry
                d = { data: { id: `edge-${e.id}-node-${node.id}`, type: 'inner-edge', name: "", source: `inner-node-${node.id}`, target: `entry-${e.id}`, classes: 'aux' } };
                this.cy.add({ group: 'edges', data: d.data });

                if (e.isLeaf) {
                    const g = e.record;
                    //record node
                    d = { data: { id: `record-${g.id}`, type: 'record', parent: `record-${g.id}`, name: `${g.id}` } };
                    this.cy.add({ group: 'nodes', data: d.data });

                    //entry to record
                    d = { data: { id: `edge-${e.id}-record-${g.id}`, type: 'edge', name: "", source: `entry-${e.id}`, target: `record-${g.id}` } };
                    this.cy.add({ group: 'edges', data: d.data });
                }

            }
        })
    }

    addEntryToGraph(node, entry) {
        //TODO
    }

    /**
     * @returns {void}
     */
    graph_render() {

        const nodes = [];

        this.cy.elements().remove();

        this.refreshGraph();

        if (!this.rtree.isEmpty()) {

            nodes.push(this.rtree.root);

            while (nodes.length > 0) {

                const node = nodes.shift();

                this.addNodeToGraph(node);

                for (let e of node.entries) {

                    if (!e.isLeaf) {
                        nodes.push(e.node);
                    }
                }

            }
        }

        this.refreshGraph();

    }

    /**
     *
     * @param {[number,number,number,number]} data_ext
     * @returns {(number,number)=>[number,number]}
     */
    getCanvasCoordFunc(data_ext) {

        //TODO revert y coordinate.

        const canvas = document.getElementById("rtree-canvas");
        const clientWidth = canvas.clientWidth;
        const clientHeight = canvas.clientHeight;
        canvas.height = clientHeight;
        canvas.width = clientWidth;

        const dx = 0 - data_ext[0];
        const dy = 0 - data_ext[1];
        const rx = canvas.width / (data_ext[2] - data_ext[0]);
        const ry = canvas.height / (data_ext[3] - data_ext[1]);

        return (x, y) => {
            return [dx + x * rx, dy + y * ry];
        }
    }

    /**
     *
     */
    canvas_render() {

        const that = this;

        /**
         *
         * @param {CanvasRenderingContext2D} ctx
         * @param {RTreeMBR} mbr
         * @param {object} props
         */
        function render_mbr(ctx, mbr, props) {

            const defaultProps = {
                lineWidth: 1,
                color: 'black',
                linedash: [],

            }

            const newProps = { ...defaultProps, ...props };

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

        const canvas = document.getElementById("rtree-canvas");
        const ctx = canvas.getContext("2d");
        const clientWidth = canvas.clientWidth;
        const clientHeight = canvas.clientHeight;
        canvas.height = clientHeight;
        canvas.width = clientWidth;

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

        // root
        let root_mbr = this.rtree.root.entries[0].mbr;
        for (let e of this.rtree.root.entries) {
            root_mbr = root_mbr.merge(e.mbr);
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
            const e = entries.shift();
            const mbr = e.mbr;
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
                if (this.stateMachine.searchResults.includes(e)) {
                    props.color = 'red';
                    props.lineWidth = 2;
                }
            }

            if (e.isLeaf) {
                props.linedash = [];
            }

            render_mbr(ctx, mbr, props);

            if (!e.isLeaf) {
                entries.push(...e.node.entries);
            }
        }
    }



}