import { createContext, useContext, useMemo, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmation, setConfirmation] = useState(null);

  function showConfirm(message, title = 'Confirmare') {
    return new Promise((resolve) => {
      setConfirmation({
        message,
        title,
        onConfirm: () => {
          resolve(true);
          setConfirmation(null);
        },
        onCancel: () => {
          resolve(false);
          setConfirmation(null);
        }
      });
    });
  }

  const value = useMemo(() => ({ showConfirm }), []);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-moss/20 bg-white p-6 shadow-2xl">
            <h3 className="font-heading text-lg font-semibold text-ink">{confirmation.title}</h3>
            <p className="mt-3 text-sm text-ink/75">{confirmation.message}</p>
            <div className="mt-6 flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={confirmation.onCancel}
              >
                Anuleaza
              </button>
              <button
                className="btn-primary flex-1"
                onClick={confirmation.onConfirm}
              >
                Confirma
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
}
