type Listener = () => void;
export declare const subscribersMap: WeakMap<object, Set<Listener>>;
export declare const subscribe: (target: object, listener: Listener) => () => boolean | undefined;
export {};
//# sourceMappingURL=subscribe.d.ts.map