import cytoscape from "cytoscape";
import Probe from "./probe";
import { MBR, RTree, RTreeEntry, RTreeNode } from "./rtree";
import { sleep } from "../utils/utils";

/**
 *
 */
export class RTreeRender extends Probe {

    //TODO set graph element and canvas element

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
                    'shape': 'rectangle',
                    'padding': '10px',
                    'background-color': '#0074D9',
                    'label': 'data(name)',
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#ccc',
                    'curve-style': 'bezier',
                    'color': '#fff',
                    'target-arrow-color': '#999',
                    'target-arrow-shape': 'triangle'
                }
            }
        ],

        // layout: this.breadthfirst_layout
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
    geometry_cache = [];

    /**
     * @constructor
     * @param {RTree} rtree
     */
    constructor(rtree) {

        super();

        this.rtree = rtree;
        this.rtree.setProbe(this);
        this.initGraph();
        // this.testGraph();
        const that = this;
        this.addTrigger("rtree:insert:finish", this.probeRtreeInsertFinish.bind(this));
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
                this.selected_node = this.searchNodeById(this.rtree.root, node_id);
                if (this.selected_node !== this.rtree.root) {
                    this.selected_entry = this.selected_node.entry;
                } else {
                    this.selected_entry = null;
                }
                this.clearSearch();
                that.render();

            }

            if (node.data("type") === 'entry') {

                const entry_id = parseFloat(node.data("id").split("-")[1]);
                this.selected_entry = this.searchEntryById(entry_id);
                if (this.selected_entry.isLeaf) {
                    this.selected_node = null;
                    //TODO set selected geometry
                } else {
                    this.selected_node = this.selected_entry.node;
                }
                this.clearSearch();
                that.render();

            }

        })
    }


    setGraphElementStyle() {
        this.cy.nodes().style({
        });
        this.cy.edges().style({
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
            'background-color': 'white',
            'width': 10,
            'height': 10,
            'opacity': 0.5
        });
        this.cy.nodes('[classes = "aux"]').style({
            'display': 'none'
        });
        this.cy.edges('[classes = "aux"]').style({
            'display': 'none'
        });
        this.cy.nodes('[type = "geom"]').style({
            'background-color': 'red',
            'opacity': 0.4,
            'width': 8,
            'height': 8,
        })
    }

    refreshGraph() {

        const roots = this.rtree.isEmpty() ? "" : `#inner-node-${this.rtree.root.id}`
        this.layout_breadthfirst.roots = roots;
        this.cy.layout(this.layout_breadthfirst).run();
        this.setGraphElementStyle();
        // this.cy.fit();

    }

    /**
     *
     * @param {string} tag
     * @param {object} data
     */
    probeRtreeInsertFinish(tag, data) {
        this.geometry_cache.push(data["geom"]);
        this.render();
    }

    /**
     *
     * @param {string} tag
     * @param {object} data
     */
    probeRtreeSearchOverlapFinish(tag, data) {
        this.clearSeletedNodeAndEntry();
        this.search_mbr = data["mbr"];
        this.search_result_entries = data["result"];
        this.render();
    }

    /**
     *
     * @param {string} tag
     * @param {object} data
     */
    probeRtreeDeleteFinish(tag, data) {
        this.geometry_cache.splice(this.geometry_cache.indexOf(data["geom"]), 1);
        this.render();
    }

    /**
 *
 * @param {string} tag
 * @param {object} data
 */
    probeRtreeClearFinish(tag, data) {

        this.geometry_cache = []
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
                const g = e.geom;
                //geom node
                d = { data: { id: `geom-${g.id}`, type: 'geom', parent: `geom-${g.id}`, name: `${g.id}` } };
                this.cy.add({ group: 'nodes', data: d.data });

                //entry to geom
                d = { data: { id: `edge-${e.id}-geom-${g.id}`, type: 'edge', name: "", source: `entry-${e.id}`, target: `geom-${g.id}` } };
                this.cy.add({ group: 'edges', data: d.data });
            }

        }

    }

    /**
     * @returns {void}
     */
    graph_render() {

        const nodes = [];
        // this.data.elements = [];
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

                this.refreshGraph();
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
         * @param {MBR} mbr
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

        //search mbr
        if (this.search_mbr) {
            render_mbr(ctx, this.search_mbr, {
                lineWidth: 5,
                color: 'blue'
            });
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
        if (this.rtree.root === this.selected_node) {
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

            if (this.selected_entry === e) { // the selected entry or the entry of corresponding selected node
                props.color = 'red';
                props.lineWidth = 5;
            } else if (this.selected_node === n) { // the child node of selected node
                props.color = 'green';
                props.lineWidth = 2;
            } else if (this.search_result_entries.includes(e)) {
                props.color = 'red';
                props.lineWidth = 2;
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