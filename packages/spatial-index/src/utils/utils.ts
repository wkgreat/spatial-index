/**
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function randomFloat(a: number, b: number): number {
    return Math.random() * (b - a) + a;
}

export function sleep(ms: number): Promise<number> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class IDGenerator {

    // TODO thread-safe

    counter: number = 0;

    genId(): number {
        const id = this.counter;
        if (this.counter === Number.MAX_SAFE_INTEGER) {
            this.counter = 0;
        } else {
            this.counter++;
        }
        return id;
    }

}