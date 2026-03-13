export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="surface-card p-5">
        <div className="h-7 w-56 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-gray-100" />
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-9 w-28 rounded bg-gray-200" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 surface-panel" />
        ))}
      </div>

      <div className="surface-panel p-5">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="mt-4 h-64 rounded bg-gray-100" />
      </div>
    </div>
  );
}
