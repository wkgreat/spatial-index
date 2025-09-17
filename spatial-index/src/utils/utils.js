/**
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function randomFloat(a, b) {
    return Math.random() * (b - a) + a;
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class IDGenerator {

    //TODO thread-safe

    counter = 0;

    genId() {
        const id = this.counter;
        if (this.counter === Number.MAX_SAFE_INTEGER) {
            this.counter = 0;
        } else {
            this.counter++;
        }
        return id;
    }

}