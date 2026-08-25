export type ConfirmInputOptions = {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
};

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  /** When set, the dialog shows a text field and the reason is returned via confirmWithReason(). */
  input?: ConfirmInputOptions;
};

type Listener = (options: ConfirmOptions | null) => void;

type ConfirmResult = { confirmed: boolean; value: string | null };

let resolver: ((result: ConfirmResult) => void) | null = null;
let listeners: Listener[] = [];

function open(options: ConfirmOptions): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    resolver = resolve;
    listeners.forEach((l) => l(options));
  });
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return open(options).then((r) => r.confirmed);
}

/**
 * Like confirm(), but shows a text field. Resolves to the entered string when
 * confirmed (empty string if left blank and not required), or null if cancelled.
 */
export function confirmWithReason(options: ConfirmOptions): Promise<string | null> {
  return open({ ...options, input: options.input ?? {} }).then((r) =>
    r.confirmed ? (r.value ?? '') : null
  );
}

export function resolveConfirm(confirmed: boolean, value: string | null = null) {
  resolver?.({ confirmed, value });
  resolver = null;
  listeners.forEach((l) => l(null));
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
