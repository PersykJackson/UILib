export function bind<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
): void {
  const methodName = context.name;

  context.addInitializer(function (this: This) {
    (this as Record<PropertyKey, unknown>)[methodName] = target.bind(this);
  });
}
