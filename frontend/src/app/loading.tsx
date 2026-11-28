export default function Loading() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-4 bg-[#FAF6EC]"
      role="status"
      aria-live="polite"
      aria-label="Loading Stayzy"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-4 border-[#CBE4C3] border-t-[#064E38] animate-spin" />
        <p className="text-xs font-bold tracking-wide text-[#064E38] uppercase">
          Loading Stayzy...
        </p>
      </div>
    </div>
  );
}
