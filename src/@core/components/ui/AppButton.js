import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

/**
 * Componente AppButton mejorado con loading state
 */
const AppButton = ({
  children,
  variant = "contained",
  color = "primary",
  loading = false,
  disabled = false,
  loadingLabel = "Cargando...",
  ...props
}) => {
  return (
    <Button
      variant={variant}
      color={color}
      disabled={disabled || loading}
      {...props}
      sx={{
        position: "relative",
        ...props.sx,
      }}
    >
      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={20} color="inherit" />
          <span>{loadingLabel}</span>
        </Box>
      ) : (
        children
      )}
    </Button>
  );
};

export default AppButton;
