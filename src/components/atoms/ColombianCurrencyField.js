import { useMemo, useState } from "react";
import { InputAdornment, TextField } from "@mui/material";

const integerFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

const decimalFormatters = new Map();

const getDecimalFormatter = (decimalScale) => {
  if (!decimalFormatters.has(decimalScale)) {
    decimalFormatters.set(
      decimalScale,
      new Intl.NumberFormat("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalScale,
      })
    );
  }

  return decimalFormatters.get(decimalScale);
};

const sanitizeCurrencyValue = (value, decimalScale) => {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  if (decimalScale <= 0) {
    return text.replace(/\D/g, "");
  }

  const normalized = text.replace(/[^\d.,]/g, "");
  const separatorIndex = Math.max(normalized.lastIndexOf(","), normalized.lastIndexOf("."));

  if (separatorIndex < 0) {
    return normalized.replace(/\D/g, "");
  }

  const integerPart = normalized.slice(0, separatorIndex).replace(/\D/g, "");
  const decimalPart = normalized
    .slice(separatorIndex + 1)
    .replace(/\D/g, "")
    .slice(0, decimalScale);

  return decimalPart ? `${integerPart || "0"}.${decimalPart}` : integerPart;
};

const formatCurrencyValue = (value, decimalScale) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return decimalScale > 0 ? getDecimalFormatter(decimalScale).format(number) : integerFormatter.format(number);
};

const getEditableValue = (value, decimalScale) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const sanitized = sanitizeCurrencyValue(value, decimalScale);
  return decimalScale > 0 ? sanitized.replace(".", ",") : sanitized;
};

const ColombianCurrencyField = ({
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  decimalScale = 0,
  error,
  touched,
  helperText,
  InputProps,
  inputProps,
  fullWidth = true,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error && (touched === undefined || touched));
  const displayValue = useMemo(
    () => (focused ? getEditableValue(value, decimalScale) : formatCurrencyValue(value, decimalScale)),
    [decimalScale, focused, value]
  );

  const emitEvent = (sourceEvent, nextValue, callback) => {
    callback?.({
      ...sourceEvent,
      target: {
        ...sourceEvent.target,
        name,
        value: nextValue,
      },
      currentTarget: {
        ...sourceEvent.currentTarget,
        name,
        value: nextValue,
      },
    });
  };

  const handleChange = (event) => {
    emitEvent(event, sanitizeCurrencyValue(event.target.value, decimalScale), onChange);
  };

  const handleFocus = (event) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    emitEvent(event, sanitizeCurrencyValue(value, decimalScale), onBlur);
  };

  return (
    <TextField
      {...props}
      fullWidth={fullWidth}
      name={name}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      error={hasError}
      helperText={hasError ? error : helperText}
      inputProps={{
        inputMode: decimalScale > 0 ? "decimal" : "numeric",
        ...inputProps,
      }}
      InputProps={{
        ...InputProps,
        startAdornment: (
          <>
            <InputAdornment position="start">$</InputAdornment>
            {InputProps?.startAdornment}
          </>
        ),
      }}
    />
  );
};

export { formatCurrencyValue, sanitizeCurrencyValue };
export default ColombianCurrencyField;
