import { type ReactNode } from "react";

export function MediaThumbnailGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 grid w-fit grid-cols-[repeat(4,max-content)] gap-2">
      {children}
    </div>
  );
}
