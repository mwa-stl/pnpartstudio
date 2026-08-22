import { useCallback, useState } from "react";

/**
 * Drives <ConfirmDialog /> from a page.
 *
 *   const confirm = useConfirm();
 *   confirm.ask({
 *     title: "Delete this product?",
 *     item: { label: p.title, image: p.images?.[0] },
 *     onConfirm: () => remove(p),
 *   });
 *   …
 *   <ConfirmDialog {...confirm.props} />
 *
 * `onConfirm` may be async — the dialog shows a busy state until it settles,
 * then closes itself. It lives in its own module because a file exporting
 * both a component and a hook breaks Fast Refresh.
 */
export const useConfirm = () => {
  const [state, setState] = useState({ open: false });
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    setBusy(false);
  }, []);

  const ask = useCallback((config) => {
    setState({ ...config, open: true });
    setBusy(false);
  }, []);

  const confirm = useCallback(async () => {
    if (!state.onConfirm) return close();
    try {
      setBusy(true);
      await state.onConfirm();
      close();
    } catch {
      // The caller surfaces its own error toast; just release the dialog.
      setBusy(false);
    }
    return undefined;
  }, [state, close]);

  return {
    ask,
    close,
    props: {
      ...state,
      busy,
      onConfirm: confirm,
      onCancel: () => !busy && close(),
    },
  };
};

export default useConfirm;
