import { type ReactNode } from "react";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ContextMenu } from "@/components/context-menu";

type MediaThumbnailProps = {
  preview: ReactNode;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  menuLabel: string;
  children: ReactNode;
};

export function MediaThumbnail({
  preview,
  menuOpen,
  onMenuOpenChange,
  menuLabel,
  children,
}: MediaThumbnailProps) {
  return (
    <div className="h-[4.125rem] w-[4.125rem] rounded-lg border border-[#d4c7b4] bg-[#fff8ee]">
      <ContextMenu
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        menuLabel={menuLabel}
        className="absolute bottom-0 right-0 z-20 mb-8 w-36 overflow-hidden rounded-xl border border-[#d4c7b4] bg-[#fff8ee] p-1 shadow-xl"
        trigger={
          <>
            {preview}
            <button
              type="button"
              onClick={() => onMenuOpenChange(!menuOpen)}
              aria-label={menuLabel}
              title={menuLabel}
              aria-expanded={menuOpen}
              className="absolute bottom-0 right-0 p-1 text-xs text-[#4d514b] transition hover:text-[#b24a20]"
            >
              <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden="true" />
            </button>
          </>
        }
      >
        {children}
      </ContextMenu>
    </div>
  );
}
