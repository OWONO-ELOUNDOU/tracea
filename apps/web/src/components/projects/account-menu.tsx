"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { PublicUser } from "@/lib/api";
import { userInitials } from "./format";
import { focusRing, menuItem } from "./styles";
import { useMounted } from "./use-mounted";

/** Avatar and account panel (§ 3.4), a disclosure rather than an ARIA menu. */
export function AccountMenu({
  user,
  avatarRef,
  onLogout,
}: {
  user: PublicUser;
  avatarRef: RefObject<HTMLButtonElement | null>;
  /** Resolves to `"failed"` when the panel must close and give focus back to the avatar. */
  onLogout: () => Promise<"done" | "failed">;
}) {
  const panelId = useId();
  const initials = userInitials(user);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoutRef = useRef<HTMLButtonElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (open) logoutRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!pending && !containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, pending]);

  async function logout() {
    if (pending) return;
    setPending(true);
    const result = await onLogout();
    if (!mounted.current || result === "done") return;
    setPending(false);
    setOpen(false);
    avatarRef.current?.focus();
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open && !pending) {
          event.preventDefault();
          setOpen(false);
          avatarRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!pending && !containerRef.current?.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={avatarRef}
        type="button"
        // WCAG 2.5.3: the name contains the visible initials, so a voice command « HE » works.
        aria-label={`${initials}, menu du compte`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-xs font-semibold text-ink ${focusRing}`}
      >
        {initials}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-20 mt-2 w-60 rounded-lg border border-line bg-surface py-1 shadow-md"
      >
        <div className="px-3 py-2">
          {user.displayName === null ? null : (
            <p className="truncate text-sm font-medium">{user.displayName}</p>
          )}
          <p className="truncate text-xs text-ink/70">{user.email}</p>
        </div>
        <hr className="my-1 border-line" />
        <button
          ref={logoutRef}
          type="button"
          // aria-disabled rather than disabled: a disabled button would drop focus and close the panel.
          aria-disabled={pending ? true : undefined}
          onClick={() => void logout()}
          className={`${menuItem} aria-disabled:opacity-60`}
        >
          {pending ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}
