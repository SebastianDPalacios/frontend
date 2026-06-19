import { Chip } from "@mui/material";

export const shortageReasonLabels = {
  count_difference: "Diferencia de conteo",
  handling_loss: "Pérdida en manipulación",
  suspected_theft: "Posible extravío",
  other: "Otro",
};

const shortageReasonColors = {
  count_difference: "info",
  handling_loss: "warning",
  suspected_theft: "error",
  other: "default",
};

const ShortageReasonChip = ({ reason, size = "small" }) => (
  <Chip
    size={size}
    label={shortageReasonLabels[reason] || "Sin motivo"}
    color={shortageReasonColors[reason] || "default"}
    variant={reason === "suspected_theft" ? "filled" : "outlined"}
    sx={{ fontWeight: 800 }}
  />
);

export default ShortageReasonChip;
