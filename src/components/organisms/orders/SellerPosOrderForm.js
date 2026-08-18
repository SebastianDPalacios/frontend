import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AppButton from "@core/components/ui/AppButton";
import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import OrderDraftSummary from "components/molecules/OrderDraftSummary";
import { getDisplayName, isIntegerUnit } from "views/modules/flow-utils";

const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "000"];

const SellerPosOrderForm = ({
  loading,
  saving,
  error,
  customers,
  products,
  productCategories,
  selectedCategoryId,
  setSelectedCategoryId,
  customerId,
  setCustomerId,
  notes,
  setNotes,
  selectedLines,
  preparedOrder,
  settings,
  creditAvailable,
  creditRedeemedAmount,
  getModes,
  addConfiguredProduct,
  removeLine,
  onReview,
  confirmOpen,
  setConfirmOpen,
  selectedCustomer,
  onSave,
}) => {
  const [cartOpen, setCartOpen] = useState(false);
  const [captureProduct, setCaptureProduct] = useState(null);
  const [orderMode, setOrderMode] = useState("sale");
  const [captureValue, setCaptureValue] = useState("");
  const [search, setSearch] = useState("");

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatches = !selectedCategoryId || String(product.category_id || "") === String(selectedCategoryId);
      const searchMatches = !term || `${product.name || ""} ${product.sku || ""}`.toLowerCase().includes(term);
      return categoryMatches && searchMatches;
    });
  }, [products, search, selectedCategoryId]);

  const openCapture = (product) => {
    const modes = getModes(product);
    setCaptureProduct(product);
    setOrderMode(modes[0]?.value || "sale");
    setCaptureValue("");
  };

  const appendKey = (key) => {
    setCaptureValue((current) => {
      const next = `${current || ""}${key}`.replace(/^0+(?=\d)/, "");
      return next.slice(0, 12);
    });
  };

  const confirmProduct = () => {
    if (!captureProduct || Number(captureValue || 0) <= 0) return;
    addConfiguredProduct(captureProduct, { orderMode, captureMode: "amount", value: captureValue });
    setCaptureProduct(null);
  };

  const unitPrice = Number(captureProduct?.base_price || 0);
  const previewQuantity = unitPrice > 0
    ? (isIntegerUnit(captureProduct?.unit)
        ? Math.floor(Number(captureValue || 0) / unitPrice)
        : Math.floor((Number(captureValue || 0) / unitPrice) * 1000) / 1000)
    : 0;

  return (
    <Stack spacing={2} sx={{ pb: 10 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && customers.length === 0 ? (
        <Alert severity="warning">No tienes clientes asignados.</Alert>
      ) : null}

      {!cartOpen ? (
        <>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, position: "sticky", top: 70, zIndex: 5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900 }}>Catálogo</Typography>
                <Typography variant="caption" color="text.secondary">Toca un producto para agregarlo</Typography>
              </Box>
              <IconButton color="secondary" onClick={() => setCartOpen(true)} sx={{ bgcolor: "secondary.lighter" }}>
                <Badge badgeContent={selectedLines.length} color="error">
                  <ShoppingCartRoundedIcon />
                </Badge>
              </IconButton>
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="Buscar producto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ mt: 1.5 }}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Categoría"
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              sx={{ mt: 1.25 }}
            >
              <MenuItem value="">Todas las categorías</MenuItem>
              {productCategories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </Paper>

          {loading ? <Alert severity="info">Cargando productos...</Alert> : null}
          {!loading && visibleProducts.length === 0 ? <Alert severity="info">No hay productos para este filtro.</Alert> : null}
          <Grid container spacing={1.25}>
            {visibleProducts.map((product) => (
              <Grid item xs={12} sm={6} key={product.id}>
                <Paper
                  component="button"
                  type="button"
                  variant="outlined"
                  onClick={() => openCapture(product)}
                  sx={{
                    width: "100%",
                    minHeight: 82,
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                    color: "text.primary",
                    textAlign: "left",
                    cursor: "pointer",
                    "&:active": { transform: "scale(.99)", bgcolor: "action.hover" },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>{product.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{product.category_name || "Sin categoría"}</Typography>
                    </Box>
                    <Chip color="secondary" label={`$${formatCurrencyValue(product.base_price, 0)}`} sx={{ fontWeight: 900, flexShrink: 0 }} />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton onClick={() => setCartOpen(false)}><ArrowBackRoundedIcon /></IconButton>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Tu pedido</Typography>
              <Typography variant="caption" color="text.secondary">{selectedLines.length} producto(s)</Typography>
            </Box>
          </Stack>

          {preparedOrder.rows.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
              <StorefrontRoundedIcon color="disabled" sx={{ fontSize: 44 }} />
              <Typography sx={{ mt: 1, fontWeight: 800 }}>El carrito está vacío</Typography>
              <Button color="secondary" onClick={() => setCartOpen(false)} sx={{ mt: 1 }}>Agregar productos</Button>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {preparedOrder.rows.map(({ entry, product, calculation }) => (
                <Paper key={entry.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }}>{product?.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getModes(product).find((mode) => mode.value === entry.orderMode)?.label || entry.orderMode}
                        {` · ${calculation.quantity} ${product?.unit || "unidades"}`}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>${formatCurrencyValue(calculation.commercialValue, 0)}</Typography>
                    <IconButton color="error" onClick={() => removeLine(entry.id)}><DeleteOutlineRoundedIcon /></IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={2}>
              <TextField select fullWidth label="Cliente asignado" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                {customers.map((customer) => <MenuItem key={customer.id} value={String(customer.id)}>{getDisplayName(customer)}</MenuItem>)}
              </TextField>
              <TextField fullWidth multiline minRows={2} label="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} inputProps={{ maxLength: 255 }} />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <OrderDraftSummary
              summary={preparedOrder.summary}
              settings={settings}
              creditAvailable={creditAvailable}
              creditRedeemed={creditRedeemedAmount}
              showCreditDetails={false}
            />
          </Paper>
          <AppButton fullWidth color="secondary" disabled={loading || customers.length === 0 || selectedLines.length === 0} onClick={onReview} sx={{ minHeight: 54 }}>
            Revisar y guardar pedido
          </AppButton>
        </>
      )}

      <Dialog open={Boolean(captureProduct)} onClose={() => setCaptureProduct(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { m: 1.5, borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 21, lineHeight: 1.2 }}>{captureProduct?.name}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 16, fontWeight: 700 }}>
            ${formatCurrencyValue(captureProduct?.base_price, 0)} por {captureProduct?.unit || "unidad"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
              {getModes(captureProduct).map((mode) => (
                <Button
                  key={mode.value}
                  variant={orderMode === mode.value ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => setOrderMode(mode.value)}
                  sx={{ minHeight: 54, px: 1.5, fontSize: 14, fontWeight: 900 }}
                >
                  {mode.label}
                </Button>
              ))}
            </Box>
            <Chip
              label="Captura por valor"
              color="secondary"
              sx={{ alignSelf: "flex-start", height: 32, fontSize: 13, fontWeight: 900, px: 0.5 }}
            />
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                ${formatCurrencyValue(captureValue, 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">{previewQuantity} unidades calculadas</Typography>
            </Paper>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
              {keypadKeys.map((key) => (
                <Button key={key} variant="outlined" color="secondary" onClick={() => appendKey(key)} sx={{ minHeight: 50, fontSize: 18, fontWeight: 900 }}>{key}</Button>
              ))}
            </Box>
            <Stack direction="row" spacing={1}>
              <Button fullWidth color="error" variant="outlined" onClick={() => setCaptureValue("")}>Limpiar</Button>
              <Button fullWidth color="secondary" variant="outlined" onClick={() => setCaptureValue((value) => value.slice(0, -1))}>Borrar</Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCaptureProduct(null)}>Cancelar</Button>
          <AppButton color="secondary" disabled={Number(captureValue || 0) <= 0 || previewQuantity <= 0} onClick={confirmProduct}>Agregar al carrito</AppButton>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { m: 1.5, borderRadius: 3 } }}>
        <DialogTitle>Confirmar pedido</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 900 }}>{selectedCustomer?.name || "Cliente"}</Typography>
            <Stack divider={<Divider flexItem />}>
              {preparedOrder.rows.map(({ entry, product, calculation }) => (
                <Stack key={entry.id} direction="row" spacing={1} sx={{ py: 1, justifyContent: "space-between" }}>
                  <Box><Typography sx={{ fontWeight: 800 }}>{product?.name}</Typography><Typography variant="caption" color="text.secondary">{getModes(product).find((mode) => mode.value === entry.orderMode)?.label || entry.orderMode} · {calculation.quantity} unidades</Typography></Box>
                  <Typography sx={{ fontWeight: 900 }}>${formatCurrencyValue(calculation.commercialValue, 0)}</Typography>
                </Stack>
              ))}
            </Stack>
            <OrderDraftSummary
              summary={preparedOrder.summary}
              settings={settings}
              creditAvailable={creditAvailable}
              creditRedeemed={creditRedeemedAmount}
              showCreditDetails={false}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button color="secondary" variant="outlined" disabled={saving} onClick={() => setConfirmOpen(false)}>Volver</Button>
          <AppButton color="secondary" loading={saving} onClick={onSave}>Confirmar y guardar</AppButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default SellerPosOrderForm;
