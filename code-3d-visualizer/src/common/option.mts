/**
 * @file option.mts
 * @description Functional Option type (Some or None) for representing the presence or absence of a value.
 */

export type Option<T> = Some<T> | None;

export interface Some<T> {
    readonly type: 'some';
    readonly value: T;
    forEach(fn: (value: T) => void): void;
    map<U>(fn: (value: T) => U): Option<U>;
    getOrElse(fallback: T): T;
}

export interface None {
    readonly type: 'none';
    forEach(fn: (value: never) => void): void;
    map<U>(fn: (value: never) => U): Option<U>;
    getOrElse<T>(fallback: T): T;
}

export const some = <T,>(value: T): Option<T> => ({
    type: 'some',
    value,
    forEach: (fn) => fn(value),
    map: (fn) => some(fn(value)),
    getOrElse: () => value,
});

export const none = (): Option<never> => ({
    type: 'none',
    forEach: () => { },
    map: () => none(),
    getOrElse: (fallback) => fallback,
});
