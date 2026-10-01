import { Children, isValidElement, useMemo } from "react";
import { Autocomplete, TextField } from "@mui/material";

const textFromNode = (node) => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement(node)) return textFromNode(node.props.children);
  return "";
};

const SearchableSelect = ({ children, value, onChange, name, label, placeholder = "Buscar...", required, disabled, fullWidth = true, size, error, helperText, sx, select: _legacySelect, SelectProps: _legacySelectProps, ...textFieldProps }) => {
  const options = useMemo(() => Children.toArray(children)
    .filter((child) => isValidElement(child) && child.props.value !== undefined)
    .map((child) => ({
      value: child.props.value,
      label: textFromNode(child.props.children).trim(),
      disabled: Boolean(child.props.disabled),
    })), [children]);
  const selected = options.find((option) => String(option.value) === String(value ?? "")) || null;

  return <Autocomplete
    fullWidth={fullWidth}
    size={size}
    disabled={disabled}
    options={options}
    value={selected}
    getOptionLabel={(option) => option?.label || ""}
    isOptionEqualToValue={(option, selectedOption) => String(option.value) === String(selectedOption.value)}
    getOptionDisabled={(option) => option.disabled}
    onChange={(_, option) => onChange?.({ target: { name, value: option?.value ?? "" } })}
    noOptionsText="Sin resultados"
    renderInput={(params) => <TextField {...params} {...textFieldProps} name={name} label={label} placeholder={placeholder} required={required} error={error} helperText={helperText} />}
    sx={sx}
  />;
};

export default SearchableSelect;
