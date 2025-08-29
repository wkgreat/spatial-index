import cytoscape from "cytoscape";
import { RTree } from "./rtree";

export class RTreeRender {

    breadthfirst_layout = {
        name: 'breadthfirst',
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
                    'padding': '0px',
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

    constructor(rtree) {

        this.rtree = rtree;

    }

    render() {

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

        cy.on('tap', 'node', (evt) => {

            let node = evt.target;

            if (node.data("type") === 'node') {

                alert(`${node.data("id")}`);
                //TODO show node porperties

            }

            if (node.data("type") === 'entry') {

                alert(`${node.data("id")}`);
                //TODO show entry properties

            }

        })

    }



}