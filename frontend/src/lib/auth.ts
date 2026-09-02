export type PasswordStrength = {
  score: number;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  percent: number;
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Too weak", percent: 0 };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const capped = Math.min(score, 4);
  const labels: PasswordStrength["label"][] = ["Too weak", "Weak", "Fair", "Good", "Strong"];

  return {
    score: capped,
    label: labels[capped],
    percent: capped * 25,
  };
}

export function isStrongPassword(password: string): boolean {
  return getPasswordStrength(password).score >= 3 && password.length >= 8;
}

/**
 * Pulls the `email` claim out of a Google ID token for local display only.
 * This does NOT verify the token -- the backend already did that in
 * /auth/google before issuing our own session token. Never trust this for
 * anything security-sensitive.
 */
export function decodeGoogleEmail(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    const claims = JSON.parse(json) as { email?: string };
    return claims.email ? claims.email.toLowerCase() : null;
  } catch {
    return null;
  }
}
