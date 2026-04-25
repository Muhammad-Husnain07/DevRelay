export function Skeleton({ className = '', lines = 1 }) {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className={`bg-devrelay-border animate-pulse ${className}`}
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className={`bg-devrelay-border animate-pulse rounded ${className}`} />
  );
}

export function SkeletonRow({ columns = 5 }) {
  return (
    <tr className="border-b border-devrelay-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-devrelay-border">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left text-sm text-devrelay-text-dim px-6 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}