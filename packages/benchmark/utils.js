import * as geom from 'jsts/org/locationtech/jts/geom.js';
import ConvexHull from 'jsts/org/locationtech/jts/algorithm/ConvexHull.js';

function randomFloat(a, b) {
    return Math.random() * (b - a) + a;
}

const geomFactory = new geom.GeometryFactory();

function generatorRandomPolygonInBox(box) {
    const points = [];
    for (let i = 0; i < 10; i++) {
        const x = randomFloat(box.getMinX(), box.getMaxX());
        const y = randomFloat(box.getMinY(), box.getMaxY());
        const c = new geom.Coordinate(x, y);
        const p = geomFactory.createPoint(c);
        points.push(p);
    }
    const multipoint = geomFactory.createMultiPoint(points);
    const ch = new ConvexHull(multipoint);
    return ch.getConvexHull();
}

const defaultBoxSize = { hmin: 2, wmin: 2, hmax: 10, wmax: 10 };

function randomEnvelopeInEnvelope(box, boxsize = defaultBoxSize) {

    const x = randomFloat(box.getMinX(), box.getMaxX());
    const y = randomFloat(box.getMinY(), box.getMaxY());
    const h = randomFloat(boxsize.hmin, boxsize.hmax);
    const w = randomFloat(boxsize.wmin, boxsize.wmax);
    const b = new geom.Envelope(x, x + w, y, y + h);
    return b;
}

export function randomPolygon(worldBox, boxsize = defaultBoxSize) {
    return generatorRandomPolygonInBox(randomEnvelopeInEnvelope(worldBox, boxsize));
}

export function randomPolygons(worldBox, n, boxsize = defaultBoxSize) {
    const polygons = [];
    for (let i = 0; i < n; ++i) {
        polygons.push(randomPolygon(worldBox, boxsize));
    }
    return polygons;
}