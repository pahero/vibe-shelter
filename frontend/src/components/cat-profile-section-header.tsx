"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type CatProfileSectionHeaderProps = {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
};

export function CatProfileSectionHeader({ title, onAdd, addLabel }: CatProfileSectionHeaderProps) {
  return <div className="flex items-center justify-between gap-2">
    <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">{title}</h2>
    <div className="flex items-center gap-2">
      {onAdd && <button type="button" onClick={onAdd} aria-label={addLabel} title={addLabel} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#b24a20] bg-[#d05a2c] text-sm text-white transition hover:bg-[#b24a20]"><FontAwesomeIcon icon={faPlus} /></button>}
    </div>
  </div>;
}
