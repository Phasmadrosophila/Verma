import React from 'react';
import clsx from 'clsx';

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
  isMonospace?: boolean;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, description, error, isMonospace = false, id, required, className, ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const descId = description ? `${inputId}-desc` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-label text-[var(--color-text)] font-medium">
            {label}
            {required && (
              <span className="text-[var(--color-brand-orange)] ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        </div>

        {description && (
          <p id={descId} className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {description}
          </p>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-describedby={clsx(descId, errorId)}
          aria-invalid={Boolean(error)}
          className={clsx(
            'w-full px-4 py-2.5 rounded-[var(--radius-md)] border text-sm transition-all focus-ring',
            'bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)]',
            error
              ? 'border-red-500/80 focus:border-red-500'
              : 'border-[var(--color-border)] focus:border-[var(--color-brand-orange)]',
            isMonospace && 'font-mono text-xs',
            className
          )}
          {...props}
        />

        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600 font-medium mt-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
