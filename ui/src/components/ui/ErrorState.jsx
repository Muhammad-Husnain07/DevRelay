import { AlertCircle, RefreshCw, Info } from 'lucide-react';

export default function ErrorState({ 
  message = 'Something went wrong', 
  code,
  retry,
  variant = 'error'
}) {
  const Icon = variant === 'warning' ? AlertCircle : AlertCircle;
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className={`p-4 rounded-full mb-4 ${
        variant === 'error' ? 'bg-devrelay-red/10' : 'bg-devrelay-amber/10'
      }`}>
        <Icon className={`w-8 h-8 ${
          variant === 'error' ? 'text-devrelay-red' : 'text-devrelay-amber'
        }`} />
      </div>
      <h3 className="text-lg font-medium text-devrelay-text mb-2">
        {variant === 'error' ? 'Error' : 'Warning'}
      </h3>
      <p className="text-devrelay-text-dim text-sm mb-4 max-w-md">
        {message}
      </p>
      {code && (
        <p className="text-devrelay-text-dim text-xs font-mono mb-4">
          Error code: {code}
        </p>
      )}
      {retry && (
        <button
          onClick={retry}
          className="flex items-center gap-2 px-4 py-2 bg-devrelay-surface border border-devrelay-border rounded text-devrelay-text hover:border-devrelay-green transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}