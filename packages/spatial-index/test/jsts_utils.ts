import { geom } from 'jsts';
import { randomFloat } from "../src/utils/utils";

const geomFactory = new geom.GeometryFactory();

function generatorRandomPolygonInBox(box: geom.Envelope) {
    const points: geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
        const x = randomFloat(box.getMinX(), box.getMaxX());
        const y = randomFloat(box.getMinY(), box.getMaxY());
        const c = new geom.Coordinate(x, y);
        const p = geomFactory.createPoint(c);
        points.push(p);
    }
    const multipoint = geomFactory.createMultiPoint(points);
    return multipoint.convexHull();
}

export interface BoxSize {
    hmin: number;
    wmin: number;
    hmax: number;
    wmax: number
}

const defaultBoxSize: BoxSize = { hmin: 2, wmin: 2, hmax: 10, wmax: 10 };

function randomEnvelopeInEnvelope(box: geom.Envelope, boxsize: BoxSize = defaultBoxSize) {

    const x = randomFloat(box.getMinX(), box.getMaxX());
    const y = randomFloat(box.getMinY(), box.getMaxY());
    const h = randomFloat(boxsize.hmin, boxsize.hmax);
    const w = randomFloat(boxsize.wmin, boxsize.wmax);
    const b = new geom.Envelope(x, x + w, y, y + h);
    return b;
}

export function randomPolygon(worldBox: geom.Envelope, boxsize = defaultBoxSize) {
    return generatorRandomPolygonInBox(randomEnvelopeInEnvelope(worldBox, boxsize));
}

export function randomPolygons(worldBox: geom.Envelope, n: number, boxsize = defaultBoxSize) {
    const polygons = [];
    for (let i = 0; i < n; ++i) {
        polygons.push(randomPolygon(worldBox, boxsize));
    }
    return polygons;
}