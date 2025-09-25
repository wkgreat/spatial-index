export let number_precision: number = 1E-10;

export function number_equals(a: number, b: number) {
    return Math.abs(a - b) <= number_precision;
}

/**
 * interval of number
*/
export class Interval {
    /**
     * the lower(or left) bound of interval
    */
    l: number = 0;

    /**
     * the upper(or right) bound of interval
    */
    r: number = 0;

    /**
     * @param [l=0] the lower(or left) bound of interval
     * @param [r=0] the upper(or right) bound of interval
    */
    constructor(l: number = 0, r: number = 0) {
        this.l = l;
        this.r = r;
    }

    /**
     * clone this interval
    */
    clone(): Interval {
        return new Interval(this.l, this.r);
    }

    /**
     * the length of interval
    */
    length(): number {
        return this.r - this.l;
    }

    /**
     * merge this and other interval
     * @param t the other interval
     * @returns the new merged interval
    */
    merge(t: Interval): Interval {
        return new Interval(Math.min(this.l, t.l), Math.max(this.r, t.r));
    }

    /**
     * @param t the other interval
     * merge other interval to this interval
    */
    mergeInplace(t: Interval): void {
        this.l = Math.min(this.l, t.l);
        this.r = Math.max(this.r, t.r);
    }

    /**
     * if the interval onverlaps the other interval
     * @param t the other interval
    */
    overlap(t: Interval): boolean {
        return Math.max(this.l, t.l) <= Math.min(this.r, t.r);
    }

    /**
     * if a number in this interval
     * @param n the number
    */
    containNumber(n: number): boolean {
        return n >= this.l && n <= this.r;
    }

    /**
     * if the interval within the other interval
     * @param t the other interval
    */
    within(t: Interval): boolean {
        return t.containNumber(this.l) && t.containNumber(this.r);
    }

    /**
     * if the interval equals to the other interval
     * @param t the other interval
    */
    equals(t: Interval): boolean {
        return number_equals(this.l, t.l) && number_equals(this.r, t.r);
    }

}