import type { ChangeEvent, FocusEvent } from "react";
import { isLooseDateTyping, normalizeDateInput } from "../lib/dates";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
};

/**
 * Text date field — avoids broken browser <input type="date"> year typing
 * (e.g. typing 198… collapsing to 008).
 */
export function DateTextInput({
  value,
  onChange,
  id,
  placeholder = "1990 / 15.03.1990",
  "aria-label": ariaLabel,
}: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (next === "" || isLooseDateTyping(next)) {
      onChange(next);
    }
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const normalized = normalizeDateInput(e.target.value);
    if (normalized !== e.target.value) onChange(normalized);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="text"
      autoComplete="bday"
      spellCheck={false}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
