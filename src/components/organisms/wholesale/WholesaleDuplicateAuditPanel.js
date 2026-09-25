import { useCallback, useEffect, useState } from "react";
import { Alert, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import AppCard from "@core/components/ui/AppCard";
import toast from "react-hot-toast";
import wholesaleService from "services/wholesale/wholesale-service";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const emptyAudit = { items: [], products: [], branches: [] };

const WholesaleDuplicateAuditPanel = () => {
  const [data, setData] = useState(emptyAudit);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wholesaleService.getDuplicateProductsAudit();
      setData({ ...emptyAudit, ...(response?.data || {}) });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "No fue posible generar la auditoría");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openApproval = (item) => setDialog({
    item,
    physicalProductId: String(item.possible_physical_product?.id || item.physical_product_id || ""),
    branchId: String(data.branches[0]?.id || ""),
    confirmedPhysicalStock: "",
    reason: "",
  });
  const update = (key, value) => setDialog((current) => ({ ...current, [key]: value }));
  const approve = async () => {
    if (!dialog?.physicalProductId || !dialog?.branchId || dialog.confirmedPhysicalStock === "") return toast.error("Selecciona producto físico, sucursal y stock confirmado");
    setSaving(true);
    try {
      const response = await wholesaleService.approveProductEquivalence({
        commercialProductId: dialog.item.id,
        physicalProductId: Number(dialog.physicalProductId),
        branchId: Number(dialog.branchId),
        confirmedPhysicalStock: Number(dialog.confirmedPhysicalStock),
        reason: dialog.reason || null,
      });
      toast.success(response?.message || "Equivalencia aprobada");
      setLastResult(response?.data || null);
      setDialog(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "No fue posible aprobar la equivalencia");
    } finally { setSaving(false); }
  };

  return <AppCard title="Auditoría de productos duplicados" subheader="Solo muestra candidatos. Ningún producto ni stock se une automáticamente.">
    {lastResult ? <Alert severity="success" sx={{ mb: 2 }}>Conciliación #{lastResult.reconciliation_id}: stock físico antes {Number(lastResult.before?.physical_stock || 0)}, después {Number(lastResult.after?.confirmed_physical_stock || 0)}; movimiento {Number(lastResult.inventory_delta || 0)}.</Alert> : null}
    {loading ? <Alert severity="info">Generando reporte...</Alert> : null}
    {!loading && !data.items.length ? <Alert severity="success">No se detectaron productos creados aparentemente para Mayoristas.</Alert> : null}
    <TableContainer><Table sx={{ minWidth: 1450 }}><TableHead><TableRow>
      <TableCell>Producto Mayorista</TableCell><TableCell>Posible producto físico</TableCell><TableCell>Categoría / receta</TableCell><TableCell>Código</TableCell><TableCell>Precio</TableCell><TableCell>Stock</TableCell><TableCell>Movimientos</TableCell><TableCell>Ventas</TableCell><TableCell>Cambios / devoluciones</TableCell><TableCell>Producción / conteos</TableCell><TableCell align="right">Decisión</TableCell>
    </TableRow></TableHead><TableBody>{data.items.map((item) => <TableRow key={item.id} hover>
      <TableCell><Typography fontWeight={900}>{item.name}</Typography>{item.configured_physical_product_name ? <Chip size="small" color="success" label={`Configurado: ${item.configured_physical_product_name}`} /> : null}</TableCell>
      <TableCell>{item.possible_physical_product?.name || "Requiere selección manual"}</TableCell>
      <TableCell>{item.category_name}<br /><Typography variant="caption">{item.recipes || "Sin receta"}</Typography></TableCell>
      <TableCell>{item.sku}</TableCell><TableCell>{money.format(Number(item.base_price || 0))}</TableCell><TableCell>{Number(item.stock_actual || 0)}</TableCell><TableCell>{Number(item.movement_count || 0)}</TableCell><TableCell>{Number(item.sales_count || 0)}</TableCell><TableCell>{Number(item.return_count || 0)}</TableCell><TableCell>{Number(item.production_count || 0)} / {Number(item.packing_count || 0)}</TableCell>
      <TableCell align="right"><AppButton variant="outlined" onClick={() => openApproval(item)}>Revisar y aprobar</AppButton></TableCell>
    </TableRow>)}</TableBody></Table></TableContainer>

    <Dialog open={Boolean(dialog)} onClose={() => !saving && setDialog(null)} fullWidth maxWidth="md"><DialogTitle>Aprobar equivalencia física</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      <Alert severity="warning">El stock no se sumará. Debes indicar la existencia física comprobada en la sucursal.</Alert>
      <Typography><b>Variante comercial:</b> {dialog?.item?.name}</Typography>
      <Grid container spacing={2}><Grid item xs={12} md={6}><TextField select fullWidth label="Producto físico principal" value={dialog?.physicalProductId || ""} onChange={(event) => update("physicalProductId", event.target.value)}>{data.products.filter((product) => Number(product.id) !== Number(dialog?.item?.id)).map((product) => <MenuItem key={product.id} value={product.id}>{product.name} · {product.sku}</MenuItem>)}</TextField></Grid>
      <Grid item xs={12} md={6}><TextField select fullWidth label="Sucursal" value={dialog?.branchId || ""} onChange={(event) => update("branchId", event.target.value)}>{data.branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}</TextField></Grid>
      <Grid item xs={12} md={6}><TextField fullWidth type="number" label="Stock físico correcto" value={dialog?.confirmedPhysicalStock || ""} onChange={(event) => update("confirmedPhysicalStock", event.target.value)} inputProps={{ min: 0, step: 1 }} /></Grid>
      <Grid item xs={12} md={6}><TextField fullWidth label="Motivo opcional" value={dialog?.reason || ""} onChange={(event) => update("reason", event.target.value)} /></Grid></Grid>
    </Stack></DialogContent><DialogActions><AppButton onClick={() => setDialog(null)} disabled={saving}>Cancelar</AppButton><AppButton variant="contained" onClick={approve} disabled={saving}>Confirmar respaldo y conciliación</AppButton></DialogActions></Dialog>
  </AppCard>;
};

export default WholesaleDuplicateAuditPanel;
