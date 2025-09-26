# spatial-index-js
All kinds of spatial index implementation and visualization

![Build](https://github.com/wkgreat/spatial-index/actions/workflows/deploy.yml/badge.svg) [![npm](https://img.shields.io/npm/v/spatial-index-js.svg)](https://www.npmjs.com/package/spatial-index-js) ![TypeScript](https://img.shields.io/badge/types-yes-blue.svg)

## Github
https://github.com/wkgreat/spatial-index

## API Documents
https://wkgreat.github.io/spatial-index/api_docs/

## Web Demo
Visit [Web Demo](https://wkgreat.github.io/spatial-index/) to show the dynamic visualized structure of spatial indices.

## R-Tree

### Features
* Support Multidimensionnal R-tree
* Support index any customized spatial objects as long as can get mbr of these objects
* Support draw the tree strcuture and mbr structure of rtree (Using RTreeRender class)

### Web Demo
https://wkgreat.github.io/spatial-index/  

![R-Tree Demo](https://github.com/wkgreat/spatial-index/blob/main/docs/rtree_web_demo.png?raw=true)

### Examples   
[All Examples](https://github.com/wkgreat/spatial-index/tree/main/packages/examples)

### One of Examples   
use rtree to index 2d jsts geometry
```javascript
import { RTree, RTreeMBR } from "spatial-index-js/rtree";
import * as geom from 'jsts/org/locationtech/jts/geom.js';
import RelateOp from 'jsts/org/locationtech/jts/operation/relate/RelateOp.js';
import RandomPointsBuilder from 'jsts/org/locationtech/jts/shape/random/RandomPointsBuilder.js'
import ConvexHull from 'jsts/org/locationtech/jts/algorithm/ConvexHull.js';
import WKTWriter from 'jsts/org/locationtech/jts/io/WKTWriter.js';

/*
build rtree to index jsts geometries
*/
function rtree_with_jsts() {

    // function random a float number
    function randomFloat(a, b) {
        return Math.random() * (b - a) + a;
    }

    // function random a jsts polygon
    function randomPolygon() {
        const builder = new RandomPointsBuilder();
        const x = randomFloat(0, 100);
        const y = randomFloat(0, 100);
        const w = randomFloat(10, 50);
        const h = randomFloat(10, 50);
        const envelope = new geom.Envelope(x, y, x + w, y + h);
        builder.setExtent(envelope);
        builder.setNumPoints(20);
        const multipoint = builder.getGeometry();
        const ch = new ConvexHull(multipoint);
        return ch.getConvexHull();
    }


    // generate 100 polygons for the data of rtree need build on
    const polygons = []
    for (let i = 0; i < 100; i++) {
        polygons.push(randomPolygon());
    }

    // define the jsts geometry how convert to RtreeMBR
    const polygonToRTreeMBR = (g) => {
        const envelope = g.getEnvelopeInternal();
        const mbr = RTreeMBR.build(envelope.getMinX(), envelope.getMaxX(), envelope.getMinY(), envelope.getMaxY());
        return mbr;
    }

    // create a rtree with m=10 (minimum entries per node) and M=10 (Maximum entries per node) 
    const rtree = new RTree(10, 20);
    // tell the rtree how convert the jsts geometry to mbr
    rtree.setToMbrFunc(polygonToRTreeMBR);

    // insert polygons into rtree
    for (let g of polygons) {
        rtree.insert(g);
    }

    // the polygon of search condition
    const searchPolygon = randomPolygon();

    // search the polygons in rtree that overlaps with search condition polygon
    const results = rtree
        .search_overlap(polygonToRTreeMBR(searchPolygon))   // search use the mbr, this returns result only overlaps with the mbr
        .map(e => e.record.data)                            // convert rtree result entries to geomeries
        .filter(g => RelateOp.overlaps(g, searchPolygon));  // recheck, use RelateOp.overlaps to check with real shape. 

    // print the result polygons
    const wktWriter = new WKTWriter();
    for (let g of results) {
        console.log(wktWriter.write(g));
    }
}

rtree_with_jsts();

```

