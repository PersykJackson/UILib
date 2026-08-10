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
export declare const listeners: Listener[];
export declare const createComponent: <Props>(componentProps: ComponentProps<Props>) => Component<Props>;
export declare const createPureComponent: <Props>(componentProps: PureComponentProps<Props>) => Component<ExtraProps & Props>;
export {};
//# sourceMappingURL=createComponent.d.ts.map