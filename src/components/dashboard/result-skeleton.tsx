export function ResultSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-5 w-52 rounded-full bg-slate-200" />
              <div className="h-4 w-72 rounded-full bg-slate-100" />
            </div>
            <div className="h-12 w-28 rounded-2xl bg-slate-100" />
          </div>
          <div className="mt-5 space-y-3">
            <div className="h-4 w-full rounded-full bg-slate-100" />
            <div className="h-4 w-4/5 rounded-full bg-slate-100" />
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-8 w-24 rounded-full bg-slate-100" />
            <div className="h-8 w-28 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
