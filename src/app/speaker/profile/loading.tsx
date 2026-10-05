export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-16 border-b border-line bg-white px-6 flex items-center">
        <div className="h-5 w-40 bg-soft rounded-lg animate-pulse" />
      </div>
      <div className="p-4 sm:p-6 max-w-2xl space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-line rounded-[12px] p-5 animate-pulse">
            <div className="h-4 w-32 bg-soft rounded mb-3" />
            <div className="h-24 bg-soft rounded-[8px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
