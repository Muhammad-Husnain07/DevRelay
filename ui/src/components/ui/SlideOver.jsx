import { X } from 'lucide-react';
import { useEffect } from 'react';

const sizeClasses = {
  sm: 'max-w-96',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]'
};

export default function SlideOver({ 
  open, 
  onClose, 
  title, 
  subtitle,
  children, 
  footer,
  size = 'md',
  className = ''
}) {
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
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
        onClick={onClose}
      />
      <div 
        className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-devrelay-surface border-l border-devrelay-border shadow-xl transition-transform duration-300 ease-out ${sizeClasses[size]} ${className} ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-devrelay-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-devrelay-text">{title}</h2>
            {subtitle && (
              <p className="text-sm text-devrelay-text-dim mt-0.5">{subtitle}</p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded hover:bg-devrelay-surface2 text-devrelay-text-dim hover:text-devrelay-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-devrelay-border bg-devrelay-surface shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}