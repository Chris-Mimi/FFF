export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
};

type Listener = (options: ConfirmOptions | null) => void;

let resolver: ((value: boolean) => void) | null = null;
let listeners: Listener[] = [];

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    resolver = resolve;
    listeners.forEach((l) => l(options));
  });
}

export function resolveConfirm(value: boolean) {
  resolver?.(value);
  resolver = null;
  listeners.forEach((l) => l(null));
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
