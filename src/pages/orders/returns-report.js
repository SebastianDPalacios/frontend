import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Divider, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import FlowPageLayout from "views/modules/FlowPageLayout";
import ordersService from "services/orders/orders-service";
import { normalizeRows } from "views/modules/flow-utils";
import exportSalesOperationsExcel from "components/organisms/orders/exportSalesOperationsExcel";
import { BalanceDatePicker, BalanceMonthPicker } from "@core/components/ui/BalancePeriodPickers";

const today = () => new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const operationLabel = (type) => type === "exchange" ? "Cambio" : type === "return" ? "Devolución" : "Obsequio";

const statusLabel = (status) => ({
  completed: "Completado", registered: "Registrado", pending_authorization: "Pendiente de autorización",
  rejected: "Rechazado", annulled: "Anulado", cancelled: "Cancelado",
}[status] || status || "Sin estado");
const reasonLabel = (reason) => ({
  expired: "Producto vencido", mold: "Producto con moho", wet: "Producto mojado",
  malformed: "Mala presentación", other: "Otro motivo",
}[reason] || reason || "Sin motivo registrado");
const formatDate = (value) => {
  const date = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Sin fecha";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};
const operationColor = (type) => type === "exchange" ? "info" : type === "return" ? "warning" : "secondary";

const resolveDates = (mode, day, month, from, to) => {
  if (mode === "day") return { dateFrom: day, dateTo: day };
  if (mode === "month" && month) {
    const [year, monthNumber] = month.split("-").map(Number);
    return { dateFrom: `${month}-01`, dateTo: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}` };
  }
  return { dateFrom: from, dateTo: to };
};

const SalesOperationsReportPage = () => {
  const [options, setOptions] = useState({ customers: [], products: [], orders: [], priceLists: [] });
  const [filters, setFilters] = useState({ mode: "day", day: today(), month: today().slice(0, 7), from: today(), to: today(), sellerId: "", customerId: "", receivedProductId: "", deliveredProductId: "", operationType: "", orderId: "", customerPriceType: "", priceListId: "", physicalProductId: "", commercialVariantId: "", appliedPrice: "" });
  const [data, setData] = useState({ items: [], total: 0, totalPages: 0, totalsBySeller: [], totalsByProduct: [] });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const sellers = useMemo(() => Array.from(new Map(options.orders.map((order) => [String(order.sales_agent_user_id), { id: order.sales_agent_user_id, name: order.sales_agent_name }])).values()).filter((seller) => seller.id), [options.orders]);
  const physicalProducts = useMemo(() => Array.from(new Map(options.products.map((product) => [String(product.physical_product_id), { id: product.physical_product_id, name: product.physical_product_name }])).values()), [options.products]);

  useEffect(() => {
    ordersService.getSalesReturnOptions()
      .then((response) => {
        if (response?.code === 1) setOptions({ customers: normalizeRows(response.data?.customers), products: normalizeRows(response.data?.products), orders: normalizeRows(response.data?.orders), priceLists: normalizeRows(response.data?.price_lists) });
      })
      .catch((error) => toast.error(error?.response?.data?.message || error?.message || "No se pudieron cargar las opciones del reporte"));
  }, []);

  const buildParams = useCallback((targetPage = page, targetPageSize = pageSize) => ({
    ...resolveDates(filters.mode, filters.day, filters.month, filters.from, filters.to),
    salesAgentUserId: filters.sellerId || undefined,
    customerId: filters.customerId || undefined,
    receivedProductId: filters.receivedProductId || undefined,
    deliveredProductId: filters.deliveredProductId || undefined,
    operationType: filters.operationType || undefined,
    orderId: filters.orderId || undefined,
    customerPriceType: filters.customerPriceType || undefined,
    priceListId: filters.priceListId || undefined,
    physicalProductId: filters.physicalProductId || undefined,
    commercialVariantId: filters.commercialVariantId || undefined,
    appliedPrice: filters.appliedPrice || undefined,
    page: targetPage,
    pageSize: targetPageSize,
  }), [filters, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ordersService.getSalesOperationsReport(buildParams());
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo cargar el reporte");
      setData(response.data || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const exportExcel = async () => {
    try {
      const first = await ordersService.getSalesOperationsReport(buildParams(1, 100));
      if (first?.code !== 1) throw new Error(first?.message || "No se pudo exportar");
      const allItems = [...normalizeRows(first.data?.items)];
      const pages = Number(first.data?.totalPages || 1);
      for (let current = 2; current <= pages; current += 1) {
        const response = await ordersService.getSalesOperationsReport(buildParams(current, 100));
        allItems.push(...normalizeRows(response.data?.items));
      }
      await exportSalesOperationsExcel({ items: allItems, totalsBySeller: first.data?.totalsBySeller, totalsByProduct: first.data?.totalsByProduct, filters: buildParams(1, 100) });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "No se pudo generar Excel");
    }
  };

  return <FlowPageLayout title="Reporte de cambios y devoluciones" subtitle="Cambios, devoluciones y obsequios se presentan como operaciones independientes.">
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Grid container spacing={2}>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Consultar por" value={filters.mode} onChange={(e) => updateFilter("mode", e.target.value)}><MenuItem value="day">Día</MenuItem><MenuItem value="month">Mes</MenuItem><MenuItem value="range">Rango</MenuItem></TextField></Grid>
        {filters.mode === "day" ? <Grid item xs={12} md={3}><BalanceDatePicker fullWidth label="Día" value={filters.day} onChange={(value) => updateFilter("day", value)} /></Grid> : null}
        {filters.mode === "month" ? <Grid item xs={12} md={3}><BalanceMonthPicker fullWidth label="Mes" value={filters.month} onChange={(value) => updateFilter("month", value)} /></Grid> : null}
        {filters.mode === "range" ? <><Grid item xs={12} md={3}><BalanceDatePicker fullWidth label="Desde" value={filters.from} maxDate={filters.to || undefined} onChange={(value) => updateFilter("from", value)} /></Grid><Grid item xs={12} md={3}><BalanceDatePicker fullWidth label="Hasta" value={filters.to} minDate={filters.from || undefined} onChange={(value) => updateFilter("to", value)} /></Grid></> : null}
        <Grid item xs={12} md={3}><TextField select fullWidth label="Tipo" value={filters.operationType} onChange={(e) => updateFilter("operationType", e.target.value)}><MenuItem value="">Todos</MenuItem><MenuItem value="exchange">Cambio</MenuItem><MenuItem value="return">Devolución</MenuItem><MenuItem value="gift">Obsequio</MenuItem></TextField></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Vendedor" value={filters.sellerId} onChange={(e) => updateFilter("sellerId", e.target.value)}><MenuItem value="">Todos</MenuItem>{sellers.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Cliente" value={filters.customerId} onChange={(e) => updateFilter("customerId", e.target.value)}><MenuItem value="">Todos</MenuItem>{options.customers.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Producto recibido" value={filters.receivedProductId} onChange={(e) => updateFilter("receivedProductId", e.target.value)}><MenuItem value="">Todos</MenuItem>{options.products.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Producto entregado como reemplazo" value={filters.deliveredProductId} onChange={(e) => updateFilter("deliveredProductId", e.target.value)}><MenuItem value="">Todos</MenuItem>{options.products.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField fullWidth type="number" label="Pedido original" value={filters.orderId} onChange={(e) => updateFilter("orderId", e.target.value)} /></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Tipo de precio" value={filters.customerPriceType} onChange={(e) => updateFilter("customerPriceType", e.target.value)}><MenuItem value="">Regular y mayorista</MenuItem><MenuItem value="regular">Venta regular</MenuItem><MenuItem value="wholesale">Venta mayorista</MenuItem></TextField></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Lista de precios" value={filters.priceListId} onChange={(e) => updateFilter("priceListId", e.target.value)}><MenuItem value="">Todas</MenuItem>{options.priceLists.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Producto físico" value={filters.physicalProductId} onChange={(e) => updateFilter("physicalProductId", e.target.value)}><MenuItem value="">Todos</MenuItem>{physicalProducts.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField select fullWidth label="Variante comercial" value={filters.commercialVariantId} onChange={(e) => updateFilter("commercialVariantId", e.target.value)}><MenuItem value="">Todas</MenuItem>{options.products.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField fullWidth type="number" label="Precio aplicado" value={filters.appliedPrice} onChange={(e) => updateFilter("appliedPrice", e.target.value)} inputProps={{ min: 1, step: 1 }} /></Grid>
        <Grid item xs={12} md={3}><Button fullWidth variant="contained" color="secondary" onClick={exportExcel} disabled={!data.total}>Exportar Excel</Button></Grid>
      </Grid></Paper>

      <Grid container spacing={2}>{data.totalsBySeller?.map((item) => <Grid item xs={12} md={4} key={item.sales_agent_user_id}><Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography fontWeight={900}>{item.sales_agent_name}</Typography><Typography>{item.result_count} operaciones · {money.format(Number(item.total_value || 0))}</Typography><Typography variant="body2">Recibidos: {Number(item.received_quantity || 0)} · Entregados: {Number(item.delivered_quantity || 0)}</Typography></Paper></Grid>)}</Grid>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Totales por producto</Typography>
        <Grid container spacing={1.5}>{normalizeRows(data.totalsByProduct).map((item) => <Grid item xs={12} md={4} key={`${item.product_id}-${item.operation_type}`}><Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}><Typography fontWeight={800}>{item.product_name}</Typography><Typography variant="body2">{operationLabel(item.operation_type)} · {item.result_count} registro(s)</Typography><Typography variant="body2">Recibidos: {Number(item.received_quantity || 0)} · Entregados: {Number(item.delivered_quantity || 0)}</Typography><Typography fontWeight={800}>{money.format(Number(item.total_value || 0))}</Typography></Paper></Grid>)}</Grid>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", "& > .MuiTableContainer-root": { display: "none" } }}>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ p: 2, justifyContent: "space-between", alignItems: { sm: "center" } }}><Typography variant="h6" fontWeight={900}>{data.total || 0} resultado(s)</Typography><TextField select size="small" label="Por página" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[25, 50, 100].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}</TextField></Stack>
        {loading ? <Alert severity="info">Cargando reporte...</Alert> : null}
        {!loading && !normalizeRows(data.items).length ? <Alert severity="info">No hay operaciones para los filtros seleccionados.</Alert> : null}
        <Stack spacing={2} sx={{ px: 2, pb: 2 }}>
          {normalizeRows(data.items).map((item) => {
            const hasReceivedProduct = Boolean(item.received_product_name);
            const hasDeliveredProduct = Boolean(item.delivered_product_name);
            const totalLabel = item.operation_type === "exchange" ? "Valor del reemplazo" : item.operation_type === "return" ? "Valor de la devolución" : "Valor del obsequio";
            return <Paper key={`card-${item.row_key}`} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ p: 2, bgcolor: "grey.50", justifyContent: "space-between", alignItems: { sm: "center" } }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={operationLabel(item.operation_type)} color={operationColor(item.operation_type)} />
                  <Chip label={statusLabel(item.status)} variant="outlined" />
                  <Chip label={item.customer_price_type === "wholesale" ? "Venta mayorista" : "Venta regular"} color={item.customer_price_type === "wholesale" ? "success" : "default"} variant="outlined" />
                  <Chip label={`Pedido original #${item.original_order_id || "sin identificar"}`} variant="outlined" />
                </Stack>
                <Typography fontWeight={800}>{formatDate(item.operation_date)}</Typography>
              </Stack>
              <Divider />
              <Grid container spacing={0}>
                <Grid item xs={12} md={3} sx={{ p: 2, borderRight: { md: 1 }, borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary">CLIENTE</Typography>
                  <Typography fontWeight={900}>{item.customer_name || "Sin cliente"}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Vendedor</Typography>
                  <Typography>{item.sales_agent_name || "Sin vendedor"}</Typography>
                </Grid>
                <Grid item xs={12} md={3} sx={{ p: 2, bgcolor: "warning.50", borderRight: { md: 1 }, borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary">PRODUCTO RECIBIDO</Typography>
                  <Typography fontWeight={900}>{hasReceivedProduct ? item.received_product_name : "No aplica"}</Typography>
                  {hasReceivedProduct ? <Typography variant="h6" fontWeight={900}>{Number(item.received_quantity || 0)} unidades</Typography> : null}
                  <Typography variant="caption" color="text.secondary">Solo informativo; no entra al inventario</Typography>
                </Grid>
                <Grid item xs={12} md={3} sx={{ p: 2, bgcolor: "success.50", borderRight: { md: 1 }, borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary">PRODUCTO ENTREGADO COMO REEMPLAZO</Typography>
                  <Typography fontWeight={900}>{hasDeliveredProduct ? item.delivered_product_name : "No aplica"}</Typography>
                  {hasDeliveredProduct ? <Typography variant="h6" fontWeight={900}>{Number(item.delivered_quantity || 0)} unidades</Typography> : null}
                  <Typography variant="caption" color="text.secondary">{hasDeliveredProduct ? "Este producto salió del inventario" : "La devolución no tuvo producto de reemplazo"}</Typography>
                </Grid>
                <Grid item xs={12} md={3} sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">PRECIO APLICADO</Typography>
                  <Typography fontWeight={800}>{money.format(Number(item.applied_unit_price || 0))} por unidad</Typography>
                  {item.original_order_id ? <Typography variant="body2">Precio original congelado: {money.format(Number(item.original_applied_unit_price || 0))}</Typography> : null}
                  {item.wholesale_price_list_name ? <Typography variant="caption" color="text.secondary">Lista: {item.wholesale_price_list_name}</Typography> : null}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{totalLabel}</Typography>
                  <Typography variant="h6" fontWeight={900}>{money.format(Number(item.total_value || 0))}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <Box sx={{ p: 2 }}><Grid container spacing={2}>
                <Grid item xs={12} md={8}><Typography variant="caption" color="text.secondary">MOTIVO</Typography><Typography fontWeight={700}>{reasonLabel(item.reason)}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">REGISTRADO POR</Typography><Typography fontWeight={700}>{item.registered_by_name || "Sin identificar"}</Typography></Grid>
              </Grid></Box>
            </Paper>;
          })}
        </Stack>
        <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Fecha / tipo</TableCell><TableCell>Pedido</TableCell><TableCell>Vendedor / cliente</TableCell><TableCell>Recibido</TableCell><TableCell>Entregado</TableCell><TableCell>Precio / total</TableCell><TableCell>Motivo / usuario</TableCell><TableCell>Estado</TableCell></TableRow></TableHead><TableBody>{normalizeRows(data.items).map((item) => <TableRow key={item.row_key}><TableCell>{String(item.operation_date || "").slice(0, 10)}<br />{operationLabel(item.operation_type)}</TableCell><TableCell>{item.original_order_id || "—"}</TableCell><TableCell>{item.sales_agent_name}<br />{item.customer_name}</TableCell><TableCell>{item.received_product_name || "—"}<br />{Number(item.received_quantity || 0)}</TableCell><TableCell>{item.delivered_product_name || "—"}<br />{Number(item.delivered_quantity || 0)}</TableCell><TableCell>{money.format(Number(item.applied_unit_price || 0))}<br /><b>{money.format(Number(item.total_value || 0))}</b></TableCell><TableCell>{item.reason || "—"}<br />{item.registered_by_name || "—"}</TableCell><TableCell>{item.status}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        <Stack direction="row" spacing={2} sx={{ p: 2, justifyContent: "flex-end", alignItems: "center" }}><Button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</Button><Typography>Página {page} de {Math.max(Number(data.totalPages || 0), 1)}</Typography><Button disabled={page >= Number(data.totalPages || 0) || loading} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></Stack>
      </Paper>
    </Stack>
  </FlowPageLayout>;
};

export default SalesOperationsReportPage;
