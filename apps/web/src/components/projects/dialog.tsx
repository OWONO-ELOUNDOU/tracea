"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  title: string;
  role?: "dialog" | "alertdialog";
  /** Id of the element holding the dialog's main text (alert dialogs). */
  describedBy?: string;
  /** Returns the element focused when the dialog opens. */
  initialFocus: () => HTMLElement | null;
  /** Called on « Échap »; ignored while `busy`. */
  onCancel: () => void;
  busy: boolean;
  /** Tailwind max-width class: 440 px by default, 640 px for the description examples. */
  maxWidthClass?: string;
  children: ReactNode;
}

/**
 * Modal base (§ 9.2): labelled by its title, focus moved in on open and kept inside with Tab and
 * Shift+Tab, Escape cancels unless a call is pending, page scrolling locked. The caller makes the
 * rest of the page inert and moves focus on close.
 */
export function Dialog({
  title,
  role = "dialog",
  describedBy,
  initialFocus,
  onCancel,
  busy,
  maxWidthClass = "max-w-[440px]",
  children,
}: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = initialFocus();
    target?.focus();
    if (target instanceof HTMLInputElement) target.select();
    // Mount-only: later renders must not steal focus back.
  }, []);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onCancel();
      return;
    }
    if (event.key !== "Tab" || panelRef.current === null) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first === undefined || last === undefined) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4">
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        onKeyDown={handleKeyDown}
        className={`max-h-[calc(100vh-32px)] w-full ${maxWidthClass} overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg`}
      >
        <h2 id={titleId} className="text-lg font-semibold leading-7">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-3">{children}</div>;
}
