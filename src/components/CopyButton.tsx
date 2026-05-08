'use client';

import { useState } from 'react';

export function CopyButton({ text, label = 'Copia link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="citofono-btn-secondary text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // fallback: noop on browsers without clipboard API
        }
      }}
    >
      {copied ? 'Copiato!' : label}
    </button>
  );
}
