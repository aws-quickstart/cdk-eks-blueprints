import { z } from "zod";

export interface Constraint {
    validate(key: string, value: any): any;
}

export class StringConstraint implements Constraint {
    constructor(readonly min?: number, readonly max?: number) { }
    
    validate(key: string, value: any) {
        if(value != undefined)
            z.string()
                .min(this.min ?? 0, { message: "Managed Node Groups " + key + " must be no less than " + this.min + " characters long!"})
                .max(this.max ?? 100, { message: "Managed Node Groups " + key + " must be no more than " + this.max + " characters long!" }).parse(value ?? 2);//I think this ?? should fix the undefined thing
    }
}
export type ConstraintsType<T> = Partial<Record<keyof T, Constraint>>;

export function validateConstraints<T>(object: any, constraints: ConstraintsType<T>) {
    for (let k in constraints) {
        const constraint: Constraint = constraints[k]!;
        constraint.validate(k, object[k]);
    }
}