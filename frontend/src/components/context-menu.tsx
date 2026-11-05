"use client";

import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type ContextMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  className: string;
  menuLabel: string;
  role?: "dialog" | "listbox" | "menu";
  containerClassName?: string;
};

const viewportPadding = 8;

export function ContextMenu({
  open,
  onOpenChange,
  trigger,
  children,
  className,
  menuLabel,
  role = "menu",
  containerClassName = "relative",
}: ContextMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const shiftRef = useRef(shift);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node))
        onOpenChange(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onOpenChange, open]);

  useLayoutEffect(() => {
    if (!open) {
      shiftRef.current = { x: 0, y: 0 };
      setShift({ x: 0, y: 0 });
      return;
    }

    const updateShift = () => {
      const menu = menuRef.current;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();
      const left = rect.left - shiftRef.current.x;
      const right = rect.right - shiftRef.current.x;
      const top = rect.top - shiftRef.current.y;
      const bottom = rect.bottom - shiftRef.current.y;
      const x =
        left < viewportPadding
          ? viewportPadding - left
          : right > window.innerWidth - viewportPadding
            ? window.innerWidth - viewportPadding - right
            : 0;
      const y =
        top < viewportPadding
          ? viewportPadding - top
          : bottom > window.innerHeight - viewportPadding
            ? window.innerHeight - viewportPadding - bottom
            : 0;

      if (shiftRef.current.x === x && shiftRef.current.y === y) return;
      shiftRef.current = { x, y };
      setShift({ x, y });
    };

    updateShift();
    window.addEventListener("resize", updateShift);
    window.addEventListener("scroll", updateShift, true);
    return () => {
      window.removeEventListener("resize", updateShift);
      window.removeEventListener("scroll", updateShift, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={containerClassName}>
      {trigger}
      {open && (
        <div
          ref={menuRef}
          role={role}
          aria-label={menuLabel}
          className={className}
          style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
