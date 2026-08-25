import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert, Box, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Paper, Stack, TextField, Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker, BalanceMonthPicker } from "@core/components/ui/BalancePeriodPickers";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const formatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => formatter.format(Number(value || 0));
const formatWholeInput = (value, fallback = "") => {
  if (value === "" || value === null || value === undefined) return fallback;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? String(Math.round(numericValue)) : fallback;
};
const formatArrobasInput = (value, fallback = "") => {
  if (value === "" || value === null || value === undefined) return fallback;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : fallback;
};
const updateWholeNumber = (value, update) => {
  if (value === "" || /^\d+$/.test(value)) update(value);
};
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const getLocalDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const getMonthRange = (date) => {
  const [year, month] = String(date).slice(0, 7).split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { date_from: `${year}-${String(month).padStart(2, "0")}-01`, date_to: `${year}-${String(month).padStart(2, "0")}-${lastDay}` };
};
const statuses = [
  ["all", "Todos"], ["pending", "Pendientes"], ["in_progress", "Iniciados"],
  ["completed", "Terminados"], ["skipped", "No elaborados"],
];
const statusInfo = {
  pending: { label: "Pendiente", color: "warning" },
  in_progress: { label: "Iniciado", color: "info" },
  completed: { label: "Terminado", color: "success" },
  skipped: { label: "No elaborado", color: "default" },
  cancelled: { label: "Cancelado", color: "error" },
};

const makeDraft = (product) => ({
  actualArrobas: formatArrobasInput(product.actual_arrobas ?? product.planned_arrobas),
  producedQuantity: formatWholeInput(product.produced_quantity ?? product.estimated_units),
  unitsPerTray: String(product.actual_units_per_tray ?? ""),
  trayCount: String(product.actual_tray_count ?? ""),
  looseUnits: String(product.actual_loose_units ?? ""),
  notes: product.baker_notes || "",
  traysOpen: Boolean(product.actual_units_per_tray || product.actual_tray_count || product.actual_loose_units),
});

const buildPayload = (draft) => ({
  p_actual_arrobas: draft.actualArrobas === "" ? null : Number(draft.actualArrobas),
  p_produced_quantity: draft.producedQuantity === "" ? null : Number(draft.producedQuantity),
  p_actual_units_per_tray: draft.unitsPerTray === "" ? null : Number(draft.unitsPerTray),
  p_actual_tray_count: draft.trayCount === "" ? null : Number(draft.trayCount),
  p_actual_loose_units: draft.looseUnits === "" ? null : Number(draft.looseUnits),
  p_baker_notes: draft.notes || null,
});

