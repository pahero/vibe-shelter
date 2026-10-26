"use client";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ page, pageSize, totalItems, onPageChange }: PaginationControlsProps) {
  const pageCount = Math.ceil(totalItems / pageSize);
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="List pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-[#6d6a66]">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white px-3 font-semibold text-[#1f2320] transition hover:bg-[#fff8ee] disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white px-3 font-semibold text-[#1f2320] transition hover:bg-[#fff8ee] disabled:cursor-not-allowed disabled:opacity-50">Next</button>
      </div>
    </nav>
  );
}
