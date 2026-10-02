'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

/**
 * UI-A · a labelled auth input (canvas `reference/AU*`): an uppercase
 * label over a white 48px box. `type="password"` adds the Show/Hide
 * button inside the box; it switches the input between password and
 * text so the learner can check what they typed.
 */
export function AuthField({
  label,
  type,
  name,
  autoComplete,
  value,
  onChange,
  required = true,
  minLength,
  placeholder,
}: {
  label: string;
  type: 'email' | 'password' | 'text';
  name: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  /** Hint in the empty box (AU2: "you@example.com", "At least 6 characters"). */
  placeholder?: string;
}) {
  const t = useTranslations('screens.auth');
  const [visible, setVisible] = React.useState(false);
  const id = React.useId();
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground"
      >
        {label}
      </label>
      <div className="box-border flex min-h-[48px] items-center justify-between gap-2 rounded-[14px] border border-border bg-surface px-3.5 py-3 focus-within:border-forest">
        <input
          id={id}
          name={name}
          type={isPassword && visible ? 'text' : type}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] leading-[1.4] text-text outline-none placeholder:text-placeholder"
        />
        {isPassword ? (
          <button
            type="button"
            aria-controls={id}
            aria-pressed={visible}
            aria-label={visible ? t('hidePassword') : t('showPassword')}
            onClick={() => setVisible((v) => !v)}
            className="shrink-0 bg-transparent p-0 text-[14px] font-bold text-forest"
          >
            {visible ? t('hide') : t('show')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
