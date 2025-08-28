import cytoscape from "cytoscape";
import { RTree } from "./rtree";

const OBJECT_ID = Symbol("objectId");
let counter = 1;

function getObjectId(obj) {
    if (!obj[OBJECT_ID]) {
        obj[OBJECT_ID] = counter++;
    }
    return `${obj[OBJECT_ID]}`;
}

export class RTreeRender {

    data = {
        container: document.getElementById('graph-div'),
        elements: [
            // { data: { id: 'rect1' } },
            // { data: { id: 'rect2' } },
            // { data: { id: 'e1', source: 'rect1', target: 'rect2' } }
        ],
        style: [
            {
                selector: 'node',
                style: {
                    'shape': 'rectangle',         // 设置为矩形
                    'width': 100,                 // 矩形宽
                    'height': 50,                 // 矩形高
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

        layout: {
            name: 'breadthfirst',
            directed: true
        }
    };

    /**@type {RTree|null}*/
    rtree = null;

    constructor(rtree) {

        this.rtree = rtree;

    }

    render() {

        // console.log("===RENDER===");

        const nodes = [];

        nodes.push(this.rtree.root);

        while (nodes.length > 0) {
            const node = nodes.shift();
            let d = { data: { id: node.id, isLeaf: node.isLeaf ? "true" : "false", name: `${node.id}-${node.entries.length}` } };
            this.data.elements.push(d);
            // console.log(`node: ${node.id}`);

            if (node.parent !== null) {
                d = { data: { id: `${node.parent.id}-${node.id}`, name: `${node.parent.id}->${node.id}`, source: node.parent.id, target: node.id } };
                this.data.elements.push(d);
                // console.log(`edge: ${node.parent.id}-${node.id}`);
            }
            for (let e of node.entries) {
                if (!e.isLeaf) {
                    nodes.push(e.node);
                }
            }
        }

        const cy = cytoscape(this.data);

        cy.nodes('[isLeaf = "true"]').style({
            'background-color': 'green',
        });
        cy.nodes('[isLeaf = "false"]').style({
            'background-color': 'blue',
        });



        this.data.elements = [];

    }



}