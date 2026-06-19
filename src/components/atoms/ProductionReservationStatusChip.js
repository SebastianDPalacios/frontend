import { Chip } from "@mui/material";

const statusConfig = {
  reserved: { label: "Reservada", color: "warning" },
  partially_delivered: { label: "Entrega parcial", color: "info" },
  delivered: { label: "Entregada", color: "success" },
  released: { label: "Liberada", color: "default" },
  cancelled: { label: "Cancelada", color: "error" },
};

const ProductionReservationStatusChip = ({ status }) => {
  const config = statusConfig[status] || { label: status || "Sin estado", color: "default" };

  return <Chip size="small" label={config.label} color={config.color} variant="outlined" />;
};

export default ProductionReservationStatusChip;
