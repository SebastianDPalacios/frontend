import { Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const PaginationControls = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  previousLabel = "Anterior",
  nextLabel = "Siguiente",
  label,
  sx,
}) => (
  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "center", alignItems: "center", ...sx }}>
    <AppButton variant="outlined" color="secondary" onClick={onPrevious} disabled={currentPage <= 1}>
      {previousLabel}
    </AppButton>
    <Typography variant="body2" color="text.secondary">
      {label || `Página ${currentPage} de ${totalPages}`}
    </Typography>
    <AppButton variant="outlined" color="secondary" onClick={onNext} disabled={currentPage >= totalPages}>
      {nextLabel}
    </AppButton>
  </Stack>
);

export default PaginationControls;
