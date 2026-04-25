import { useState, useMemo } from 'react';
import { Copy, ChevronRight, ChevronDown } from 'lucide-react';

function JsonNode({ keyName, value, depth = 0, maxDepth = 3, isLast = true }) {
  const [expanded, setExpanded] = useState(depth < maxDepth);
  
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const isObject = type === 'object' || type === 'array';
  const displayKey = keyName !== undefined;
  
  const toggle = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };
  
  if (!isObject) {
    const valueClass = {
      string: 'text-devrelay-green',
      number: 'text-devrelay-blue',
      boolean: 'text-devrelay-amber',
      null: 'text-devrelay-text-dim'
    }[type] || 'text-devrelay-text';
    
    return (
      <span>
        {displayKey && (
          <>
            <span className="text-devrelay-text">"{keyName}"</span>
            <span className="text-devrelay-text-dim">: </span>
          </>
        )}
        <span className={valueClass}>
          {type === 'string' ? `"${value}"` : String(value)}
        </span>
        {!isLast && <span className="text-devrelay-text-dim">,</span>}
      </span>
    );
  }
  
  const isArray = type === 'array';
  const entries = isArray ? value : Object.entries(value);
  const count = entries.length;
  const preview = isArray ? `[${count} items]` : `{${count} keys}`;
  
  return (
    <span>
      {displayKey && (
        <>
          <span className="text-devrelay-text">"{keyName}"</span>
          <span className="text-devrelay-text-dim">: </span>
        </>
      )}
      <button onClick={toggle} className="hover:text-devrelay-green transition-colors">
        {expanded ? (
          <ChevronDown className="w-4 h-4 inline mr-1" />
        ) : (
          <ChevronRight className="w-4 h-4 inline mr-1" />
        )}
      </button>
      <span className="text-devrelay-text-dim">
        {expanded ? (isArray ? '[' : '{') : preview}
      </span>
      {expanded && (
        <div className="ml-4 pl-2 border-l border-devrelay-border">
          {entries.map(([k, v], i) => (
            <div key={k}>
              <JsonNode 
                keyName={isArray ? undefined : k} 
                value={v} 
                depth={depth + 1}
                maxDepth={maxDepth}
                isLast={i === entries.length - 1}
              />
            </div>
          ))}
        </div>
      )}
      {expanded && (
        <span className="text-devrelay-text-dim">
          {isArray ? ']' : '}'}
        </span>
      )}
      {!expanded && <span className="text-devrelay-text-dim">,</span>}
    </span>
  );
}

export default function JsonViewer({ 
  data, 
  maxDepth = 3,
  collapsed = false,
  className = ''
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(!collapsed);
  
  const jsonString = useMemo(() => {
    if (!data) return '';
    if (typeof data === 'string') {
      try { return JSON.stringify(JSON.parse(data), null, 2); }
      catch { return data; }
    }
    return JSON.stringify(data, null, 2);
  }, [data]);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (!data) {
    return <div className="text-devrelay-text-dim">No data</div>;
  }
  
  return (
    <div className={`relative bg-devrelay-surface2 rounded-lg ${className}`}>
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-devrelay-text-dim hover:text-devrelay-green"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
        <button
          onClick={handleCopy}
          className="text-xs text-devrelay-text-dim hover:text-devrelay-green flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className={`p-4 text-sm font-mono overflow-x-auto text-devrelay-text ${
        expanded ? '' : 'max-h-32'
      }`}>
        {expanded ? (
          <JsonNode value={data} maxDepth={maxDepth} />
        ) : (
          jsonString.length > 200 ? jsonString.slice(0, 200) + '...' : jsonString
        )}
      </pre>
    </div>
  );
}