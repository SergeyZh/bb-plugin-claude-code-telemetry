// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promptCacheTtlOption } from "./prompt-cache.js";
import { mountPromptCacheTooltips } from "./prompt-cache-tooltips.js";

describe("prompt cache price tooltips", () => {
  let controller: AbortController;
  let dispose: () => void;
  let group: HTMLDivElement;
  let five: HTMLButtonElement;
  let hour: HTMLButtonElement;
  let above: HTMLDivElement;

  function over(target: Element, from: EventTarget | null = above) {
    from?.dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: target }));
    target.dispatchEvent(new MouseEvent("pointerover", { bubbles: true, relatedTarget: from }));
  }

  const hint = () => document.querySelector('[role="tooltip"]');
  const settle = () => vi.advanceTimersByTime(1000);

  beforeEach(() => {
    vi.useFakeTimers();
    controller = new AbortController();
    document.body.replaceChildren();
    above = document.createElement("div");
    above.textContent = "Prompt cache TTL";
    group = document.createElement("div");
    group.role = "radiogroup";
    group.setAttribute("aria-label", "Prompt cache TTL");
    const option = promptCacheTtlOption();
    if (option.type !== "select") throw new Error("Expected a TTL select");
    const buttons = option.values.map((value) => {
      const button = document.createElement("button");
      button.role = "radio";
      button.textContent = value.label;
      button.title = value.description ?? "";
      group.append(button);
      return button;
    });
    [, five, hour] = buttons;
    document.body.append(above, group);
    dispose = mountPromptCacheTooltips(controller.signal);
  });

  afterEach(() => {
    dispose();
    expect(vi.getTimerCount()).toBe(0);
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it("shows the hour price when entering directly from above, without a prior five-minute hover", () => {
    over(hour);
    expect(hint()).toBeNull();
    settle();
    expect(hint()?.textContent).toBe("API cache writes: 2× input price.");
    expect(hour.getAttribute("aria-describedby")).toBe(hint()?.id);
    expect(hour.hasAttribute("title")).toBe(false);
  });

  it("replaces the five-minute hint when crossing to the hour button", () => {
    over(five);
    settle();
    expect(hint()?.textContent).toBe("API cache writes: 1.25× input price.");
    over(hour, five);
    expect(hint()).toBeNull();
    settle();
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(hint()?.textContent).toBe("API cache writes: 2× input price.");
    expect(five.title).toBe("API cache writes: 1.25× input price.");
  });

  it("cancels the previous pending hover instead of showing a stale price", () => {
    over(five);
    over(hour, five);
    settle();
    expect(hint()?.textContent).toBe("API cache writes: 2× input price.");
  });

  it("cancels on exit and can enter the hour button again directly", () => {
    over(hour);
    over(above, hour);
    settle();
    expect(hint()).toBeNull();
    over(hour);
    settle();
    over(above, hour);
    expect(hint()).toBeNull();
    expect(hour.title).toBe("API cache writes: 2× input price.");
    expect(hour.hasAttribute("aria-describedby")).toBe(false);
  });

  it("keeps the hint when moving within a button's children", () => {
    const span = document.createElement("span");
    span.textContent = hour.textContent;
    hour.replaceChildren(span);
    over(hour);
    settle();
    over(span, hour);
    expect(hint()?.textContent).toBe("API cache writes: 2× input price.");
  });

  it("supports keyboard focus and Escape without losing another accessibility description", () => {
    hour.setAttribute("aria-describedby", "existing-help");
    hour.focus();
    settle();
    expect(hint()?.textContent).toBe("API cache writes: 2× input price.");
    expect(hour.getAttribute("aria-describedby")).toContain("existing-help");
    hour.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(hint()).toBeNull();
    expect(hour.getAttribute("aria-describedby")).toBe("existing-help");
  });

  it.each([false, true])("cleans up when the menu disappears (hint visible: %s)", async (visible) => {
    over(hour);
    if (visible) settle();
    group.remove();
    await Promise.resolve();
    settle();
    expect(hint()).toBeNull();
    expect(hour.title).toBe("API cache writes: 2× input price.");
  });

  it.each([false, true])("cleans up on plugin abort and remount (hint visible: %s)", (visible) => {
    over(hour);
    if (visible) settle();
    controller.abort();
    settle();
    expect(hint()).toBeNull();
    expect(hour.title).toBe("API cache writes: 2× input price.");
    over(hour);
    settle();
    expect(hint()).toBeNull();
    dispose = mountPromptCacheTooltips(new AbortController().signal);
    over(hour);
    settle();
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
  });

  it("does not enhance another group's identical labels or unrelated native hints", () => {
    group.setAttribute("aria-label", "Other option");
    over(hour);
    settle();
    expect(hint()).toBeNull();
    expect(hour.title).toBe("API cache writes: 2× input price.");
    group.setAttribute("aria-label", "Prompt cache TTL");
    over(group.firstElementChild!);
    settle();
    expect(hint()).toBeNull();
    expect(group.firstElementChild?.getAttribute("title")).toBe("Use Claude Code's settings and defaults.");
  });

  it.each(["scroll", "resize", "blur"])("dismisses on %s", (event) => {
    over(hour);
    settle();
    (event === "scroll" ? document : window).dispatchEvent(new Event(event));
    expect(hint()).toBeNull();
  });
});
