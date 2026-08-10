import { listeners } from './createComponent';
import { mount } from './mount';

export const renderRoot = (rootId: string, component: () => string) => {
  const rootComponent = document.getElementById(rootId);

  if (!rootComponent?.innerHTML) {
    mount(rootId, component);
  } else {
    component();
  }

  listeners.forEach(({ id, onClick, onChange }) => {
    const el = document.getElementById(id);

    if (onClick) {
      el?.removeEventListener('click', onClick);
      el?.addEventListener('click', onClick);
    }

    if (onChange) {
      el?.removeEventListener('input', onChange);
      el?.addEventListener('input', onChange);
    }
  });
};
