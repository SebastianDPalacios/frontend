import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { BalanceDatePicker, BalanceMonthPicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import exportPackingDamageExcel from "components/organisms/production/exportPackingDamageExcel";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";

const reasonLabels = { production: "Producción", oven: "Horno", cut: "Corte", packaging: "Empaque" };
const statusLabels = { matched: "Conciliado", shortage: "Con faltante", surplus: "Con sobrante" };
const formatUnits = (value) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(value || 0));
const monthRange = (month) => {
  const [year, monthNumber] = String(month).split("-").map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  return { dateFrom: `${month}-01`, dateTo: `${month}-${String(last).padStart(2, "0")}` };
};

const PackingDamageReportPage = () => {
  const today = toDateInputValue();
  const [mode, setMode] = useState("day");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [range, setRange] = useState({ dateFrom: today, dateTo: today });
  const [filters, setFilters] = useState({ branchId: "", productId: "", damageReason: "", packerEmployeeId: "" });
  const [data, setData] = useState({ rows: [], total: 0, totals_by_product: [], totals_by_reason: [], catalogs: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dates = useMemo(() => mode === "day" ? { dateFrom: day, dateTo: day } : mode === "month" ? monthRange(month) : range, [day, mode, month, range]);

  const params = useCallback((requestedPage = page, pageSize = 25) => ({ ...dates, ...filters, page: requestedPage, pageSize }), [dates, filters, page]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await productionService.getPackingDamageReport(params());
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo consultar el reporte.");
      setData(response.data || {});
    } catch (requestError) { setError(requestError?.response?.data?.message || requestError.message); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [mode, day, month, range.dateFrom, range.dateTo, filters.branchId, filters.productId, filters.damageReason, filters.packerEmployeeId]);

  const exportExcel = async () => {
    try {
      const rows = [];
      const totalPages = Math.max(Math.ceil(Number(data.total || 0) / 500), 1);
      for (let exportPage = 1; exportPage <= totalPages; exportPage += 1) {
        const response = await productionService.getPackingDamageReport(params(exportPage, 500));
        rows.push(...(response.data?.rows || []));
      }
      await exportPackingDamageExcel({ rows, filters: dates, totalsByProduct: data.totals_by_product, totalsByReason: data.totals_by_reason });
    } catch (exportError) { setError(exportError?.message || "No se pudo exportar el reporte."); }
  };
  const pages = Math.max(Math.ceil(Number(data.total || 0) / 25), 1);
  const updateFilter = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));

  return <FlowPageLayout title="Reporte de daños de conteo y empaque" subtitle="Consulta exclusivamente los daños registrados al cerrar el conteo. No incluye mermas ni daños externos.">
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={2}><TextField select fullWidth label="Consultar por" value={mode} onChange={(event) => setMode(event.target.value)}><MenuItem value="day">Día</MenuItem><MenuItem value="month">Mes</MenuItem><MenuItem value="range">Rango</MenuItem></TextField></Grid>
        {mode === "day" ? <Grid item xs={12} md={3}><BalanceDatePicker fullWidth label="Fecha" value={day} onChange={setDay} /></Grid> : null}
        {mode === "month" ? <Grid item xs={12} md={3}><BalanceMonthPicker fullWidth label="Mes" value={month} onChange={setMonth} /></Grid> : null}
        {mode === "range" ? <><Grid item xs={12} md={2}><BalanceDatePicker fullWidth label="Desde" value={range.dateFrom} maxDate={range.dateTo} onChange={(value) => setRange((current) => ({ ...current, dateFrom: value }))} /></Grid><Grid item xs={12} md={2}><BalanceDatePicker fullWidth label="Hasta" value={range.dateTo} minDate={range.dateFrom} onChange={(value) => setRange((current) => ({ ...current, dateTo: value }))} /></Grid></> : null}
        <Grid item xs={12} md={2}><TextField select fullWidth label="Sucursal" value={filters.branchId} onChange={updateFilter("branchId")}><MenuItem value="">Todas</MenuItem>{(data.catalogs?.branches || []).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><TextField select fullWidth label="Producto" value={filters.productId} onChange={updateFilter("productId")}><MenuItem value="">Todos</MenuItem>{(data.catalogs?.products || []).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><TextField select fullWidth label="Motivo" value={filters.damageReason} onChange={updateFilter("damageReason")}><MenuItem value="">Todos</MenuItem>{(data.catalogs?.reasons || []).map((reason) => <MenuItem key={reason} value={reason}>{reasonLabels[reason] || reason}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><TextField select fullWidth label="Empaquetador" value={filters.packerEmployeeId} onChange={updateFilter("packerEmployeeId")}><MenuItem value="">Todos</MenuItem>{(data.catalogs?.packers || []).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><Button fullWidth variant="contained" color="secondary" onClick={exportExcel} disabled={!data.total}>Exportar Excel</Button></Grid>
      </Grid>
    </Paper>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={6}><Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography variant="h6" fontWeight={900}>Totales por producto</Typography><Stack direction="row" gap={1} flexWrap="wrap" mt={1}>{(data.totals_by_product || []).map((item) => <Chip key={item.product_id} label={`${item.product_name}: ${formatUnits(item.damaged_quantity)}`} />)}</Stack></Paper></Grid>
      <Grid item xs={12} md={6}><Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography variant="h6" fontWeight={900}>Totales por motivo</Typography><Stack direction="row" gap={1} flexWrap="wrap" mt={1}>{(data.totals_by_reason || []).map((item) => <Chip key={item.damage_reason} label={`${reasonLabels[item.damage_reason] || item.damage_reason}: ${formatUnits(item.damaged_quantity)}`} />)}</Stack></Paper></Grid>
    </Grid>
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}><Table><TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Sucursal / lote</TableCell><TableCell>Producto</TableCell><TableCell>Empaquetador</TableCell><TableCell align="right">Empacado</TableCell><TableCell align="right">Dañado</TableCell><TableCell>Motivo / detalle</TableCell><TableCell>Conciliación</TableCell></TableRow></TableHead><TableBody>
      {loading ? <TableRow><TableCell colSpan={8}><Alert severity="info">Cargando reporte...</Alert></TableCell></TableRow> : null}
      {!loading && !(data.rows || []).length ? <TableRow><TableCell colSpan={8}><Alert severity="info">No hay daños de conteo para los filtros seleccionados.</Alert></TableCell></TableRow> : null}
      {(data.rows || []).map((row) => <TableRow key={row.damage_id}><TableCell>{String(row.damage_date).slice(0, 10)}</TableCell><TableCell>{row.branch_name}<Typography variant="caption" display="block">Lote #{row.production_batch_id}</Typography></TableCell><TableCell><b>{row.product_name}</b><Typography variant="caption" display="block">{row.product_sku}</Typography></TableCell><TableCell>{row.packer_name}</TableCell><TableCell align="right">{formatUnits(row.packed_quantity)}</TableCell><TableCell align="right"><b>{formatUnits(row.damaged_quantity)}</b></TableCell><TableCell>{reasonLabels[row.damage_reason] || row.damage_reason}<Typography variant="caption" display="block">{row.damage_detail || "Sin detalle"}</Typography>{row.was_corrected ? <><Chip size="small" color="warning" label={`Corregido (${row.corrections.length})`} sx={{ mt: .5 }} /><Typography variant="caption" display="block">Empacado original/corregido: {formatUnits(row.corrections[row.corrections.length - 1]?.original_quantity)} → {formatUnits(row.corrections[row.corrections.length - 1]?.corrected_quantity)}</Typography><Typography variant="caption" display="block">{row.corrections[row.corrections.length - 1]?.reason} · {row.corrections[row.corrections.length - 1]?.corrected_by_name}</Typography></> : null}</TableCell><TableCell>{statusLabels[row.reconciliation_status] || "Pendiente"}</TableCell></TableRow>)}
    </TableBody></Table><Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} p={2}><Typography>Página {page} de {pages} · {data.total || 0} registros</Typography><Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><Button disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></Stack></TableContainer>
  </FlowPageLayout>;
};

export default PackingDamageReportPage;
