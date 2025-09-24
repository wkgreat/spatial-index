import * as THREE from 'three';
import { RTree, RTreeMBR } from "spatial-index-js/rtree";

// create random mesh for example
function createRandomMesh(numVertices = 10, numFaces = 15) {
    const vertices = [];
    for (let i = 0; i < numVertices; i++) {
        vertices.push(
            Math.random() * 2 - 1, // x
            Math.random() * 2 - 1, // y
            Math.random() * 2 - 1  // z
        );
    }

    const indices = [];
    for (let i = 0; i < numFaces; i++) {
        const a = Math.floor(Math.random() * numVertices);
        const b = Math.floor(Math.random() * numVertices);
        const c = Math.floor(Math.random() * numVertices);
        if (a !== b && b !== c && a !== c) indices.push(a, b, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random()),
        roughness: 0.7,
        metalness: 0.2
    });

    return new THREE.Mesh(geometry, material);
};

// mesh convert to AABB
function meshToAABB(mesh) {
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    return box;
};

// check two meshes AABB are overlaped or not
function meshOverlapByAABB(mesh1, mesh2) {
    return meshToAABB(mesh1).intersectsBox(meshToAABB(mesh2));
};

// the example
function rtree_3d_with_three() {

    const N = 100;  // number of meshes
    const m = 5;    // m of rtree
    const M = 10;   // M of rtree
    const dim = 3;  // dimension of rtree

    // the function covert mesh to RTreeMBR
    const meshToRTreeMBR = (mesh) => {
        const aabb = meshToAABB(mesh);
        const mbr = RTreeMBR.build(
            aabb.min.x, aabb.max.x,
            aabb.min.y, aabb.max.y,
            aabb.min.z, aabb.max.z);
        return mbr;
    }

    // random create N meshes
    const meshes = [];
    for (let i = 0; i < N; ++i) {
        meshes.push(createRandomMesh());
    }

    // the search condition mesh
    const searchMesh = createRandomMesh();

    // create the rtree
    const rtree = new RTree(m, M, dim);
    // set rtree toMbrFunc, let rtree know how convert the data (mesh) to RTreeMBR
    rtree.setToMbrFunc(meshToRTreeMBR);
    // insert meshes into rtree
    for (let mesh of meshes) {
        rtree.insert(mesh);
    }

    // search meshes in rtree which overlaps with condition by RTreeMBR
    const results = rtree
        .search_overlap(meshToRTreeMBR(searchMesh))
        .map(e => e.record.data);


    // show the result
    console.log(`search ${results.length} meshes `);

}

rtree_3d_with_three();