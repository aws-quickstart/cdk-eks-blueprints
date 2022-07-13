# Description

This is an internal readme to explain how to use the validation constraints framework to detect
errors at build time rather than run time.

## What can you use with the framework

You will find in the constraints-utils.ts file the generic calls for the following classes if you properly import them from the constraints-utils.ts file.

## generic class of validations constraints-utils.ts

This class holds the following classes and function(s) to validate constraints.

## StringConstraint

Called with: new StringConstraint(minValue, maxValue);

If given string length falls outside of these inclusive bounds throws detailed Zod error

## UrlStringConstraint

Called with new UrlStringConstraint(minValue, maxValue);

If given string length falls outside of these inclusive bounds, or does not follow a proper URL format it throws detailed Zod error

## NumberConstraint

Called with new NumberConstraint(minValue, maxValue);

If given number falls outside of these inclusive bounds throws detailed Zod error.

## ArrayConstraint

new utils.ArrayConstraint(minValue, maxValue);

If given array length falls outside of these inclusive bounds throws detailed Zod error.

## validateConstraints Function

validateConstraints<T>(constraints: ConstraintsType<T>, context: string, ...object: any)

This is a generic function to take in three parameters:

    constraints: the class type you specify to define key constraints.

    context: context name of whats being tested for detailed error purposes.

    object: The object in question being validated.

## How to use the constraints-utils.ts class?

You need two things when utilizing constraints-utils.ts

    -A class with specified keys assigned to given constraints.

    -Calling validateConstraints with right parameters in the right constructor.