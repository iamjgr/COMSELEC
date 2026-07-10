import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export function Button({ children, variant = 'primary', fullWidth = true, className = '', ...props }: ButtonProps) {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  const widthClass = fullWidth ? 'w-full' : '';
  return (
    <button className={`${baseClass} ${widthClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
