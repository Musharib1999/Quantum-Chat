/**
 * User-Scoped LocalStorage helper for Quantum Guru Studio IDE.
 * 
 * Provides:
 * 1. Synchronous determination of active user key on mount (avoiding race conditions)
 * 2. Scoped keys per user (e.g. quantum_ide_ms_qc_guru_code_...)
 * 3. Backwards-compatibility fallback to migrate unscoped legacy keys
 * 4. Automatic guest-to-user draft adoption
 */

export function getActiveUserKey(userEmail?: string | null): string {
  if (userEmail && userEmail.trim()) {
    return userEmail.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("quantum_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email && typeof parsed.email === "string") {
          return parsed.email.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
        }
      }
    } catch (e) {}
  }
  return "guest";
}

export function getScopedIdeItem(baseKey: string, userKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const scopedKey = `quantum_ide_${userKey}_${baseKey}`;
    const scopedVal = localStorage.getItem(scopedKey);
    if (scopedVal !== null) return scopedVal;

    // Backward compatibility: check legacy unscoped key
    const legacyKey = `quantum_ide_${baseKey}`;
    const legacyVal = localStorage.getItem(legacyKey);
    if (legacyVal !== null) {
      if (userKey !== "guest") {
        try {
          localStorage.setItem(scopedKey, legacyVal);
        } catch (e) {}
      }
      return legacyVal;
    }

    // If logged in and no user-specific content exists yet, adopt guest work if available
    if (userKey !== "guest") {
      const guestKey = `quantum_ide_guest_${baseKey}`;
      const guestVal = localStorage.getItem(guestKey);
      if (guestVal !== null) {
        return guestVal;
      }
    }
  } catch (e) {}
  return null;
}

export function setScopedIdeItem(baseKey: string, userKey: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    const scopedKey = `quantum_ide_${userKey}_${baseKey}`;
    localStorage.setItem(scopedKey, value);
  } catch (e) {}
}

export function removeScopedIdeItem(baseKey: string, userKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const scopedKey = `quantum_ide_${userKey}_${baseKey}`;
    localStorage.removeItem(scopedKey);
    // Also clean up legacy unscoped key if present
    localStorage.removeItem(`quantum_ide_${baseKey}`);
  } catch (e) {}
}
