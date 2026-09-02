import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
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
import { createFilterOptions } from "@mui/material/Autocomplete";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AppButton from "@core/components/ui/AppButton";
import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import OrderDraftSummary from "components/molecules/OrderDraftSummary";
import getInvalidUnitSaleAmount from "utils/order-sale-validation";
import { getDisplayName, isIntegerUnit } from "views/modules/flow-utils";

const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "000"];
const filterCustomers = createFilterOptions({
  stringify: (customer) => [
    getDisplayName(customer),
    customer?.tax_id,
    customer?.phone,
    customer?.address,
    customer?.neighborhood,
  ].filter(Boolean).join(" "),
});
const filterSellers = createFilterOptions({
  stringify: (seller) => [
    getDisplayName(seller),
    seller?.username,
    seller?.email,
  ].filter(Boolean).join(" "),
});

const SellerPosOrderForm = ({
  loading,
  saving,
  error,
  customers,
  customersLoading,
  canAssignSeller,
  sellers,
  sellerId,
  setSellerId,
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
    if (!captureProduct || Number(captureValue || 0) <= 0 || captureSaleError) return;
    addConfiguredProduct(captureProduct, { orderMode, captureMode: "amount", value: captureValue });
    setCaptureProduct(null);
  };

  const unitPrice = Number(captureProduct?.base_price || 0);
  const previewQuantity = unitPrice > 0
    ? (isIntegerUnit(captureProduct?.unit)
        ? Math.floor(Number(captureValue || 0) / unitPrice)
        : Math.floor((Number(captureValue || 0) / unitPrice) * 1000) / 1000)
    : 0;
  const projectedBonusBase = Number(preparedOrder?.summary?.saleTotal || 0) + Number(captureValue || 0);
  const previewBonusAllowance = orderMode === "sale_bonus"
    && projectedBonusBase >= Number(settings?.bonus_minimum_amount || 0)
    ? Number(captureValue || 0) * (Number(settings?.bonus_percent || 0) / 100)
    : 0;
  const rawPreviewBonusQuantity = unitPrice > 0 ? previewBonusAllowance / unitPrice : 0;
  const previewBonusQuantity = previewBonusAllowance > 0
    ? (isIntegerUnit(captureProduct?.unit)
        ? (Math.ceil(rawPreviewBonusQuantity) * unitPrice - previewBonusAllowance <= Number(settings?.bonus_max_company_loss_amount || 0)
            ? Math.ceil(rawPreviewBonusQuantity)
            : Math.floor(rawPreviewBonusQuantity))
        : Math.floor(rawPreviewBonusQuantity * 1000) / 1000)
    : 0;
  const previewTotalQuantity = Number(previewQuantity || 0) + Number(previewBonusQuantity || 0);
  const captureSaleError = getInvalidUnitSaleAmount(captureProduct, {
    orderMode,
    captureMode: "amount",
    value: captureValue,
  }, { bonusPercent: settings?.bonus_percent });

  const getBonusQuantity = (entry) => {
    if (entry.orderMode !== "sale_bonus") return 0;
    const bonusLine = preparedOrder.lines.find((line) => line.key === `${entry.id}-bonus`);
    return Number(bonusLine?.quantity || 0);
  };

  const getQuantityLabel = (entry, calculation) => {
    const bonusQuantity = getBonusQuantity(entry);
    const totalQuantity = Number(calculation.quantity || 0) + bonusQuantity;

    return bonusQuantity > 0
      ? `${totalQuantity} unidades (${calculation.quantity} venta + ${bonusQuantity} vendaje)`
      : `${calculation.quantity} unidades`;
  };

  return (
    <Stack spacing={2} sx={{ pb: 10 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && canAssignSeller && !sellerId ? (
        <Alert severity="info">Selecciona un vendedor para consultar sus clientes.</Alert>
      ) : null}
      {!loading && (!canAssignSeller || sellerId) && customers.length === 0 ? (
        <Alert severity="warning">{canAssignSeller ? "Este vendedor no tiene clientes asignados." : "No tienes clientes asignados."}</Alert>
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
                    minHeight: { xs: 104, sm: 108 },
                    p: { xs: 2, sm: 2.25 },
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
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 22 }, lineHeight: 1.15, overflowWrap: "anywhere" }}>{product.name}</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: { xs: 16, sm: 17 }, fontWeight: 600, lineHeight: 1.2 }}>{product.category_name || "Sin categoría"}</Typography>
                    </Box>
                    <Chip color="secondary" label={`$${formatCurrencyValue(product.base_price, 0)}`} sx={{ height: { xs: 44, sm: 48 }, fontSize: { xs: 18, sm: 20 }, fontWeight: 900, flexShrink: 0, px: 0.75 }} />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", py: 0.5 }}>
            <IconButton onClick={() => setCartOpen(false)} sx={{ width: 48, height: 48 }}><ArrowBackRoundedIcon sx={{ fontSize: 32 }} /></IconButton>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 28 } }}>Tu pedido</Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: 18, sm: 18 } }}>{selectedLines.length} producto(s)</Typography>
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
                <Paper key={entry.id} variant="outlined" sx={{ p: { xs: 2.25, sm: 1.5 }, borderRadius: 3, minHeight: { xs: 154, sm: "auto" }, display: "flex", alignItems: "center" }}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", width: "100%" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: 24, sm: 24 }, lineHeight: 1.2 }}>{product?.name}</Typography>
                      <Typography color="text.secondary" sx={{ fontSize: { xs: 18, sm: 18 }, mt: 0.75, fontWeight: 600 }}>
                        {getModes(product).find((mode) => mode.value === entry.orderMode)?.label || entry.orderMode}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: "wrap", rowGap: 0.75 }}>
                        <Chip variant="outlined" label={`${calculation.quantity} unidades`} sx={{ height: 40, fontSize: 17, fontWeight: 700 }} />
                        {getBonusQuantity(entry) > 0 ? (
                          <Chip color="success" label={`+ ${getBonusQuantity(entry)} de vendaje`} sx={{ height: 40, fontSize: 17, fontWeight: 800 }} />
                        ) : null}
                      </Stack>
                    </Box>
                    <Typography sx={{ fontWeight: 900, whiteSpace: "nowrap", fontSize: { xs: 25, sm: 25 } }}>
                      {["bonus", "gift"].includes(entry.orderMode)
                        ? "Sin cobro"
                        : `$${formatCurrencyValue(entry.orderMode === "sale_bonus" ? calculation.requestedValue : calculation.commercialValue, 0)}`}
                    </Typography>
                    <IconButton color="error" onClick={() => removeLine(entry.id)} sx={{ width: 48, height: 48 }}><DeleteOutlineRoundedIcon sx={{ fontSize: 30 }} /></IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 2 }, borderRadius: 3 }}>
            <Stack spacing={2}>
              {canAssignSeller ? (
                <Autocomplete
                  fullWidth
                  options={sellers}
                  value={sellers.find((seller) => String(seller.id) === String(sellerId)) || null}
                  onChange={(_event, seller) => {
                    setSellerId(seller ? String(seller.id) : "");
                    setCustomerId("");
                  }}
                  getOptionLabel={(seller) => getDisplayName(seller)}
                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                  filterOptions={filterSellers}
                  noOptionsText="No encontramos vendedores"
                  renderInput={(params) => <TextField {...params} label="Buscar vendedor" placeholder="Nombre, usuario o correo" sx={{ "& .MuiInputBase-root": { minHeight: 68, fontSize: 21, fontWeight: 600 }, "& .MuiInputLabel-root": { fontSize: 19 } }} />}
                />
              ) : null}
              <Autocomplete
                fullWidth
                disabled={canAssignSeller && !sellerId}
                loading={customersLoading}
                options={customers}
                value={customers.find((customer) => String(customer.id) === String(customerId)) || null}
                onChange={(_event, customer) => setCustomerId(customer ? String(customer.id) : "")}
                getOptionLabel={(customer) => getDisplayName(customer)}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                filterOptions={filterCustomers}
                noOptionsText={canAssignSeller && !sellerId ? "Selecciona primero un vendedor" : "No encontramos clientes"}
                renderInput={(params) => <TextField {...params} label={canAssignSeller ? "Buscar cliente del vendedor" : "Buscar cliente asignado"} placeholder="Nombre, documento, teléfono o dirección" sx={{ "& .MuiInputBase-root": { minHeight: 68, fontSize: 21, fontWeight: 600 }, "& .MuiInputLabel-root": { fontSize: 19 } }} />}
                renderOption={(props, customer) => (
                  <Box component="li" {...props} key={customer.id} sx={{ py: 1.25 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{getDisplayName(customer)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[customer.tax_id, customer.phone, customer.neighborhood].filter(Boolean).join(" · ") || "Sin información adicional"}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
              <TextField fullWidth multiline minRows={3} label="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} inputProps={{ maxLength: 255 }} sx={{ "& .MuiInputBase-root": { fontSize: 21 }, "& .MuiInputLabel-root": { fontSize: 19 } }} />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 2 }, borderRadius: 3 }}>
            <OrderDraftSummary
              summary={preparedOrder.summary}
              settings={settings}
              creditAvailable={creditAvailable}
              creditRedeemed={creditRedeemedAmount}
              showCreditDetails={false}
              largeOnMobile
            />
          </Paper>
          <AppButton fullWidth color="secondary" disabled={saving || loading || (canAssignSeller && !sellerId) || customers.length === 0 || selectedLines.length === 0 || preparedOrder.invalidUnitSales.length > 0} onClick={onReview} sx={{ minHeight: 76, fontSize: 20, fontWeight: 900 }}>
            {saving ? "Guardando..." : "Guardar pedido"}
          </AppButton>
        </>
      )}

      <Dialog
        open={Boolean(captureProduct)}
        onClose={() => setCaptureProduct(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            m: { xs: 0.75, sm: 1.5 },
            width: { xs: "calc(100% - 12px)", sm: "calc(100% - 24px)" },
            maxHeight: { xs: "calc(100dvh - 12px)", sm: "calc(100% - 24px)" },
            borderRadius: { xs: 3.5, sm: 3 },
          },
        }}
      >
        <DialogTitle sx={{ pb: { xs: 0.5, sm: 1 }, px: { xs: 2, sm: 3 }, pt: { xs: 1.25, sm: 2.5 }, flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 25, sm: 21 }, lineHeight: 1.15 }}>{captureProduct?.name}</Typography>
          <Typography color="text.secondary" sx={{ mt: { xs: 0.25, sm: 0.75 }, fontSize: { xs: 19, sm: 16 }, fontWeight: 700 }}>
            ${formatCurrencyValue(captureProduct?.base_price, 0)} por {captureProduct?.unit || "unidad"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 0.75, sm: 2 }, overflowY: "auto" }}>
          <Stack spacing={{ xs: 0.75, sm: 1.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: { xs: 0.75, sm: 1 } }}>
              {getModes(captureProduct).map((mode) => (
                <Button
                  key={mode.value}
                  variant={orderMode === mode.value ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => setOrderMode(mode.value)}
                  sx={{ minHeight: { xs: 52, sm: 54 }, px: 0.75, py: 0.5, fontSize: { xs: 16, sm: 14 }, fontWeight: 900, lineHeight: 1.15 }}
                >
                  {mode.label}
                </Button>
              ))}
            </Box>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 0.5, sm: 1 },
                borderRadius: 2.5,
                display: "grid",
                gridTemplateColumns: { xs: "56px minmax(0, 1fr) 56px", sm: "48px minmax(0, 1fr) 48px" },
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <IconButton
                aria-label="Limpiar valor"
                title="Limpiar valor"
                onClick={() => setCaptureValue("")}
                sx={{
                  width: { xs: 48, sm: 44 },
                  height: { xs: 48, sm: 44 },
                  bgcolor: "text.primary",
                  color: "background.paper",
                  "&:hover": { bgcolor: "text.primary" },
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: { xs: 32, sm: 27 } }} />
              </IconButton>
              <Box sx={{ minWidth: 0, textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: 42, sm: 34 }, lineHeight: 1.1 }}>
                  ${formatCurrencyValue(captureValue, 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {orderMode === "sale_bonus" && previewBonusQuantity > 0
                    ? `${previewTotalQuantity} unidades (${previewQuantity} venta + ${previewBonusQuantity} vendaje)`
                    : `${previewQuantity} unidades calculadas`}
                </Typography>
              </Box>
              <IconButton
                aria-label="Borrar último número"
                title="Borrar último número"
                onClick={() => setCaptureValue((value) => value.slice(0, -1))}
                sx={{ width: { xs: 48, sm: 44 }, height: { xs: 48, sm: 44 } }}
              >
                <ArrowBackRoundedIcon sx={{ fontSize: { xs: 34, sm: 29 } }} />
              </IconButton>
            </Paper>
            {captureSaleError ? <Alert severity="error">{captureSaleError.message}</Alert> : null}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: { xs: 0.65, sm: 1 } }}>
              {keypadKeys.map((key) => (
                <Button key={key} variant="outlined" color="secondary" onClick={() => appendKey(key)} sx={{ minHeight: { xs: 54, sm: 50 }, py: 0.5, fontSize: { xs: 27, sm: 18 }, fontWeight: 900, lineHeight: 1 }}>{key}</Button>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 0.75, sm: 2 }, pt: { xs: 0.75, sm: 0 }, borderTop: { xs: "1px solid", sm: "none" }, borderColor: "divider", bgcolor: "background.paper", flexShrink: 0 }}>
          <Button onClick={() => setCaptureProduct(null)} sx={{ minHeight: { xs: 48, sm: 40 }, fontSize: { xs: 16, sm: 14 } }}>Cancelar</Button>
          <AppButton color="secondary" disabled={Number(captureValue || 0) <= 0 || previewQuantity <= 0 || Boolean(captureSaleError)} onClick={confirmProduct} sx={{ minHeight: { xs: 48, sm: 40 }, fontSize: { xs: 16, sm: 14 } }}>Agregar al carrito</AppButton>
        </DialogActions>
      </Dialog>

    </Stack>
  );
};

export default SellerPosOrderForm;
