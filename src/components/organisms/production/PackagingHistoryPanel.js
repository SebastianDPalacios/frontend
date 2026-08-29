import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker, BalanceMonthPicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import productionService from "services/production/production-service";
import { normalizeRows } from "views/modules/flow-utils";

const formatUnits = (value) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(value || 0));
const formatDate = (value) => String(value || "").split("T")[0] || "-";
const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue).slice(0, 7).split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { dateFrom: `${year}-${String(month).padStart(2, "0")}-01`, dateTo: `${year}-${String(month).padStart(2, "0")}-${lastDay}` };
};
const damageLabels = { production: "Produccion", oven: "Horneo", cut: "Corte", packaging: "Empaque" };
const missingLabels = { count_difference: "Diferencia de conteo", handling_loss: "Perdida en manipulacion", suspected_theft: "Posible extravio", other: "Otro" };

const PackagingHistoryPanel = () => {
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

  const totals = (report) => normalizeRows(report.items).reduce((result, item) => ({
    counted: result.counted + Number(item.counted_quantity || 0),
    packed: result.packed + Number(item.packed_quantity || 0),
    damaged: result.damaged + Number(item.damaged_quantity || 0),
    missing: result.missing + Number(item.missing_quantity || 0),
  }), { counted: 0, packed: 0, damaged: 0, missing: 0 });

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
          <Grid item xs={12} sm={4} md={2}>
            <TextField select fullWidth label="Consultar por" value={periodType} onChange={(event) => setPeriodType(event.target.value)}>
              <MenuItem value="day">Dia</MenuItem>
              <MenuItem value="month">Mes</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8} md={3}>
            {periodType === "month" ? (
              <BalanceMonthPicker label="Mes del conteo" value={monthValue} onChange={setMonthValue} />
            ) : (
              <BalanceDatePicker fullWidth label="Fecha del conteo" value={dateValue} onChange={setDateValue} />
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
      {loading ? <Alert severity="info">Cargando historial de conteos...</Alert> : null}
      {!loading && !rows.length ? <Alert severity="info">No hay conteos registrados en el periodo seleccionado.</Alert> : null}

      {!loading && rows.length ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 980 }}>
            <TableHead><TableRow sx={{ "& th": { bgcolor: "background.default", fontWeight: 900 } }}>
              <TableCell>Fecha</TableCell><TableCell>Lote</TableCell><TableCell>Sucursal</TableCell><TableCell>Empaquetador</TableCell>
              <TableCell align="right">Contado</TableCell><TableCell align="right">Inventario</TableCell>
              <TableCell align="right">Dañado</TableCell><TableCell align="right">Faltante</TableCell><TableCell align="right">Acciones</TableCell>
            </TableRow></TableHead>
            <TableBody>{rows.map((report) => {
              const summary = totals(report);
              return <TableRow key={report.id} hover>
                <TableCell>{formatDate(report.packed_date)}</TableCell>
                <TableCell><Typography sx={{ fontWeight: 900 }}>#{report.production_batch_id}</Typography><Typography variant="caption" color="text.secondary">{report.recipe_name || "Produccion"}</Typography></TableCell>
                <TableCell>{report.branch_name}</TableCell><TableCell>{report.packer_name}</TableCell>
                <TableCell align="right">{formatUnits(summary.counted)}</TableCell><TableCell align="right">{formatUnits(summary.packed)}</TableCell>
                <TableCell align="right"><Chip size="small" color={summary.damaged ? "error" : "default"} variant="outlined" label={formatUnits(summary.damaged)} /></TableCell>
                <TableCell align="right"><Chip size="small" color={summary.missing ? "warning" : "default"} variant="outlined" label={formatUnits(summary.missing)} /></TableCell>
                <TableCell align="right"><AppButton variant="outlined" color="secondary" onClick={() => setDetail(report)}>Ver detalle</AppButton></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
          <TablePagination component="div" count={total} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_event, value) => setPage(value)} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} labelRowsPerPage="Filas por pagina" />
        </TableContainer>
      ) : null}

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 950 }}>Detalle del conteo · Lote #{detail?.production_batch_id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography color="text.secondary">{formatDate(detail?.packed_date)} · {detail?.branch_name} · {detail?.packer_name}</Typography>
            {detail?.notes ? <Alert severity="info">{detail.notes}</Alert> : null}
            {normalizeRows(detail?.items).map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 900 }}>{item.product_name}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                  <Chip label={`${formatUnits(item.counted_quantity)} contados`} color="info" variant="outlined" />
                  <Chip label={`${formatUnits(item.packed_quantity)} a inventario`} color="success" variant="outlined" />
                  <Chip label={`${formatUnits(item.damaged_quantity)} dañados`} color="error" variant="outlined" />
                  <Chip label={`${formatUnits(item.missing_quantity)} faltantes`} color="warning" variant="outlined" />
                </Stack>
                {Number(item.damaged_quantity || 0) > 0 ? <Typography variant="body2" sx={{ mt: 1 }}>Motivo del daño: {damageLabels[item.damage_reason] || item.damage_reason || "Sin motivo"}</Typography> : null}
                {Number(item.missing_quantity || 0) > 0 ? <Typography variant="body2" sx={{ mt: 0.5 }}>Motivo del faltante: {missingLabels[item.missing_reason] || item.missing_reason || "Sin motivo"}</Typography> : null}
                {item.notes ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Notas: {item.notes}</Typography> : null}
              </Paper>
            ))}
            <Typography variant="caption" color="text.secondary">Registrado por {detail?.created_by_name || detail?.packer_name || "Usuario"} · {formatDate(detail?.created_at)}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><AppButton color="secondary" onClick={() => setDetail(null)}>Cerrar</AppButton></DialogActions>
      </Dialog>
    </Stack>
  );
};

export default PackagingHistoryPanel;
