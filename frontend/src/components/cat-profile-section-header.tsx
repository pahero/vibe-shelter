"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faPlus } from "@fortawesome/free-solid-svg-icons";

type CatProfileSectionHeaderProps = {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
};

export function CatProfileSectionHeader({ title, isExpanded, onToggle, onAdd, addLabel }: CatProfileSectionHeaderProps) {
  return <div
    role="button"
    tabIndex={0}
    aria-expanded={isExpanded}
    onClick={onToggle}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    }}
    className={`-mx-6 -mt-6 flex cursor-pointer items-center justify-between gap-2 bg-[#f1d8c7]/65 px-6 py-3 transition-colors hover:bg-[#ead0bd] focus:outline-none ${isExpanded ? "" : "-mb-6"}`}
  >
    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">{title}</p>
    <div className="flex items-center gap-2">
      {isExpanded && onAdd && <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(); }} aria-label={addLabel} title={addLabel} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#b24a20] bg-[#d05a2c] text-sm text-white transition hover:bg-[#b24a20]"><FontAwesomeIcon icon={faPlus} /></button>}
      <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#d4c7b4] bg-white text-sm text-gray-800"><FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} /></span>
    </div>
  </div>;
}
