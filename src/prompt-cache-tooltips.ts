const GROUP = '[role="radiogroup"][aria-label="Prompt cache TTL"]';
const LABELS = new Set(["5m · ×1.25", "1h · ×2"]);
const TOOLTIP_ID = "claude-code-telemetry-cache-tooltip";
const DELAY_MS = 300;

// BB renders these descriptions as native titles. Render our two price hints
// explicitly: native tooltip activation can depend on the previous hover target.
export function mountPromptCacheTooltips(signal: AbortSignal): () => void {
  let active: HTMLButtonElement | null = null;
  let title = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let tooltip: HTMLDivElement | null = null;

  function buttonAt(target: EventTarget | null): HTMLButtonElement | null {
    if (!(target instanceof Element)) return null;
    const button = target.closest<HTMLButtonElement>('button[role="radio"]');
    return button && !button.disabled && button.closest(GROUP)
      && LABELS.has(button.textContent?.trim() ?? "") ? button : null;
  }

  function hide() {
    clearTimeout(timer);
    timer = undefined;
    tooltip?.remove();
    tooltip = null;
    observer.disconnect();
    if (active) {
      if (!active.hasAttribute("title")) active.setAttribute("title", title);
      const describedBy = (active.getAttribute("aria-describedby") ?? "")
        .split(/\s+/).filter((id) => id && id !== TOOLTIP_ID);
      if (describedBy.length) active.setAttribute("aria-describedby", describedBy.join(" "));
      else active.removeAttribute("aria-describedby");
    }
    active = null;
  }

  function show(button: HTMLButtonElement) {
    if (button === active) return;
    hide();
    const description = button.getAttribute("title");
    if (!description || !description.startsWith("API cache writes:")) return;
    active = button;
    title = description;
    button.removeAttribute("title");
    observer.observe(document.body, { childList: true, subtree: true });
    timer = setTimeout(() => {
      if (!button.isConnected) { hide(); return; }
      tooltip = document.createElement("div");
      tooltip.id = TOOLTIP_ID;
      tooltip.role = "tooltip";
      tooltip.dataset.bbPlugin = "claude-code-telemetry";
      tooltip.textContent = description;
      Object.assign(tooltip.style, {
        position: "fixed", zIndex: "2147483647", pointerEvents: "none",
        maxWidth: "calc(100vw - 16px)", padding: "6px 10px", borderRadius: "6px",
        border: "1px solid var(--border)", background: "var(--popover)",
        color: "var(--popover-foreground)", font: "12px/1.4 system-ui, sans-serif",
        boxShadow: "0 2px 8px #0002", overflowWrap: "anywhere",
      });
      document.body.append(tooltip);
      const anchor = button.getBoundingClientRect();
      const box = tooltip.getBoundingClientRect();
      const left = Math.max(8, Math.min(
        anchor.left + (anchor.width - box.width) / 2, window.innerWidth - box.width - 8,
      ));
      const above = anchor.top - box.height - 6;
      const top = above >= 8 ? above : Math.min(anchor.bottom + 6, window.innerHeight - box.height - 8);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(8, top)}px`;
      const describedBy = button.getAttribute("aria-describedby");
      button.setAttribute("aria-describedby", [describedBy, TOOLTIP_ID].filter(Boolean).join(" "));
    }, DELAY_MS);
  }

  const observer = new MutationObserver(() => {
    if (active && !active.isConnected) hide();
  });
  const onOver = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const button = buttonAt(event.target);
    if (button) show(button);
  };
  const onOut = (event: PointerEvent) => {
    if (active && buttonAt(event.target) === active && buttonAt(event.relatedTarget) !== active) hide();
  };
  const onFocus = (event: FocusEvent) => {
    const button = buttonAt(event.target);
    if (button) show(button);
  };
  const onBlur = (event: FocusEvent) => { if (event.target === active) hide(); };
  const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
  const dispose = () => {
    hide();
    document.removeEventListener("pointerover", onOver, true);
    document.removeEventListener("pointerout", onOut, true);
    document.removeEventListener("focusin", onFocus, true);
    document.removeEventListener("focusout", onBlur, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("scroll", hide, true);
    window.removeEventListener("resize", hide);
    window.removeEventListener("blur", hide);
    signal.removeEventListener("abort", dispose);
  };
  if (!signal.aborted) {
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onBlur, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    signal.addEventListener("abort", dispose, { once: true });
  }
  return dispose;
}
