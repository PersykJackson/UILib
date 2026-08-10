export const mount = (id: string, component: () => string) => {
  const rootElement = document.getElementById(id);

  if (!rootElement) {
    throw new Error();
  }

  rootElement.innerHTML = component();
};
