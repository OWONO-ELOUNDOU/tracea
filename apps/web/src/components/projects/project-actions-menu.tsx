"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { menuItem, secondaryButton } from "./styles";
import { texts } from "./texts";

type FocusEdge = "first" | "last";

/** « Actions » button and its menu (§ 3.5, § 9.3), following the ARIA menu button pattern. */
export function ProjectActionsMenu({
  projectName,
  busy,
  buttonRef,
  onRename,
  onDuplicate,
  onDelete,
}: {
  projectName: string;
  /** While the project is being duplicated the button stays focusable but does not open. */
  busy: boolean;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const buttonId = useId();
  const menuId = useId();
  const [open, setOpen] = useState<FocusEdge | null>(null);
  const [upward, setUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ownButton = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useLayoutEffect(() => {
    if (open === null || menuRef.current === null || ownButton.current === null) return;
    // Opens upward only when the viewport has no room below but has room above.
    const menu = menuRef.current.getBoundingClientRect();
    const button = ownButton.current.getBoundingClientRect();
    setUpward(button.bottom + menu.height > window.innerHeight && button.top > menu.height);
    const list = items();
    (open === "first" ? list[0] : list[list.length - 1])?.focus();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function openMenu(edge: FocusEdge) {
    if (busy) return;
    setUpward(false);
    setOpen(edge);
  }

  function closeToButton() {
    setOpen(null);
    ownButton.current?.focus();
  }

  function select(action: () => void) {
    closeToButton();
    action();
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    } else if (event.key === "Escape" && open !== null) {
      event.preventDefault();
      setOpen(null);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case "ArrowDown":
        next = list[(index + 1) % list.length];
        break;
      case "ArrowUp":
        next = list[(index - 1 + list.length) % list.length];
        break;
      case "Home":
        next = list[0];
        break;
      case "End":
        next = list[list.length - 1];
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeToButton();
        return;
      case "Tab":
        // Let the browser move focus first; closing now would hide the item before it does.
        window.setTimeout(() => setOpen(null), 0);
        return;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget)) setOpen(null);
      }}
    >
      <button
        ref={(element) => {
          ownButton.current = element;
          buttonRef(element);
        }}
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open !== null}
        aria-controls={menuId}
        aria-label={texts.actionsLabel(projectName)}
        aria-disabled={busy ? true : undefined}
        onClick={() => {
          if (open === null) openMenu("first");
          else setOpen(null);
        }}
        onKeyDown={handleButtonKeyDown}
        className={secondaryButton}
      >
        Actions
      </button>
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-labelledby={buttonId}
        hidden={open === null}
        onKeyDown={handleMenuKeyDown}
        className={`absolute right-0 z-20 w-48 rounded-lg border border-line bg-surface py-1 shadow-md ${
          upward ? "bottom-full mb-1" : "top-full mt-1"
        }`}
      >
        <button
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={menuItem}
          onClick={() => select(onRename)}
        >
          Renommer
        </button>
        <button
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={menuItem}
          onClick={() => select(onDuplicate)}
        >
          Dupliquer
        </button>
        <div role="separator" className="my-1 border-t border-line" />
        <button
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={`${menuItem} text-danger`}
          onClick={() => select(onDelete)}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
