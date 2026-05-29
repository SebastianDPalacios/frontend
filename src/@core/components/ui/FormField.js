import { useState } from "react";
import { TextField, FormHelperText, Box, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

/**
 * Componente FormField reutilizable
 * Encapsula TextField con validación, error display y estilos consistentes
 * Soporta toggle de visibilidad para campos de contraseña
 */
const FormField = ({
  name,
  label,
  type = "text",
  value,
  error,
  touched,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  multiline = false,
  rows = 1,
  autoComplete = "off",
  helperText,
  maxLength,
  showPasswordToggle = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = Boolean(error && touched);
  const displayError = hasError ? error : helperText;

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const fieldType = showPasswordToggle && showPassword ? "text" : type;

  const endAdornment = showPasswordToggle ? (
    <InputAdornment position="end">
      <IconButton
        onClick={handleTogglePassword}
        onMouseDown={(e) => e.preventDefault()}
        edge="end"
        disabled={disabled}
        size="small"
        sx={{ mr: -1 }}
      >
        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </InputAdornment>
  ) : null;

  return (
    <Box>
      <TextField
        fullWidth
        name={name}
        label={label}
        type={fieldType}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        error={hasError}
        multiline={multiline}
        rows={rows}
        autoComplete={autoComplete}
        inputProps={{
          maxLength: maxLength,
        }}
        InputProps={{
          endAdornment: endAdornment,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            "&:hover fieldset": {
              borderColor: hasError ? "error.main" : "primary.main",
            },
          },
        }}
        {...props}
      />
      {displayError && (
        <FormHelperText error={hasError} sx={{ mt: 0.5 }}>
          {displayError}
        </FormHelperText>
      )}
    </Box>
  );
};

export default FormField;
