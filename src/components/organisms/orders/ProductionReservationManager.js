import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import ProductionReservationCard from "components/molecules/ProductionReservationCard";
import ordersService from "services/orders/orders-service";
import { normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

const ProductionReservationManager = ({ order, disabled, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => String(option.production_plan_output_id) === String(selectedOptionId)),
    [options, selectedOptionId]
  );

  const loadData = useCallback(async () => {
    if (!order?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [optionsResponse, reservationsResponse] = await Promise.all([
        ordersService.getProductionReservationOptions(Number(order.id)),
        ordersService.getProductionReservations(Number(order.id)),
      ]);
      if (optionsResponse?.code !== 1 || reservationsResponse?.code !== 1) {
        setError(optionsResponse?.message || reservationsResponse?.message || "No se pudieron cargar las reservas.");
        return;
      }
      setOptions(normalizeRows(optionsResponse.data?.items));
      setReservations(normalizeRows(reservationsResponse.data?.items));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al cargar producción disponible."));
    } finally {
      setLoading(false);
    }
  }, [order?.id]);

  useEffect(() => {
    if (open) loadData();
  }, [loadData, open]);

  const createReservation = async () => {
    const parsedQuantity = Number(quantity);
    if (!selectedOption || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Selecciona una producción e indica una cantidad mayor que cero.");
      return;
    }
    setBusyId("create");
    setError(null);
    try {
      const response = await ordersService.createProductionReservation(Number(order.id), {
        p_order_item_id: Number(selectedOption.order_item_id),
        p_production_plan_output_id: Number(selectedOption.production_plan_output_id),
        p_quantity: parsedQuantity,
        p_notes: notes.trim() || null,
      });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo crear la reserva.");
        return;
      }
      toast.success(response.message || "Producción reservada");
      setSelectedOptionId("");
      setQuantity("");
      setNotes("");
      await loadData();
      onChanged?.();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al reservar producción."));
    } finally {
      setBusyId(null);
    }
  };

  const runReservationAction = async (reservation, action) => {
    setBusyId(reservation.id);
    setError(null);
    try {
      const response = action === "deliver"
        ? await ordersService.deliverProductionReservation(Number(reservation.id))
        : await ordersService.releaseProductionReservation(Number(reservation.id));
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo actualizar la reserva.");
        return;
      }
      toast.success(response.message);
      await loadData();
      onChanged?.();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al actualizar la reserva."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        disabled={disabled || !order?.id}
        onClick={() => setOpen(true)}
      >
        Venta desde producción
      </Button>

      <Dialog open={open} onClose={() => !busyId && setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Venta desde producción · Pedido #{order?.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Alert severity="info">
              Reserva unidades mientras se fabrican. La entrega directa solo se confirma cuando el panadero finaliza el lote.
            </Alert>
            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Nueva reserva</Typography>
              <TextField
                select
                fullWidth
                label="Producción disponible"
                value={selectedOptionId}
                disabled={loading || busyId}
                onChange={(event) => {
                  setSelectedOptionId(event.target.value);
                  const option = options.find(
                    (item) => String(item.production_plan_output_id) === String(event.target.value)
                  );
                  setQuantity(option ? String(Math.min(Number(option.available_to_reserve), Number(option.order_pending_quantity))) : "");
                }}
              >
                {options.map((option) => (
                  <MenuItem key={`${option.order_item_id}-${option.production_plan_output_id}`} value={String(option.production_plan_output_id)}>
                    {option.product_name} · {option.baker_name} · {option.production_stage === "finished" ? "finalizada" : "en proceso"}
                    {" · "}{numberFormatter.format(Number(option.available_to_reserve || 0))} disponibles
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad a reservar"
                  value={quantity}
                  disabled={!selectedOption || busyId}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputProps={{
                    min: 0.001,
                    max: selectedOption
                      ? Math.min(Number(selectedOption.available_to_reserve), Number(selectedOption.order_pending_quantity))
                      : undefined,
                    step: 0.001,
                  }}
                />
                <TextField
                  fullWidth
                  label="Nota"
                  value={notes}
                  disabled={busyId}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Stack>
              <Button
                variant="contained"
                color="secondary"
                onClick={createReservation}
                disabled={!selectedOption || busyId}
                sx={{ alignSelf: "flex-start" }}
              >
                Reservar unidades
              </Button>
              {!loading && options.length === 0 ? (
                <Alert severity="warning">No hay producción iniciada disponible para los productos de este pedido.</Alert>
              ) : null}
            </Stack>

            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Reservas del pedido</Typography>
              {reservations.map((reservation) => (
                <ProductionReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  busy={Boolean(busyId)}
                  onDeliver={(item) => runReservationAction(item, "deliver")}
                  onRelease={(item) => runReservationAction(item, "release")}
                />
              ))}
              {!loading && reservations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Este pedido todavía no tiene reservas.</Typography>
              ) : null}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setOpen(false)} disabled={Boolean(busyId)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductionReservationManager;
