import { z } from "zod";

export interface Constraint {
    validate(key: string, value: any): any;
}

export class StringConstraint implements Constraint {
    //add a constructor for context for where it is and such
    //Or perhaps pass it to validate itself as the key. 
    constructor(readonly min?: number, readonly max?: number) { }
    
    validate(key: string, value: any) {//add a better name but this => context: string, 
        if(value != undefined)
            z.string()
                .min(this.min ?? 0, { message: key + " must be no less than " + this.min + " characters long!"})
                .max(this.max ?? 100, { message: key + " must be no more than " + this.max + " characters long!" }).parse(value ?? 2);//I think this ?? should fix the undefined thing
    }
}

export type ConstraintsType<T> = Partial<Record<keyof T, Constraint>>;

export function validateConstraints<T>(object: any, constraints: ConstraintsType<T>, context: string) {
    //try to extract from object if possible to get runtime class name identification? Does not exist. Maybe soemthing similar exists?
    //pass in anohter parameter of context
    for (let k in constraints) {
        const constraint: Constraint = constraints[k]!;
        constraint.validate(context + "." + k, object[k]);
    }
}