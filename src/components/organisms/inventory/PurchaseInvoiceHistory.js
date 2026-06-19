import {
  Alert,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import SectionHeader from "components/atoms/SectionHeader";
import PaginationControls from "components/molecules/PaginationControls";

const PurchaseInvoiceDetailDialog = ({
  open,
  loading,
  invoiceDetail,
  onClose,
  formatCurrency,
  formatDate,
  formatNumber,
}) => (
  <Dialog open={open} onClose={() => !loading && onClose()} fullWidth maxWidth="md">
    <DialogTitle>
      Factura {invoiceDetail?.order?.invoice_number || (invoiceDetail?.order?.id ? `#${invoiceDetail.order.id}` : "")}
    </DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: 1 }}>
        {loading ? <Alert severity="info">Cargando detalle de la factura...</Alert> : null}

        {invoiceDetail?.order ? (
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: "background.default" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary">
                  Proveedor
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>{invoiceDetail.order.supplier_name}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Fecha
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>{formatDate(invoiceDetail.order.order_date)}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Total factura
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>{formatCurrency(invoiceDetail.order.grand_total)}</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" color="text.secondary">
                  Estado
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>Recibida</Typography>
              </Grid>
            </Grid>
          </Paper>
        ) : null}

        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 900 }}>Productos comprados</Typography>
          {(invoiceDetail?.items || []).map((item) => {
            const unit = item.raw_material_unit || "unit";
            return (
              <Paper key={item.id} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                <Grid container spacing={2} sx={{ alignItems: "center" }}>
                  <Grid item xs={12} md={4}>
                    <Typography sx={{ fontWeight: 900 }}>{item.raw_material_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      En stock: {formatNumber(item.quantity, unit)} {unit}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Typography variant="caption" color="text.secondary">
                      Cantidad
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      {formatNumber(item.quantity, unit)} {unit}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Costo por {unit}
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>{formatCurrency(item.unit_cost)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>{formatCurrency(item.line_total)}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
          {!loading && (invoiceDetail?.items || []).length === 0 ? (
            <Alert severity="info">Esta factura no tiene productos registrados.</Alert>
          ) : null}
        </Stack>
      </Stack>
    </DialogContent>
    <DialogActions>
      <AppButton color="secondary" onClick={onClose} disabled={loading}>
        Cerrar
      </AppButton>
    </DialogActions>
  </Dialog>
);

const PurchaseInvoiceHistory = ({
  historyTotal,
  historySearch,
  onHistorySearchChange,
  historyLoading,
  invoices,
  onOpenInvoiceDetail,
  currentPage,
  totalPages,
  pageSize,
  onPreviousPage,
  onNextPage,
  detailDialogOpen,
  detailLoading,
  selectedInvoiceDetail,
  onCloseDetail,
  formatCurrency,
  formatDate,
  formatNumber,
}) => (
  <>
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mt: 2 }}>
      <SectionHeader
        title="Facturas recibidas"
        subtitle="Compras ya registradas que sumaron stock al inventario."
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
              size="small"
              label="Buscar"
              value={historySearch}
              onChange={(event) => onHistorySearchChange(event.target.value)}
              placeholder="Factura, proveedor o producto"
              sx={{ minWidth: { xs: "100%", sm: 320 } }}
            />
            <Chip label={`${historyTotal} facturas`} variant="outlined" />
          </Stack>
        }
      />

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {historyLoading ? <Alert severity="info">Cargando facturas recibidas...</Alert> : null}
        {!historyLoading && invoices.length === 0 ? (
          <Alert severity="info">Aun no hay facturas recibidas para la sucursal seleccionada.</Alert>
        ) : null}

        {invoices.map((invoice) => (
          <Paper key={invoice.id} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Grid container spacing={2} sx={{ alignItems: "center" }}>
              <Grid item xs={12} md={4}>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontWeight: 900 }}>
                    Factura {invoice.invoice_number || `#${invoice.id}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {invoice.supplier_name} - {formatDate(invoice.order_date)}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Productos
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{invoice.items_count || 0} producto(s)</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {invoice.material_names || "Sin detalle"}
                </Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>{formatCurrency(invoice.grand_total)}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                  <Chip label="Stock sumado" color="success" variant="outlined" />
                  <AppButton variant="outlined" color="secondary" onClick={() => onOpenInvoiceDetail(invoice)}>
                    Ver detalle
                  </AppButton>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        ))}

        {historyTotal > pageSize ? (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={onPreviousPage}
            onNext={onNextPage}
          />
        ) : null}
      </Stack>
    </Paper>

    <PurchaseInvoiceDetailDialog
      open={detailDialogOpen}
      loading={detailLoading}
      invoiceDetail={selectedInvoiceDetail}
      onClose={onCloseDetail}
      formatCurrency={formatCurrency}
      formatDate={formatDate}
      formatNumber={formatNumber}
    />
  </>
);

export default PurchaseInvoiceHistory;
