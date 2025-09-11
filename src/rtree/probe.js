/**
 *
 */
class Probe {

    /**
     * @typedef {(tag, object)=>void} ProbeCallback
    */

    /**@type {Map<string, ProbeCallback[]>}*/
    handlers = new Map();

    /**
     *
     */
    constructor() {}

    /**
     * @param {string} tag
     * @param {object} data  
    */
    probe(tag, data) {
        if (this.handlers.has(tag)) {
            for (let f of this.handlers.get(tag)) {
                f(tag, data);
            }
        }
    }

    /**
     * @param {string} tag
     * @param {ProbeCallback} func  
    */
    addTrigger(tag, func) {

        if (!this.handlers.has(tag)) {
            this.handlers.set(tag, []);
        }

        this.handlers.get(tag).push(func);

    }

};

export default Probe;