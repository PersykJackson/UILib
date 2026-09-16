export const listeners = new Map();
const replaceId = (htmlString, id) => {
    const cleanHtml = htmlString.trim();
    if (/^<[a-z1-6]+\s+[^>]*\bid=/i.test(cleanHtml)) {
        return cleanHtml.replace(/\bid=['"].*?['"]/, `id="${id}"`);
    }
    return cleanHtml.replace(/^<([a-z1-6]+)/i, `<$1 id="${id}"`);
};
const renderComponent = ({ id, body, style, onClick, onChange }) => (props) => {
    const html = replaceId(body(props), id);
    const el = document.getElementById(id);
    const styleEl = document.getElementById('rootStyle');
    if (style && !styleEl.innerHTML.includes(style)) {
        styleEl.innerHTML += style;
    }
    if (el && el.outerHTML.trim() !== html.trim()) {
        el.outerHTML = html;
    }
    if (onClick || onChange) {
        if (listeners.has(id)) {
            const listener = listeners.get(id);
            const el = document.getElementById(id);
            if (listener.onClick) {
                el?.removeEventListener('click', listener.onClick);
            }
            if (listener.onChange) {
                el?.removeEventListener('input', listener.onChange);
            }
        }
        listeners.set(id, { id, onClick, onChange });
    }
    return html;
};
export const createComponent = (componentProps) => {
    return renderComponent(componentProps);
};
export const createPureComponent = (componentProps) => {
    return (props) => {
        const { id, style, onClick, onChange, ...sprops } = props;
        return renderComponent({
            id,
            body: componentProps.body,
            style: componentProps.style || style,
            onClick: onClick,
            onChange: onChange,
            ...sprops,
        })(sprops);
    };
};
