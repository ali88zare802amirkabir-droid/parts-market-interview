"use client";

import * as React from "react";
import { cn, toEnDigits, toFa } from "@/lib/utils";
import type { Question } from "@/lib/questions";

export interface FieldProps {
  question: Question;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error?: string;
}

function FieldShell({
  question,
  error,
  children,
}: {
  question: Question;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[15px] font-semibold leading-6">
        {question.label}
        {question.required ? <span className="mr-0.5 text-danger">*</span> : null}
      </label>
      {question.hint ? <p className="-mt-0.5 text-xs text-faint">{question.hint}</p> : null}
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function TextField({ question, value, onChange, error }: FieldProps) {
  return (
    <FieldShell question={question} error={error}>
      <input
        type="text"
        className={cn("field", error && "input-error")}
        value={typeof value === "string" ? value : ""}
        placeholder={question.placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </FieldShell>
  );
}

export function NumberField({ question, value, onChange, error }: FieldProps) {
  const [raw, setRaw] = React.useState<string>(typeof value === "string" ? value : "");

  React.useEffect(() => {
    setRaw(typeof value === "string" ? value : "");
  }, [value]);

  return (
    <FieldShell question={question} error={error}>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          className={cn("field", error && "input-error")}
          value={raw}
          placeholder="۰"
          onChange={(e) => {
            const normalized = toEnDigits(e.target.value).replace(/[^\d]/g, "");
            setRaw(normalized);
            onChange(normalized);
          }}
        />
        {question.suffix ? (
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-faint">
            {question.suffix}
          </span>
        ) : null}
      </div>
      {typeof value === "string" && value ? (
        <p className="text-xs text-faint">
          مقدار واردشده: <span className="font-bold tabular-nums">{toFa(value)}{question.suffix ?? ""}</span>
        </p>
      ) : null}
    </FieldShell>
  );
}

export function TextareaField({ question, value, onChange, error }: FieldProps) {
  return (
    <FieldShell question={question} error={error}>
      <textarea
        className={cn("field", error && "input-error")}
        value={typeof value === "string" ? value : ""}
        placeholder={question.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function SelectField({ question, value, onChange, error }: FieldProps) {
  return (
    <FieldShell question={question} error={error}>
      <select
        className={cn("field", error && "input-error")}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">انتخاب کنید…</option>
        {question.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function RadioField({ question, value, onChange, error }: FieldProps) {
  const selected = typeof value === "string" ? value : "";
  return (
    <FieldShell question={question} error={error}>
      <div className="flex flex-col gap-2">
        {question.options?.map((o) => {
          const active = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn("radio-card", active && "radio-card-selected")}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  active ? "border-primary" : "border-hairline",
                )}
              >
                {active ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                ) : null}
              </span>
              <span className="text-[15px]">{o.label}</span>
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function MultiSelectField({ question, value, onChange, error }: FieldProps) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (v: string) => {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      onChange([...selected, v]);
    }
  };
  return (
    <FieldShell question={question} error={error}>
      <div className="flex flex-wrap gap-2">
        {question.options?.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              aria-pressed={active}
              className={cn("chip", active && "chip-selected")}
            >
              {active ? <span className="text-primary">✓</span> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function renderField(
  question: Question,
  value: string | string[] | undefined,
  onChange: (value: string | string[]) => void,
  error?: string,
  keyPrefix = "",
) {
  const props: FieldProps = { question, value, onChange, error };
  const key = `${keyPrefix}${question.key}`;
  switch (question.type) {
    case "number":
      return <NumberField key={key} {...props} />;
    case "textarea":
      return <TextareaField key={key} {...props} />;
    case "select":
      return <SelectField key={key} {...props} />;
    case "radio":
      return <RadioField key={key} {...props} />;
    case "multiselect":
      return <MultiSelectField key={key} {...props} />;
    default:
      return <TextField key={key} {...props} />;
  }
}