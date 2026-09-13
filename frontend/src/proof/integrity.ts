function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableStringify(value)));
  return Array.from(new Uint8Array(bytes)).map(part => part.toString(16).padStart(2, "0")).join("");
}
