type Primitive = number | string | boolean | symbol | bigint | null | undefined;
type SafeValue = object | Primitive;
type Constructor<T extends object = object> = new (...args: SafeValue[]) => T;
export declare const subscribe: (target: object, callback: () => void) => void;
type Stage3FieldDecoratorContext = {
    name: PropertyKey;
    addInitializer?: (initializer: (this: object) => void) => void;
};
export declare const observable: (targetOrValue: object | undefined, contextOrKey: PropertyKey | Stage3FieldDecoratorContext) => void;
export declare const store: <T extends object, C extends Constructor<T>>(TargetClass: C) => C;
export {};
//# sourceMappingURL=makeObservable.d.ts.map