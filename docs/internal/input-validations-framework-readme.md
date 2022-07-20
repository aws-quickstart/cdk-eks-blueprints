# How to use the framework

The constraints framework implementation is located in the utils/constraints-utils.ts module

```typescript
import * from 'utils/constraints-utils';
```

## What can you use with the framework

The constraints framework provides a set of generic classes and interfaces as well as the invocation framework to validate constraints on arbitrary objects.

## Validations in constraints-utils.ts

This file holds the supported constraints and function(s) to validate constraints defined below in the rest of this document.

## StringConstraint

Constructor: 
```typescript
new StringConstraint(minValue, maxValue);
```

API reference ['here'](/docs/api/classes/utils.StringConstraint.html)

If given string length falls outside of these inclusive bounds throws detailed Zod error

## UrlStringConstraint

Constructor: 
```typescript
new UrlStringConstraint(minValue, maxValue);
```

API reference ['here'](/docs/api/classes/utils.UrlStringConstraint.html)

If given string length falls outside of these inclusive bounds, or does not follow a proper URL format it throws detailed Zod error

## NumberConstraint

Constructor: 
```typescript
new NumberConstraint(minValue, maxValue);
```

API reference ['here'](/docs/api/classes/utils.NumberConstraint.html)

If given number falls outside of these inclusive bounds throws detailed Zod error.

## ArrayConstraint

Constructor:
```typescript
new utils.ArrayConstraint(minValue, maxValue);
```

API reference ['here'](/docs/api/classes/utils.ArrayConstraint.html)

If given array length falls outside of these inclusive bounds throws detailed Zod error.

## validateConstraints Function

```typescript
validateConstraints<T>(constraints: ConstraintsType<T>, context: string, ...object: any)
```
This is the entry point to use the framework. This function can validate either a single object or an array of objects against the provided constraints.

## How to use the constraints-utils.ts

You need two things when utilizing constraints-utils.ts and the following examples are from ['here'](/lib/stacks/eks-blueprint-stack.ts)

First you need a class with specified keys assigned to given constraints. 

Example with two keys: 

```typescript
export class BlueprintPropsConstraints implements ConstraintsType<EksBlueprintProps> {
    id = new StringConstraint(1, 63);
    name = new StringConstraint(1, 63);
```

Second you need to call the ```validateConstraints``` function:

Example (note: punctuation, formatting):

```typescript
validateConstraints(new BlueprintPropsConstraints, EksBlueprintProps.name, blueprintProps);
```

## Limitations

Currently, constraints can be defined for flat objects, and nested structures will require individual validations.