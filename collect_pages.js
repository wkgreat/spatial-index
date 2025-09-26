const fs = require('fs-extra');
const path = require('path');
const os = require('os');

function listFiles(dir) {
    return fs.readdir(dir, { recursive: false, withFileTypes: true });
}

function copyFileToDir(file, dir) {

    const dstFile = path.join(dir, path.basename(file));

    fs.copy(file, dstFile, { overwrite: true }).then(() => {
        console.log(`${file} ==> ${dstFile} success`);
    }).catch(err => {
        console.log(`${file} ==> ${dstFile} failed`);
    })
}

function copyDir(src, dst) {
    fs.copy(src, dst, { overwrite: true }).then(() => {
        console.log(`${src} ==> ${dst} success`);
    }).catch(err => {
        console.log(`${src} ==> ${dst} failed`);
    })
}

const pagesDir = "pages"
const demoDir = 'packages/demos/dist';
const apiDocSrcDir = 'packages/spatial-index/api_docs';
const apiDocDstDir = `${pagesDir}/api_docs`

listFiles(demoDir).then(files => {
    for (let f of files) {
        const fpath = path.join(demoDir, f.name);
        copyFileToDir(fpath, pagesDir);
    }
}).catch(err => {
    console.error(err);
});

copyDir(apiDocSrcDir, apiDocDstDir);



