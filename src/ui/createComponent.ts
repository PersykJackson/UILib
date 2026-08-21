export interface PureComponentProps<Props> {
  body: (props: Props) => string;
  style?: string;
}

export interface ExtraProps {
  id: string;
  style?: string;
  onClick?: (e: PointerEvent) => void;
  onChange?: () => void;
}

export type ComponentProps<Props> = PureComponentProps<Props> & ExtraProps;

export type Component<Props> = (props: Props) => string;

interface Listener {
  id: string;
  onClick?: (e: PointerEvent) => void;
  onChange?: () => void;
}

export const listeners: Map<string, Listener> = new Map<string, Listener>();

const replaceId = (htmlString: string, id: string) => {
  const cleanHtml = htmlString.trim();
  if (/^<[a-z1-6]+\s+[^>]*\bid=/i.test(cleanHtml)) {
    return cleanHtml.replace(/\bid=['"].*?['"]/, `id="${id}"`);
  }

  return cleanHtml.replace(/^<([a-z1-6]+)/i, `<$1 id="${id}"`);
};

const renderComponent =
  <Props>({ id, body, style, onClick, onChange }: ComponentProps<Props>): Component<Props> =>
  (props) => {
    const html = replaceId(body(props), id);
    const el = document.getElementById(id);
    const styleEl = document.getElementById('rootStyle') as HTMLStyleElement;

    if (style && !styleEl.innerHTML.includes(style)) {
      styleEl.innerHTML += style;
    }

    if (el && el.outerHTML.trim() !== html.trim()) {
      el.outerHTML = html;
    }

    if (onClick || onChange) {
      if (listeners.has(id)) {
        const listener = listeners.get(id)!;

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

export const createComponent = <Props>(componentProps: ComponentProps<Props>): Component<Props> => {
  return renderComponent<Props>(componentProps);
};

export const createPureComponent = <Props>(
  componentProps: PureComponentProps<Props>,
): Component<ExtraProps & Props> => {
  return (props: ExtraProps & Props) => {
    const { id, style, onClick, onChange, ...sprops } = props;

    return renderComponent<Props>({
      id,
      body: componentProps.body,
      style: componentProps.style || style,
      onClick: onClick,
      onChange: onChange,
      ...(sprops as Props),
    })(sprops as Props);
  };
};
