import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ProductionReservationStatusChip from "components/atoms/ProductionReservationStatusChip";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

const ProductionReservationCard = ({ reservation, busy, onDeliver, onRelease }) => {
  const canManage = ["reserved", "partially_delivered"].includes(reservation.status);
  const isProductionFinished = Boolean(reservation.production_batch_id);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>{reservation.product_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {reservation.baker_name} · {String(reservation.planned_date || "").slice(0, 10)}
            </Typography>
          </Box>
          <ProductionReservationStatusChip status={reservation.status} />
        </Stack>

        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Reservadas</Typography>
            <Typography sx={{ fontWeight: 800 }}>{numberFormatter.format(Number(reservation.quantity || 0))}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Entregadas</Typography>
            <Typography sx={{ fontWeight: 800 }}>{numberFormatter.format(Number(reservation.delivered_quantity || 0))}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Producción</Typography>
            <Typography sx={{ fontWeight: 800 }}>{isProductionFinished ? "Finalizada" : "En proceso"}</Typography>
          </Box>
        </Stack>

        {reservation.notes ? (
          <Typography variant="body2" color="text.secondary">{reservation.notes}</Typography>
        ) : null}

        {canManage ? (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              disabled={busy || !isProductionFinished}
              onClick={() => onDeliver(reservation)}
            >
              Confirmar entrega directa
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              disabled={busy}
              onClick={() => onRelease(reservation)}
            >
              Liberar
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default ProductionReservationCard;
