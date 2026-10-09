import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'min-h-[36px] px-3 py-1.5 text-xs gap-1.5 rounded-full',
    md: 'min-h-[40px] md:min-h-[40px] px-4 py-2 text-sm gap-2 rounded-full',
    lg: 'min-h-[44px] px-6 py-2.5 text-base gap-2.5 rounded-full',
  }[size];

  const variantStyles = {
    // Primary: brand orange background with charcoal text (#292621) per WCAG 6.04:1 contrast requirement
    primary:
      'bg-[var(--color-brand-orange)] text-[var(--color-text)] font-semibold hover:opacity-90 active:scale-[0.98]',
    // Secondary: paper surface with subtle border
    secondary:
      'bg-[var(--color-paper)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-canvas)] font-medium active:scale-[0.98]',
    // Destructive: warning red surface
    destructive:
      'bg-red-500/10 text-red-700 border border-red-500/30 hover:bg-red-500/20 font-semibold active:scale-[0.98]',
    // Ghost: transparent background
    ghost:
      'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-canvas)] font-medium',
  }[variant];

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={clsx(
        'inline-flex items-center justify-center transition-all cursor-pointer select-none font-sans',
        'focus-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        sizeStyles,
        variantStyles,
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
