export const mount = (id, component) => {
    const rootElement = document.getElementById(id);
    if (!rootElement) {
        throw new Error();
    }
    rootElement.innerHTML = component();
};
