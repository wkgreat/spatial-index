import * as THREE from 'three';

export function createRandomMesh(numVertices = 10, numFaces = 15) {
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
}

export function meshToAABB(mesh: THREE.Mesh): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    return box;
}

export function meshOverlapByAABB(mesh1: THREE.Mesh, mesh2: THREE.Mesh): boolean {
    return meshToAABB(mesh1).intersectsBox(meshToAABB(mesh2));
}