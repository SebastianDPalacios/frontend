import { InputAdornment, TextField } from "@mui/material";

const PercentageField = ({
  name,
  value,
  onChange,
  error,
  helperText,
  fullWidth = true,
  inputProps,
  ...props
}) => (
  <TextField
    {...props}
    fullWidth={fullWidth}
    name={name}
    type="number"
    value={value}
    onChange={onChange}
    error={Boolean(error)}
    helperText={error || helperText}
    inputProps={{
      min: 0,
      max: 100,
      step: 0.01,
      inputMode: "decimal",
      ...inputProps,
    }}
    InputProps={{
      endAdornment: <InputAdornment position="end">%</InputAdornment>,
    }}
  />
);

export default PercentageField;
