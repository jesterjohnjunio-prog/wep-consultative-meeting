'use client';

import type { ReactNode } from 'react';
import { LOCATIONS, PROVINCES } from '@/lib/config';
import { Alert, ChevronDown } from '../Icons';

export const fieldId = (key: string) => `f-${key.replace(/\./g, '-')}`;

interface LabelProps {
  fil: string;
  en: string;
  required?: boolean;
  optional?: boolean;
}

export function LabelText({ fil, en, required, optional }: LabelProps) {
  return (
    <>
      <span className="label-fil">
        {fil}
        {required && (
          <span className="req" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="opt">Opsyonal (Optional)</span>}
      </span>
      <span className="label-en">{en}</span>
    </>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p className="field-error" id={`${id}-err`} role="alert">
      <Alert width={16} height={16} />
      {error}
    </p>
  );
}

interface TextFieldProps extends LabelProps {
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: 'text' | 'email' | 'tel';
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  placeholder?: string;
  hint?: string;
  icon?: ReactNode;
  multiline?: boolean;
  maxLength?: number;
}

export function TextField(p: TextFieldProps) {
  const id = fieldId(p.name);
  const describedBy = [p.hint && `${id}-hint`, p.error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    name: p.name,
    value: p.value,
    placeholder: p.placeholder,
    required: p.required,
    maxLength: p.maxLength ?? 150,
    'aria-invalid': p.error ? true : undefined,
    'aria-describedby': describedBy,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => p.onChange(e.target.value),
  };
  return (
    <div className={`field${p.error ? ' has-error' : ''}`}>
      <label htmlFor={id} className="label">
        <LabelText {...p} />
      </label>
      <div className={`control${p.icon ? ' with-icon' : ''}`}>
        {p.icon && <span className="control-icon">{p.icon}</span>}
        {p.multiline ? (
          <textarea {...common} rows={2} autoComplete={p.autoComplete} />
        ) : (
          <input {...common} type={p.type ?? 'text'} autoComplete={p.autoComplete} inputMode={p.inputMode} />
        )}
      </div>
      {p.hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {p.hint}
        </p>
      )}
      <FieldError id={id} error={p.error} />
    </div>
  );
}

interface CitySelectProps extends LabelProps {
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  icon?: ReactNode;
}

export function CitySelect(p: CitySelectProps) {
  const id = fieldId(p.name);
  return (
    <div className={`field${p.error ? ' has-error' : ''}`}>
      <label htmlFor={id} className="label">
        <LabelText {...p} />
      </label>
      <div className="control with-icon select">
        {p.icon && <span className="control-icon">{p.icon}</span>}
        <select
          id={id}
          name={p.name}
          value={p.value}
          required={p.required}
          aria-invalid={p.error ? true : undefined}
          aria-describedby={p.error ? `${id}-err` : undefined}
          onChange={(e) => p.onChange(e.target.value)}
          className={p.value ? '' : 'is-placeholder'}
        >
          <option value="">Pumili (Select)</option>
          {PROVINCES.map((prov) => (
            <optgroup key={prov} label={prov}>
              {LOCATIONS[prov].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="select-chevron" />
      </div>
      <FieldError id={id} error={p.error} />
    </div>
  );
}

export interface ChoiceOption {
  value: string;
  fil: string;
  en: string;
}

interface ChoiceGroupProps extends LabelProps {
  name: string;
  value: string;
  options: readonly ChoiceOption[];
  onChange: (v: string) => void;
  error?: string;
  columns?: 2 | 3;
  description?: ReactNode;
}

export function ChoiceGroup(p: ChoiceGroupProps) {
  const id = fieldId(p.name);
  return (
    <div className={`field${p.error ? ' has-error' : ''}`}>
      <div
        role="radiogroup"
        id={id}
        tabIndex={-1}
        aria-labelledby={`${id}-label`}
        aria-describedby={p.error ? `${id}-err` : undefined}
        aria-required={p.required}
        aria-invalid={p.error ? true : undefined}
      >
        <p className="label" id={`${id}-label`}>
          <LabelText {...p} />
        </p>
        {p.description}
        <div className={`choices cols-${p.columns ?? 2}`}>
          {p.options.map((o) => (
            <label key={o.value} className={`choice${p.value === o.value ? ' is-checked' : ''}`}>
              <input
                type="radio"
                name={p.name}
                value={o.value}
                checked={p.value === o.value}
                onChange={() => p.onChange(o.value)}
              />
              <span className="choice-dot" aria-hidden="true" />
              <span className="choice-text">
                <b>{o.fil}</b>
                {o.en !== o.fil && <small>{o.en}</small>}
              </span>
            </label>
          ))}
        </div>
      </div>
      <FieldError id={id} error={p.error} />
    </div>
  );
}
