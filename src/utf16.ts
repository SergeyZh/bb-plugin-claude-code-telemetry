// Backported from get-bb/bb at d9bcc98cac2b924e4c667e435d721a602e63e4c4.
// Keep SDK 0.6.104 standalone compatibility until these helpers are published.
function isHighSurrogateAt(value: string, index: number): boolean {
  const code = value.charCodeAt(index);
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogateAt(value: string, index: number): boolean {
  const code = value.charCodeAt(index);
  return code >= 0xdc00 && code <= 0xdfff;
}

export function sliceUtf16Head(value: string, maxChars: number): string {
  let end = Math.min(value.length, Math.max(0, maxChars));
  if (isHighSurrogateAt(value, end - 1) && isLowSurrogateAt(value, end)) {
    end -= 1;
  }
  return value.slice(0, end);
}

