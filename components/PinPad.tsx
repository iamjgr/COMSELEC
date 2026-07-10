import React from 'react';

interface PinPadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function PinPad({ onKeyPress, onDelete, onClear, disabled = false }: PinPadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  const handleKeyClick = (key: string) => {
    if (disabled) return;
    if (key === 'C') {
      onClear();
    } else if (key === '⌫') {
      onDelete();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mt-8">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => handleKeyClick(key)}
          disabled={disabled}
          className={`
            h-16 w-16 mx-auto rounded-full flex items-center justify-center text-2xl font-medium transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-2)] text-[var(--color-text-muted)]' 
                      : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-light)] active:bg-[var(--color-accent)] active:text-white shadow-sm border border-[var(--color-border)]'}
          `}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