export const ProductionMyPlanPage = ({ mode = "today" }) => {
  const isHistory = mode === "history";
  const [selectedDate, setSelectedDate] = useState(getLocalDate);
  const [periodType, setPeriodType] = useState("day");
  const [plans, setPlans] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState(null);
  const [skipDialog, setSkipDialog] = useState({ product: null, justification: "" });
  const [correctionDialog, setCorrectionDialog] = useState({ product: null, actualArrobas: "", producedQuantity: "", reason: "" });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const requestParams = periodType === "month" && isHistory
        ? getMonthRange(selectedDate)
        : { planned_date: selectedDate };
      const response = await productionService.getMyPlans(requestParams);
      if (response?.code !== 1) throw new Error(response?.message || "No se pudieron cargar los planes.");
      const nextPlans = normalizeRows(response.data);
      setPlans(nextPlans);
      setDrafts((current) => {
        const next = { ...current };
        nextPlans.flatMap((plan) => normalizeRows(plan.product_assignments)).forEach((product) => {
          const key = String(product.production_plan_output_id);
          next[key] = makeDraft(product);
        });
        return next;
      });
      setError(null);
    } catch (requestError) {
      setError(errorMessage(requestError, "No se pudieron cargar tus planes."));
    } finally {
      setLoading(false);
    }
  }, [isHistory, periodType, selectedDate]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const products = useMemo(() => plans.flatMap((plan) => normalizeRows(plan.product_assignments).map((product) => ({
    ...product,
    planId: plan.id,
    plannedDate: String(plan.planned_date || "").split("T")[0],
    branchName: plan.branch_name,
  }))), [plans]);
  const visibleProducts = filter === "all" ? products : products.filter((product) => product.product_status === filter);
  const legacyPlans = plans.filter((plan) => plan.planning_format === "legacy");

  const changeDraft = (id, field, value) => setDrafts((current) => ({
    ...current,
    [String(id)]: { ...current[String(id)], [field]: value },
  }));
  const runAction = async (id, action, successMessage) => {
    if (workingId) return;
    setWorkingId(String(id));
    try {
      const response = await action();
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo realizar la accion.");
      toast.success(response.message || successMessage);
      await loadPlans();
    } catch (requestError) {
      setError(errorMessage(requestError, "No se pudo actualizar el producto."));
    } finally {
      setWorkingId("");
    }
  };

  return (
    <FlowPageLayout
      title={isHistory ? "Historial de produccion" : "Mi produccion de hoy"}
      subtitle={isHistory ? "Consulta los productos asignados y trabajados en una fecha anterior." : "Aqui aparece unicamente el trabajo que tienes asignado para hoy."}
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {legacyPlans.length ? <Alert severity="info" sx={{ mb: 2 }}>Tienes planes anteriores por receta. Continuan disponibles en Produccion realizada.</Alert> : null}
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          {isHistory ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <TextField select label="Consultar por" value={periodType} onChange={(event) => setPeriodType(event.target.value)} sx={{ width: { xs: "100%", sm: 180 } }}>
                <MenuItem value="day">Día</MenuItem>
                <MenuItem value="month">Mes</MenuItem>
              </TextField>
              <Box sx={{ width: { xs: "100%", sm: 260 } }}>
                {periodType === "month" ? (
                  <BalanceMonthPicker
                    label="Mes a consultar"
                    value={selectedDate.slice(0, 7)}
                    onChange={(value) => setSelectedDate(`${value}-01`)}
                  />
                ) : (
                  <BalanceDatePicker
                    fullWidth
                    label="Fecha a consultar"
                    value={selectedDate}
                    onChange={setSelectedDate}
                  />
                )}
              </Box>
            </Stack>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary">Fecha de trabajo</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{selectedDate}</Typography>
            </Box>
          )}
          <AppButton component={Link} href={isHistory ? "/production/my-plan" : "/production/history"} variant="outlined" color="secondary">
            {isHistory ? "Volver al plan de hoy" : "Ver historial"}
          </AppButton>
        </Stack>
      </Paper>
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1, mb: 2 }}>
        {statuses.map(([value, label]) => (
          <Chip key={value} clickable label={`${label} ${value === "all" ? products.length : products.filter((item) => item.product_status === value).length}`}
            color={filter === value ? "secondary" : "default"} variant={filter === value ? "filled" : "outlined"} onClick={() => setFilter(value)} />
        ))}
      </Stack>
      {loading ? <Alert severity="info">Cargando productos asignados...</Alert> : null}
      {!loading && !visibleProducts.length ? <Alert severity="info">{isHistory ? "No hay productos para la fecha y el estado seleccionados." : "No tienes productos de hoy en este estado."}</Alert> : null}
      <Stack spacing={2}>
        {visibleProducts.map((product) => {
          const id = String(product.production_plan_output_id);
          const draft = drafts[id] || makeDraft(product);
          const status = statusInfo[product.product_status] || statusInfo.pending;
          const editable = !isHistory && product.product_status === "in_progress";
          return (
            <Paper key={id} variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, sm: 2.5 }, borderColor: editable ? "info.main" : "divider" }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>{product.product_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{product.plannedDate} · {product.branchName}</Typography>
                </Box>
                <Chip size="small" label={status.label} color={status.color} />
              </Stack>
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Solicitud</Typography><Typography sx={{ fontWeight: 800 }}>{formatNumber(product.requested_quantity)} {product.request_mode === "units" ? "unidades" : "arrobas"}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Estimado</Typography><Typography sx={{ fontWeight: 800 }}>{formatNumber(product.request_mode === "units" ? product.planned_arrobas : product.estimated_units)} {product.request_mode === "units" ? "arrobas" : "unidades"}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Receta vigente</Typography><Typography sx={{ fontWeight: 800 }}>{product.recipe_name} · V{product.recipe_version}</Typography></Grid>
                {isHistory && product.produced_quantity !== null && product.produced_quantity !== undefined ? <>
                  <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Cantidad producida</Typography><Typography sx={{ fontWeight: 800 }}>{formatNumber(product.produced_quantity)} unidades</Typography></Grid>
                  <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Arrobas utilizadas</Typography><Typography sx={{ fontWeight: 800 }}>{formatNumber(product.actual_arrobas)} arrobas</Typography></Grid>
                </> : null}
                {editable ? <>
                  <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Arrobas realmente utilizadas" value={draft.actualArrobas} onChange={(event) => changeDraft(id, "actualArrobas", event.target.value)} inputProps={{ min: 0.001, step: "0.001" }} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Cantidad producida" value={formatWholeInput(draft.producedQuantity)} onChange={(event) => updateWholeNumber(event.target.value, (value) => changeDraft(id, "producedQuantity", value))} inputProps={{ min: 0, step: 1, inputMode: "numeric" }} helperText="Registra únicamente productos completos." /></Grid>
                  <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Observacion" value={draft.notes} onChange={(event) => changeDraft(id, "notes", event.target.value)} inputProps={{ maxLength: 500 }} /></Grid>
                  <Grid item xs={12}><AppButton variant="text" color="secondary" onClick={() => changeDraft(id, "traysOpen", !draft.traysOpen)}>{draft.traysOpen ? "Ocultar detalle de latas" : "Agregar detalle de latas"}</AppButton></Grid>
                  <Grid item xs={12}><Collapse in={draft.traysOpen}><Grid container spacing={1.5}><Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Unidades por lata reales" value={draft.unitsPerTray} onChange={(event) => changeDraft(id, "unitsPerTray", event.target.value)} /></Grid><Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Numero de latas reales" value={draft.trayCount} onChange={(event) => changeDraft(id, "trayCount", event.target.value)} /></Grid><Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Unidades sueltas" value={draft.looseUnits} onChange={(event) => changeDraft(id, "looseUnits", event.target.value)} /></Grid></Grid></Collapse></Grid>
                </> : null}
              </Grid>
              {product.product_status === "skipped" ? <Alert severity="warning" sx={{ mt: 2 }}>{product.baker_notes}</Alert> : null}
              {!isHistory ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
                {product.product_status === "pending" ? <><AppButton variant="outlined" color="error" onClick={() => setSkipDialog({ product, justification: "" })}>No elaborado</AppButton><AppButton color="secondary" loading={workingId === id} onClick={() => runAction(id, () => productionService.startPlanProduct(id), "Producto iniciado")}>Iniciar producto</AppButton></> : null}
                {editable ? <><AppButton variant="outlined" color="error" onClick={() => setSkipDialog({ product, justification: "" })}>No elaborado</AppButton><AppButton variant="outlined" color="secondary" loading={workingId === id} onClick={() => runAction(id, () => productionService.savePlanProductProgress(id, buildPayload(draft)), "Avance guardado")}>Guardar avance</AppButton><AppButton color="secondary" loading={workingId === id} onClick={() => runAction(id, () => productionService.finishPlanProduct(id, buildPayload(draft)), "Producto finalizado")}>Finalizar producto</AppButton></> : null}
                {product.product_status === "completed" ? <AppButton variant="outlined" color="secondary" onClick={() => setCorrectionDialog({ product, actualArrobas: formatArrobasInput(product.actual_arrobas), producedQuantity: formatWholeInput(product.produced_quantity), reason: "" })}>Corregir registro</AppButton> : null}
              </Stack> : null}
            </Paper>
          );
        })}
      </Stack>
      <Dialog open={Boolean(skipDialog.product)} onClose={() => setSkipDialog({ product: null, justification: "" })} fullWidth maxWidth="sm">
        <DialogTitle>Marcar producto como no elaborado</DialogTitle>
        <DialogContent><Typography sx={{ mb: 2 }}>Esta accion cerrara únicamente {skipDialog.product?.product_name}.</Typography><TextField autoFocus fullWidth multiline minRows={3} label="Justificacion obligatoria" value={skipDialog.justification} onChange={(event) => setSkipDialog((current) => ({ ...current, justification: event.target.value }))} /></DialogContent>
        <DialogActions><AppButton variant="text" onClick={() => setSkipDialog({ product: null, justification: "" })}>Cancelar</AppButton><AppButton color="error" disabled={!skipDialog.justification.trim()} loading={workingId === String(skipDialog.product?.production_plan_output_id)} onClick={() => { const { product, justification } = skipDialog; runAction(product.production_plan_output_id, () => productionService.skipPlanProduct(product.production_plan_output_id, justification), "Producto cerrado"); setSkipDialog({ product: null, justification: "" }); }}>Confirmar</AppButton></DialogActions>
      </Dialog>
      <Dialog open={Boolean(correctionDialog.product)} onClose={() => setCorrectionDialog({ product: null, actualArrobas: "", producedQuantity: "", reason: "" })} fullWidth maxWidth="sm">
        <DialogTitle>Corregir produccion terminada</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Antes del conteo puede corregir el panadero asignado. Con empaque o reservas, la correccion requiere un administrador.</Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField autoFocus fullWidth type="number" label="Arrobas realmente utilizadas" value={correctionDialog.actualArrobas} onChange={(event) => setCorrectionDialog((current) => ({ ...current, actualArrobas: event.target.value }))} inputProps={{ min: 0.001, step: "0.001" }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Cantidad producida" value={formatWholeInput(correctionDialog.producedQuantity)} onChange={(event) => updateWholeNumber(event.target.value, (value) => setCorrectionDialog((current) => ({ ...current, producedQuantity: value })))} inputProps={{ min: 1, step: 1, inputMode: "numeric" }} helperText="No se permiten fracciones de producto." /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Motivo obligatorio" value={correctionDialog.reason} onChange={(event) => setCorrectionDialog((current) => ({ ...current, reason: event.target.value }))} inputProps={{ maxLength: 500 }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <AppButton variant="text" onClick={() => setCorrectionDialog({ product: null, actualArrobas: "", producedQuantity: "", reason: "" })}>Cancelar</AppButton>
          <AppButton color="secondary" disabled={!correctionDialog.reason.trim() || Number(correctionDialog.actualArrobas) <= 0 || !Number.isInteger(Number(correctionDialog.producedQuantity)) || Number(correctionDialog.producedQuantity) <= 0} loading={workingId === String(correctionDialog.product?.production_plan_output_id)} onClick={() => { const current = correctionDialog; runAction(current.product.production_plan_output_id, () => productionService.correctPlanProduct(current.product.production_plan_output_id, { p_actual_arrobas: Number(current.actualArrobas), p_produced_quantity: Number(current.producedQuantity), p_reason: current.reason }), "Correccion registrada"); setCorrectionDialog({ product: null, actualArrobas: "", producedQuantity: "", reason: "" }); }}>Guardar correccion</AppButton>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default ProductionMyPlanPage;
