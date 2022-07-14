import { z } from "zod";

/**
 * This is interface for the constraints needed to test asking for the key name of the object, the value being tested, and context for detailed Zod errors.
 */
export interface Constraint {
    validate(key: string, value: any, identifier: string): any;
}

export class StringConstraint implements Constraint {

    constructor(readonly min?: number, readonly max?: number) { }

    validate(key: string, value: any, identifier: string) {

        if (value != undefined)
            z.string()
                .min(this.min ?? 0, { message: `${key} (${identifier}: ${value}) must be no less than ${this.min} characters long.` })
                .max(this.max ?? 63, { message: `${key} (${identifier}: ${value}) must be no more than ${this.max} characters long.` })
                .parse(value);
    }
}

export class UrlStringConstraint implements StringConstraint {

    constructor(readonly min?: number, readonly max?: number) { }

    validate(key: string, value: any, identifier: string) {

        if (value != undefined) {

            z.string().url({ message: `${key} (${identifier}: ${value}) must be a URL formatted correctly.` }).parse(value);

            z.string()
                .min(this.min ?? 0, { message: `${key} (${identifier}: ${value}) must be a URL no less than ${this.min} characters long.` })
                .max(this.max ?? 100, { message: `${key} (${identifier}: ${value}) must be a URL no more than ${this.max} characters long.` })
                .parse(value);
        }
    }
}

export class NumberConstraint implements Constraint {

    constructor(readonly min?: number, readonly max?: number) { }

    validate(key: string, value: any, identifier: string) {

        if (value != undefined)
            z.number()
                .gte(this.min ?? 1, { message: `${key} (${identifier}: ${value}) must be no less than ${this.min} nodes.` })
                .lte(this.max ?? 3, { message: `${key} (${identifier}: ${value}) must be no more than ${this.max} nodes.` })
                .parse(value);
    }
}

export class ArrayConstraint implements Constraint {

    constructor(readonly min?: number, readonly max?: number) { }

    validate(key: string, value: any, identifier: string) {

        if (value != undefined)
            z.number()
                .gte(this.min ?? 1, { message: `${key} (${identifier} of length: ${value.length}) must be no less than ${this.min} node groups.` })
                .lte(this.max ?? 3, { message: `${key} (${identifier} of length: ${value.length}) must be no more than ${this.max} node groups.` })
                .parse(value.length);
    }
}

/**
 * This is responsible for grabbing all the given keys and excluding any not specified to be tested later.
 */
export type ConstraintsType<T> = Partial<Record<keyof T, Constraint>>;

/**
 * This function validates the given object by the given constraints, and returns an error that uses the given context if needed.
 * @param constraints This is the keys of the object with specified values for validation.
 * @param context Object type name for error context purposes.
 * @param object The given object type, an array of or only a single object, to be validated.
 * @returns throws a Zod Error if validations are broken.
 */
export function validateConstraints<T>(constraints: ConstraintsType<T>, context: string, ...object: any) {

    if (object != undefined)
        for (let i = 0; i < object.length; i++) {
            for (let k in constraints) {
                const constraint: Constraint = constraints[k]!;
                constraint.validate(context + "." + k, object[i][k], k);
            }
        }
}