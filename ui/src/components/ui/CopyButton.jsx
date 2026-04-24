import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded hover:bg-devrelay-surface2 transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-devrelay-green" /> : <Copy className="w-4 h-4 text-devrelay-text-dim" />}
    </button>
  );
}