export type PropsWithChildren<T = unknown> = T & {
  children?: () => string;
};
