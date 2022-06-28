import { z, ZodError, ZodIssueCode } from "zod";

export interface Constraint {
    validate(key: string, value: any): any;
}

export class StringConstraint implements Constraint {
    constructor(readonly min?: number, readonly max?: number) { }
    validate(key: string, value: any) {
        //try {
            z.string()
                .min(this.min ?? 0, { message: "Managed Node Groups " + key + " must be no less than 1 characters long!" })
                .max(this.max ?? 100, { message: "Managed Node Groups " + key + " must be no more than 63 characters long!" }).parse(value);
        /*} 
        catch (e) {
            if (e instanceof ZodError) {
                //console.log({success: false, errors: e.flatten().formErrors.at(0)});
                //return {success: false, errors: e.flatten()};
                throw "Managed Node Groups " + key + " must be no more than 63 characters long!";
            } else {
                return e;
            }

        }*/
    }
}
export type ConstraintsType<T> = Partial<Record<keyof T, Constraint>>;

export function validateConstraints<T>(object: any, constraints: ConstraintsType<T>) {
    for (let k in constraints) {
        const constraint: Constraint = constraints[k]!;
        constraint.validate(k, object[k]);
    }
}