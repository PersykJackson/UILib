export declare const makeObservable: <T extends object>(obj: T) => T;
export declare function observable<T extends {
    new (...args: any[]): object;
}>(target: T): {
    new (...args: any[]): {};
} & T;
//# sourceMappingURL=makeObservable.d.ts.map