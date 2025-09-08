import cytoscape from "cytoscape";
import { RTree } from "./rtree";

export class RTreeRender {

    breadthfirst_layout = {
        name: 'breadthfirst',
        nodeSpacing: 1000,
        directed: true
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
                    // 'label': 'data(name)',
                    'color': '#fff',
                    'target-arrow-color': '#999',
                    'target-arrow-shape': 'triangle'
                }
            }
        ],

        layout: this.breadthfirst_layout
    };

    /**@type {RTree|null}*/
    rtree = null;

    selected_node = null;
    selected_entry = null;

    constructor(rtree) {

        this.rtree = rtree;

    }

    setDataExtent(ext) {
        this.data_ext = ext;
        this.coordConvert = this.getCanvasCoordFunc(ext);
    }

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

    render() {
        this.graph_render();
        this.canvas_render();
    }

    graph_render() {

        const nodes = [];
        this.data.elements = [];

        nodes.push(this.rtree.root);

        while (nodes.length > 0) {

            const node = nodes.shift();

            //node
            let d = { data: { id: `node-${node.id}`, type: "node", isLeaf: node.isLeaf ? "true" : "false", name: `${node.id}(${node.entries.length})` } };
            this.data.elements.push(d);

            d = { data: { id: `inner-node-${node.id}`, parent: `node-${node.id}`, type: "inner-node", isLeaf: node.isLeaf ? "true" : "false", name: `xxx`, classes: 'aux' } };
            this.data.elements.push(d);

            if (node.parent !== null) {

                //aux edge
                d = { data: { id: `inner-edge-${node.parent.id}-${node.id}`, type: "inner-edge", name: `xxx`, source: `inner-node-${node.parent.id}`, target: `inner-node-${node.id}`, classes: 'aux' } };
                this.data.elements.push(d);

                //entry to node
                d = { data: { id: `edge-${node.entry.id}-${node.id}`, type: "edge", name: `${node.parent.id}->${node.id}`, source: `entry-${node.entry.id}`, target: `node-${node.id}` } };
                this.data.elements.push(d);
            }
            for (let e of node.entries) {

                //entry
                d = { data: { id: `entry-${e.id}`, type: 'entry', parent: `node-${node.id}`, isLeaf: e.isLeaf ? "true" : "false", name: `${e.id}` } };
                this.data.elements.push(d);

                //inner node to entry
                d = { data: { id: `edge-${e.id}-node-${node.id}`, type: 'inner-edge', source: `inner-node-${node.id}`, target: `entry-${e.id}`, classes: 'aux' } };
                this.data.elements.push(d);

                if (!e.isLeaf) {
                    nodes.push(e.node);
                }
            }
        }

        const cy = cytoscape(this.data);

        cy.nodes('[type = "node"]').style({
            'background-color': 'red',
            'label': 'data(name)',
            'text-rotation': 'autorotate',
            'text-margin-y': -50
        });
        cy.nodes('[isLeaf = "true"]').style({
            'border-color': 'white',
            'background-color': 'green',
        });
        cy.nodes('[isLeaf = "false"]').style({
            'border-color': 'white',
            'background-color': 'blue',
        });
        cy.nodes('[type = "entry"]').style({
            'background-color': 'white',
            'opacity': 0.5
        });
        cy.nodes('[classes = "aux"]').style({
            'display': 'none'
        });
        cy.edges('[classes = "aux"]').style({
            'display': 'none'
        });

        const that = this;

        cy.on('tap', 'node', (evt) => {

            let node = evt.target;

            if (node.data("type") === 'node') {

                const node_id = parseFloat(node.data("id").split("-")[1]);
                this.selected_node = this.searchNodeById(this.rtree.root, node_id);
                if (this.selected_node !== this.rtree.root) {
                    this.selected_entry = this.selected_node.entry;
                } else {
                    this.selected_entry = null;
                }

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

                that.render();

            }

        })

    }

    getCanvasCoordFunc(data_ext) {

        //TODO revert y coordinate.

        const canvas = document.getElementById("rtree-canvas");
        const ctx = canvas.getContext("2d");
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

    canvas_render() {

        const that = this;

        function render_mbr(ctx, mbr, lineWidth = 1, color = 'black') {
            const [xmin, ymin] = that.coordConvert(mbr.xmin, mbr.ymin);
            const [xmax, ymax] = that.coordConvert(mbr.xmax, mbr.ymax);

            const x = xmin;
            const y = ymin;
            const w = xmax - xmin;
            const h = ymax - ymin;

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, w, h);
        }

        const canvas = document.getElementById("rtree-canvas");
        const ctx = canvas.getContext("2d");
        const clientWidth = canvas.clientWidth;
        const clientHeight = canvas.clientHeight;
        canvas.height = clientHeight;
        canvas.width = clientWidth;

        ctx.clearRect(0, 0, canvas.width, canvas.height);


        // root
        let root_mbr = this.rtree.root.entries[0].mbr;
        for (let e of this.rtree.root.entries) {
            root_mbr = root_mbr.merge(e.mbr);
        }
        let lineWidth = 1;
        let color = '#d3d3d3';
        if (this.rtree.root === this.selected_node) {
            color = 'red';
            lineWidth = 5;
        }
        render_mbr(ctx, root_mbr, lineWidth, color);

        // not root
        const entries = [];
        entries.push(...this.rtree.root.entries);

        while (entries.length > 0) {
            const e = entries.shift();
            const mbr = e.mbr;
            const n = this.getNodeContainingEntry(e);

            let color = '#d3d3d3';
            let lineWidth = 1;

            if (this.selected_entry === e) { // the selected entry or the entry of corresponding selected node
                color = 'red';
                lineWidth = 5;
            } else if (this.selected_node === n) { // the child node of selected node
                color = 'green';
                lineWidth = 2;
            }

            render_mbr(ctx, mbr, lineWidth, color);

            if (!e.isLeaf) {
                entries.push(...e.node.entries);
            }
        }
    }



}