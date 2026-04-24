import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function SlideOver({ open, onClose, title, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-devrelay-surface border-l border-devrelay-border z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-devrelay-border">
          <h2 className="text-lg font-semibold text-devrelay-text">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-devrelay-surface2">
            <X className="w-5 h-5 text-devrelay-text-dim" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}