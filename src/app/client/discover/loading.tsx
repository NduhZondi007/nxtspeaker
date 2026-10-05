export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading speakers">
      <div className="h-16 border-b border-line bg-white px-6 flex items-center">
        <div className="h-5 w-40 bg-soft rounded-lg animate-pulse" />
      </div>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-11 bg-soft rounded-[4px] animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 bg-soft rounded-[8px] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
