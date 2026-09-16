export function bind(target, context) {
    const methodName = context.name;
    context.addInitializer(function () {
        this[methodName] = target.bind(this);
    });
}
