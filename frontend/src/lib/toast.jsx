import { createContext, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextToastId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  function dismissToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }

  function showToast({ title, message = '', type = 'success', duration = 3200 }) {
    const id = nextToastId++;
    setToasts((prev) => [...prev, { id, title, message, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timersRef.current.delete(id);
    }, duration);

    timersRef.current.set(id, timer);
  }

  const value = useMemo(() => ({ showToast, dismissToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${
              toast.type === 'error'
                ? 'border-red-200 bg-white text-red-700'
                : 'border-moss/20 bg-white text-ink'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm opacity-80">{toast.message}</p> : null}
              </div>
              <button className="btn-link text-xs" onClick={() => dismissToast(toast.id)} type="button">
                Inchide
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return ctx;
}
