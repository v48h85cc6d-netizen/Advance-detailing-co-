import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useT } from '../lib/useT';
import { CloseIcon } from './Icons';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  message: string;
  action?: { label: string; href: string };
}
const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => undefined);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((ts) => ts.filter((x) => x.id !== id));
  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), toast.kind === 'success' ? 7000 : 12000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem]">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              role={toast.kind === 'error' ? 'alert' : 'status'}
              data-testid={`toast-${toast.kind}`}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass pointer-events-auto flex w-full items-start gap-4 rounded-2xl p-4 pr-3 shadow-[var(--shadow)]"
            >
              <span
                aria-hidden="true"
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toast.kind === 'success' ? 'bg-emerald-400' : toast.kind === 'error' ? 'bg-red-500' : 'bg-fg'}`}
              />
              <div className="flex-1 text-sm leading-relaxed text-fg">
                <p>{toast.message}</p>
                {toast.action && (
                  <a href={toast.action.href} className="mt-2 inline-block font-semibold underline underline-offset-4">
                    {toast.action.label}
                  </a>
                )}
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label={t('toast.close')} className="grid grid-cols-1 h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-fg">
                <CloseIcon width={16} height={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
