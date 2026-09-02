"use client";

import { useState } from "react";
import { getPasswordStrength } from "@/lib/auth";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  showStrength?: boolean;
};

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.58 10.58A2 2 0 0012 15a2 2 0 001.41-3.41M9.88 4.24A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7a11.8 11.8 0 01-4.12 5.12M6.12 6.12A11.76 11.76 0 003 12c1.73 3.89 6 7 11 7 1.05 0 2.06-.13 3-.38"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "••••••••••",
  showStrength = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>

      <div className="inp-wrap">
        <input
          id={id}
          className="inp inp-password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="inp-eye"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <EyeIcon hidden={visible} />
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="pwd-strength" aria-live="polite">
          <div className="pwd-strength-bar">
            <span
              className={`pwd-strength-fill level-${strength.score}`}
              style={{ width: `${Math.max(strength.percent, 8)}%` }}
            />
          </div>
          <span className={`pwd-strength-label level-${strength.score}`}>{strength.label}</span>
        </div>
      )}
    </div>
  );
}
