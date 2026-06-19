import { Alert, Chip, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const PendingPurchaseOrdersPanel = ({
  loading,
  ordersLoading,
  saving,
  branches,
  selectedBranch,
  orderSearch,
  pendingOrders,
  purchaseOrderId,
  selectedOrder,
  onOpenInvoice,
  onBranchChange,
  onSearchChange,
  onSelectOrder,
  onReceiveOrder,
  getDisplayName,
  formatDate,
  formatCurrency,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" }, mb: 2 }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Ordenes pendientes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Para compras creadas antes y todavia no recibidas.
        </Typography>
      </Stack>
      <AppButton variant="outlined" color="secondary" onClick={onOpenInvoice} disabled={loading}>
        Registrar factura
      </AppButton>
    </Stack>

    <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
      <Grid item xs={12} md={6}>
        <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => onBranchChange(event.target.value)}>
          {branches.map((branch) => (
            <MenuItem key={branch.id} value={String(branch.id)}>
              {getDisplayName(branch)}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Buscar orden, factura o proveedor"
          value={orderSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          helperText={ordersLoading ? "Cargando ordenes..." : " "}
        />
      </Grid>
    </Grid>

    <Divider sx={{ my: 2 }} />

    {ordersLoading ? <Alert severity="info">Cargando ordenes pendientes...</Alert> : null}
    {!ordersLoading && pendingOrders.length === 0 ? (
      <Alert severity="info">No hay ordenes pendientes para la sucursal seleccionada.</Alert>
    ) : null}

    <Stack spacing={1.5}>
      {pendingOrders.map((order) => {
        const isSelected = String(order.id) === String(purchaseOrderId);

        return (
          <Paper
            key={order.id}
            variant="outlined"
            onClick={() => onSelectOrder(String(order.id))}
            sx={{
              borderRadius: 2,
              p: 2,
              cursor: "pointer",
              borderColor: isSelected ? "primary.main" : "divider",
              bgcolor: isSelected ? "action.selected" : "background.paper",
            }}
          >
            <Stack spacing={1.25}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" } }}
              >
                <Stack spacing={0.25}>
                  <Typography sx={{ fontWeight: 900 }}>OC #{order.id}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.supplier_name || "Proveedor sin nombre"}
                    {order.invoice_number ? ` - Factura ${order.invoice_number}` : ""}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                  <Chip size="small" label={order.status || "pendiente"} color="warning" variant="outlined" />
                  <Chip size="small" label={`${order.items_count || 0} items`} />
                </Stack>
              </Stack>

              <Grid container spacing={1}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Fecha esperada
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatDate(order.expected_date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatCurrency(order.grand_total)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Materias
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }} noWrap title={order.material_names || ""}>
                    {order.material_names || "Sin detalle"}
                  </Typography>
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        );
      })}
    </Stack>

    {selectedOrder ? (
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mt: 2, borderColor: "primary.main" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
        >
          <Stack spacing={0.5}>
            <Typography sx={{ fontWeight: 900 }}>Lista para recepcionar: OC #{selectedOrder.id}</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedOrder.material_names || "Sin detalle de materias"} - {formatCurrency(selectedOrder.grand_total)}
            </Typography>
          </Stack>
          <AppButton color="secondary" onClick={onReceiveOrder} disabled={saving || loading}>
            {saving ? "Procesando..." : "Recepcionar orden"}
          </AppButton>
        </Stack>
      </Paper>
    ) : null}
  </Paper>
);

export default PendingPurchaseOrdersPanel;
