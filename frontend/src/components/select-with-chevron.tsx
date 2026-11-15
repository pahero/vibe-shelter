import { type ComponentProps } from "react";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function SelectWithChevron({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none pr-10 ${className ?? ""}`}
      >
        {children}
      </select>
      <FontAwesomeIcon
        icon={faChevronDown}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6d6a66]"
      />
    </div>
  );
}
