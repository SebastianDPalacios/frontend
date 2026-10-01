import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker, BalanceMonthPicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import productionService from "services/production/production-service";
import authService from "services/auth/auth-service";
import { canManageProduction } from "configs/access";
import { normalizeRows } from "views/modules/flow-utils";
import SearchableSelect from "@core/components/ui/SearchableSelect";

const formatUnits = (value) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(value || 0));
const normalizeWholeNumberInput = (value, update) => {
  if (value === "" || /^\d+$/.test(value)) update(value);
};
const formatDate = (value) => String(value || "").split("T")[0] || "-";
const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue).slice(0, 7).split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { dateFrom: `${year}-${String(month).padStart(2, "0")}-01`, dateTo: `${year}-${String(month).padStart(2, "0")}-${lastDay}` };
};
const damageLabels = { production: "Produccion", oven: "Horneo", cut: "Corte", packaging: "Empaque" };
const missingLabels = { count_difference: "Diferencia detectada", handling_loss: "Pérdida en manipulación", suspected_theft: "Posible extravío", other: "Otro" };
const reconciliationLabels = { matched: "Conciliado", shortage: "Faltante", surplus: "Sobrante" };

const PackagingHistoryPanel = () => {
  const router = useRouter();
  const deepLinkInitialized = useRef(false);
  const deepLinkOpened = useRef(false);
  const isAdministrator = canManageProduction(authService.getCurrentUser() || {});
  const today = toDateInputValue();
  const [periodType, setPeriodType] = useState("day");
  const [dateValue, setDateValue] = useState(today);
  const [monthValue, setMonthValue] = useState(today.slice(0, 7));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [correction, setCorrection] = useState(null);
  const [correctedQuantity, setCorrectedQuantity] = useState("");
  const [correctedDamages, setCorrectedDamages] = useState([]);
  const [correctedBatchQuantity, setCorrectedBatchQuantity] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [savingCorrection, setSavingCorrection] = useState(false);

  useEffect(() => {
    if (!router.isReady || deepLinkInitialized.current) return;
    deepLinkInitialized.current = true;
    const queryDate = String(router.query.date || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      setPeriodType("day");
      setDateValue(queryDate);
    }
    if (router.query.batchId) setSearch(String(router.query.batchId));
  }, [router.isReady, router.query.batchId, router.query.date]);

  const period = useMemo(() => periodType === "month"
    ? getMonthRange(monthValue)
    : { dateFrom: dateValue, dateTo: dateValue }, [dateValue, monthValue, periodType]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productionService.getPackingHistory({
        date_from: period.dateFrom,
        date_to: period.dateTo,
        search: search.trim() || undefined,
        page: page + 1,
        page_size: pageSize,
      });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo cargar el historial.");
      setRows(normalizeRows(response.data?.rows));
      setTotal(Number(response.data?.total || 0));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, period, search]);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { setPage(0); }, [dateValue, monthValue, periodType, search]);

  const openDetail = async (report) => {
    setDetail(report);
    setCorrections([]);
    if (!isAdministrator || !normalizeRows(report.items).some((item) => item.reconciliation_status)) return;
    try {
      const response = await productionService.getProductionCorrections({ production_batch_id: report.production_batch_id });
      if (response?.code === 1) setCorrections(normalizeRows(response.data));
    } catch (_error) {
      setCorrections([]);
    }
  };

  const openCorrection = (type, item) => {
    setCorrection({ type, item });
    setCorrectedQuantity(String(Number(type === "packing" ? item.packed_quantity : item.produced_quantity)));
    setCorrectedDamages(type === "packing" ? normalizeRows(item.damages).map((damage) => ({
      id: damage.id || `${Date.now()}-${Math.random()}`,
      quantity: String(Number(damage.quantity)),
      reason: damage.reason || "packaging",
      detail: damage.detail || "",
    })) : []);
    setCorrectedBatchQuantity("");
    setCorrectionReason("");
  };

  useEffect(() => {
    if (!router.isReady || loading || deepLinkOpened.current || !router.query.batchId) return;
    const target = rows.find((report) => String(report.production_batch_id) === String(router.query.batchId));
    if (!target) return;
    deepLinkOpened.current = true;
    setDetail(target);
    setCorrections([]);
    if (isAdministrator && normalizeRows(target.items).some((entry) => entry.reconciliation_status)) {
      productionService.getProductionCorrections({ production_batch_id: target.production_batch_id })
        .then((response) => {
          if (response?.code === 1) setCorrections(normalizeRows(response.data));
        })
        .catch(() => setCorrections([]));
    }
    const correctionType = router.query.correction === "production" ? "production" : router.query.correction === "packing" ? "packing" : null;
    const targetItems = normalizeRows(target.items);
    const item = targetItems.length === 1 ? targetItems[0] : null;
    if (isAdministrator && correctionType && item?.reconciliation_status) openCorrection(correctionType, item);
  }, [isAdministrator, loading, router.isReady, router.query.batchId, router.query.correction, rows]);

  const saveCorrection = async () => {
    const quantity = Number(correctedQuantity);
    const invalidDamage = correctedDamages.some((damage) => !Number.isInteger(Number(damage.quantity)) || Number(damage.quantity) <= 0 || !damage.reason);
    if (!Number.isInteger(quantity) || quantity < 0 || invalidDamage || correctionReason.trim().length < 5) {
      setError("Indica cantidades enteras, el motivo de cada daño y una justificación de al menos 5 caracteres.");
      return;
    }
    setSavingCorrection(true);
    setError(null);
    try {
      const response = correction.type === "packing"
        ? await productionService.correctPackingItem(correction.item.id, {
          corrected_quantity: quantity,
          damages: correctedDamages.map((damage) => ({ quantity: Number(damage.quantity), reason: damage.reason, detail: damage.detail.trim() || null })),
          reason: correctionReason.trim(),
        })
        : await productionService.correctProductionOutput(correction.item.production_batch_output_id, {
          corrected_quantity: quantity,
          corrected_batch_quantity: correctedBatchQuantity === "" ? null : Number(correctedBatchQuantity),
          reason: correctionReason.trim(),
        });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo guardar la corrección.");
      setCorrection(null);
      setDetail(null);
      await loadHistory();
      if (router.query.returnTo === "/production/day") {
        const query = { date: String(router.query.date || toDateInputValue()) };
        if (router.query.branchId) query.branchId = String(router.query.branchId);
        await router.push({ pathname: "/production/day", query });
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "No se pudo guardar la corrección.");
    } finally {
      setSavingCorrection(false);
    }
  };

  const totals = (report) => normalizeRows(report.items).reduce((result, item) => ({
    packed: result.packed + Number(item.packed_quantity || 0),
    damaged: result.damaged + Number(item.damaged_quantity || 0),
    missing: result.missing + Number(item.missing_quantity || 0),
  }), { packed: 0, damaged: 0, missing: 0 });
  const productNames = (report) => Array.from(new Set(
    normalizeRows(report.items).map((item) => String(item.product_name || "").trim()).filter(Boolean)
  ));
  const showsReconciliation = rows.some((report) => normalizeRows(report.items).some((item) => item.reconciliation_status));

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
          <Grid item xs={12} sm={4} md={2}>
            <SearchableSelect select fullWidth label="Consultar por" value={periodType} onChange={(event) => setPeriodType(event.target.value)}>
              <MenuItem value="day">Dia</MenuItem>
              <MenuItem value="month">Mes</MenuItem>
            </SearchableSelect>
          </Grid>
          <Grid item xs={12} sm={8} md={3}>
            {periodType === "month" ? (
              <BalanceMonthPicker label="Mes del empaque" value={monthValue} onChange={setMonthValue} />
            ) : (
              <BalanceDatePicker fullWidth label="Fecha del empaque" value={dateValue} onChange={setDateValue} />
            )}
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField fullWidth label="Buscar" placeholder="Lote, producto, sucursal o empaquetador" value={search} onChange={(event) => setSearch(event.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <AppButton fullWidth variant="outlined" color="secondary" onClick={loadHistory}>Actualizar</AppButton>
          </Grid>
        </Grid>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <Alert severity="info">Cargando historial de empaques...</Alert> : null}
      {!loading && !rows.length ? <Alert severity="info">No hay empaques registrados en el periodo seleccionado.</Alert> : null}

      {!loading && rows.length ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 1120 }}>
            <TableHead><TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 900 } }}>
              <TableCell>Fecha</TableCell><TableCell>Lote</TableCell><TableCell>Producto</TableCell><TableCell>Sucursal</TableCell><TableCell>Empaquetador</TableCell>
              <TableCell align="right">Empacado</TableCell>
              <TableCell align="right">Dañado</TableCell>{showsReconciliation ? <TableCell align="right">Conciliación</TableCell> : null}<TableCell align="right">Acciones</TableCell>
            </TableRow></TableHead>
            <TableBody>{rows.map((report) => {
              const summary = totals(report);
              return <TableRow key={report.id} hover>
                <TableCell>{formatDate(report.packed_date)}</TableCell>
                <TableCell><Typography sx={{ fontWeight: 900 }}>#{report.production_batch_id}</Typography><Typography variant="caption" color="text.secondary">{report.recipe_name || "Produccion"}</Typography></TableCell>
                <TableCell>{productNames(report).map((name) => <Typography key={name} sx={{ fontWeight: 800 }}>{name}</Typography>)}</TableCell>
                <TableCell>{report.branch_name}</TableCell><TableCell>{report.packer_name}</TableCell>
                <TableCell align="right">{formatUnits(summary.packed)}</TableCell>
                <TableCell align="right"><Chip size="small" color={summary.damaged ? "error" : "default"} variant="outlined" label={formatUnits(summary.damaged)} /></TableCell>
                {showsReconciliation ? <TableCell align="right"><Chip size="small" color={normalizeRows(report.items).some((item) => item.reconciliation_status === "shortage") ? "warning" : normalizeRows(report.items).some((item) => item.reconciliation_status === "surplus") ? "info" : "success"} variant="outlined" label={normalizeRows(report.items).map((item) => reconciliationLabels[item.reconciliation_status]).filter(Boolean).join(", ") || "-"} /></TableCell> : null}
                <TableCell align="right"><AppButton variant="outlined" color="secondary" onClick={() => openDetail(report)}>Ver detalle</AppButton></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
          <TablePagination component="div" count={total} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_event, value) => setPage(value)} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} labelRowsPerPage="Filas por pagina" />
        </TableContainer>
      ) : null}

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 950 }}>Detalle del empaque · Lote #{detail?.production_batch_id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography color="text.secondary">{formatDate(detail?.packed_date)} · {detail?.branch_name} · {detail?.packer_name}</Typography>
            {detail?.notes ? <Alert severity="info">{detail.notes}</Alert> : null}
            {normalizeRows(detail?.items).map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 900 }}>{item.product_name}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                  <Chip label={`${formatUnits(item.packed_quantity)} a inventario`} color="success" variant="outlined" />
                  <Chip label={`${formatUnits(item.damaged_quantity)} dañados`} color="error" variant="outlined" />
                  {item.reconciliation_status ? <Chip label={reconciliationLabels[item.reconciliation_status] || item.reconciliation_status} color={item.reconciliation_status === "matched" ? "success" : item.reconciliation_status === "surplus" ? "info" : "warning"} variant="outlined" /> : null}
                </Stack>
                {item.reconciliation_status ? <Typography variant="body2" sx={{ mt: 1 }}>Producido: {formatUnits(item.produced_quantity)} · Empacado: {formatUnits(item.packed_quantity)} · Dañado: {formatUnits(item.damaged_quantity)} · Total encontrado: {formatUnits(item.found_quantity)} · Faltante: {formatUnits(item.shortage_quantity)} · Sobrante: {formatUnits(item.surplus_quantity)}</Typography> : null}
                {isAdministrator && item.reconciliation_status ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}><AppButton size="small" variant="outlined" color="secondary" onClick={() => openCorrection("packing", item)}>Corregir conteo</AppButton><AppButton size="small" variant="outlined" color="secondary" onClick={() => openCorrection("production", item)}>Corregir producción</AppButton></Stack> : null}
                {Number(item.damaged_quantity || 0) > 0 ? <Typography variant="body2" sx={{ mt: 1 }}>Motivo del daño: {damageLabels[item.damage_reason] || item.damage_reason || "Sin motivo"}</Typography> : null}
                {Number(item.missing_quantity || 0) > 0 ? <Typography variant="body2" sx={{ mt: 0.5 }}>Motivo del faltante: {missingLabels[item.missing_reason] || item.missing_reason || "Sin motivo"}</Typography> : null}
                {item.notes ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Notas: {item.notes}</Typography> : null}
              </Paper>
            ))}
            {corrections.length ? <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography sx={{ fontWeight: 900, mb: 1 }}>Historial de correcciones</Typography>{corrections.map((entry) => <Box key={entry.id} sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}><Typography variant="body2" sx={{ fontWeight: 800 }}>{entry.correction_type === "packing" ? "Conteo" : "Producción"}: {formatUnits(entry.original_quantity)} → {formatUnits(entry.corrected_quantity)}</Typography><Typography variant="caption" color="text.secondary">{entry.reason} · {entry.corrected_by_name} · {String(entry.created_at || "").replace("T", " ").slice(0, 19)}</Typography></Box>)}</Paper> : null}
            <Typography variant="caption" color="text.secondary">Registrado por {detail?.created_by_name || detail?.packer_name || "Usuario"} · {formatDate(detail?.created_at)}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><AppButton color="secondary" onClick={() => setDetail(null)}>Cerrar</AppButton></DialogActions>
      </Dialog>

      <Dialog open={Boolean(correction)} onClose={() => !savingCorrection && setCorrection(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 950 }}>Corrección administrativa</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="warning">El valor original se conservará y el ajuste quedará auditado.</Alert>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>{correction?.item?.product_name || "Producto"}</Typography>
                <Typography variant="body2" color="text.secondary">{correction?.item?.product_sku || "Sin SKU"}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "grey.50" }}>
                <Typography variant="caption" color="text.secondary">VALOR ORIGINAL</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {formatUnits(correction?.type === "packing" ? correction?.item?.packed_quantity : correction?.item?.produced_quantity)} unidades
                </Typography>
              </Box>
              <TextField
                type="number"
                fullWidth
                label={correction?.type === "packing" ? "Conteo corregido" : "Producción corregida"}
                value={correctedQuantity}
                onChange={(event) => normalizeWholeNumberInput(event.target.value, setCorrectedQuantity)}
                inputProps={{ min: correction?.type === "packing" ? 0 : 1, step: 1, inputMode: "numeric" }}
              />
              {correction?.type === "packing" ? <>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box><Typography sx={{ fontWeight: 900 }}>Daños</Typography><Typography variant="caption" color="text.secondary">Corrige, agrega o retira daños del conteo.</Typography></Box>
                  <AppButton variant="outlined" color="secondary" onClick={() => setCorrectedDamages((current) => [...current, { id: `${Date.now()}`, quantity: "", reason: "packaging", detail: "" }])}>Agregar daño</AppButton>
                </Stack>
                {correctedDamages.map((damage, index) => <Grid container spacing={1} key={damage.id} alignItems="center">
                  <Grid item xs={12} sm={3}><TextField type="number" fullWidth label={`Cantidad ${index + 1}`} value={damage.quantity} onChange={(event) => normalizeWholeNumberInput(event.target.value, (value) => setCorrectedDamages((current) => current.map((entry) => entry.id === damage.id ? { ...entry, quantity: value } : entry)))} inputProps={{ min: 1, step: 1, inputMode: "numeric" }} /></Grid>
                  <Grid item xs={12} sm={3}><SearchableSelect select fullWidth label="Motivo" value={damage.reason} onChange={(event) => setCorrectedDamages((current) => current.map((entry) => entry.id === damage.id ? { ...entry, reason: event.target.value } : entry))}>{Object.entries(damageLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</SearchableSelect></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="Detalle opcional" value={damage.detail} onChange={(event) => setCorrectedDamages((current) => current.map((entry) => entry.id === damage.id ? { ...entry, detail: event.target.value } : entry))} /></Grid>
                  <Grid item xs={12} sm={2}><AppButton fullWidth variant="outlined" color="error" onClick={() => setCorrectedDamages((current) => current.filter((entry) => entry.id !== damage.id))}>Retirar</AppButton></Grid>
                </Grid>)}
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Conteo: {formatUnits(correctedQuantity)} · Dañados: {formatUnits(correctedDamages.reduce((total, damage) => total + Number(damage.quantity || 0), 0))}</Typography>
              </> : null}
            </Stack>
          </Paper>
          {correction?.type === "production" ? <TextField type="number" label="Cantidad de receta/lote corregida (opcional)" value={correctedBatchQuantity} onChange={(event) => setCorrectedBatchQuantity(event.target.value)} helperText="Déjalo vacío si no corresponde ajustar materias primas." inputProps={{ min: 0.001, step: 0.001 }} /> : null}
          <TextField multiline minRows={3} label="Motivo obligatorio" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} />
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><AppButton variant="outlined" color="secondary" disabled={savingCorrection} onClick={() => setCorrection(null)}>Cancelar</AppButton><AppButton color="secondary" disabled={savingCorrection} onClick={saveCorrection}>{savingCorrection ? "Guardando..." : "Guardar corrección"}</AppButton></DialogActions>
      </Dialog>
    </Stack>
  );
};

export default PackagingHistoryPanel;
