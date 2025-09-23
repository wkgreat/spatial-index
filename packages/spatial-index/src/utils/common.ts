export let number_precision: number = 1E-10;

export function number_equals(a: number, b: number) {
    return Math.abs(a - b) <= number_precision;
}

export class Interval {
    l: number = 0;
    r: number = 0;

    constructor(l: number = 0, r: number = 0) {
        this.l = l;
        this.r = r;
    }

    clone(): Interval {
        return new Interval(this.l, this.r);
    }

    length(): number {
        return this.r - this.l;
    }

    merge(t: Interval): Interval {
        return new Interval(Math.min(this.l, t.l), Math.max(this.r, t.r));
    }

    mergeInplace(t: Interval): void {
        this.l = Math.min(this.l, t.l);
        this.r = Math.max(this.r, t.r);
    }

    overlap(t: Interval): boolean {
        return Math.max(this.l, t.l) <= Math.min(this.r, t.r);
    }

    containNumber(n: number): boolean {
        return n >= this.l && n <= this.r;
    }

    within(t: Interval): boolean {
        return t.containNumber(this.l) && t.containNumber(this.r);
    }

    equals(t: Interval): boolean {
        return number_equals(this.l, t.l) && number_equals(this.r, t.r);
    }


}