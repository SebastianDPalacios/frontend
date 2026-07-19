import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import FlowPageLayout from "views/modules/FlowPageLayout";
import ordersService from "services/orders/orders-service";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";

const today = toDateInputValue();

const emptyForm = {
  branchId: "",
  customerId: "",
  giftDate: today,
  product: null,
  quantity: "",
  notes: "",
};

const GiftsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [summary, setSummary] = useState({ gift_count: 0, gift_total: 0 });
  const [form, setForm] = useState(emptyForm);
  const [giftLines, setGiftLines] = useState([]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [Number(product.id), product])),
    [products]
  );

  const availableProducts = useMemo(() => {
    const selectedIds = new Set(giftLines.map((line) => Number(line.productId)));
    return products.filter((product) => !selectedIds.has(Number(product.id)));
  }, [giftLines, products]);

  const loadGifts = useCallback(async (date = today) => {
    try {
      const response = await ordersService.getSalesGifts({ dateFrom: date, dateTo: date });
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron cargar los obsequios");
        return;
      }
      setGifts(normalizeRows(response.data?.items));
      setSummary(response.data?.summary || { gift_count: 0, gift_total: 0 });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al cargar obsequios");
    }
  }, []);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 200 });
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron cargar los datos base");
        return;
      }

      const nextBranches = normalizeRows(response.data?.branches);
      const nextCustomers = normalizeRows(response.data?.customers);
      const nextProducts = normalizeRows(response.data?.products);

      setBranches(nextBranches);
      setCustomers(nextCustomers);
      setProducts(nextProducts);
      setForm((current) => ({
        ...current,
        branchId: current.branchId || (nextBranches[0]?.id ? String(nextBranches[0].id) : ""),
        customerId: current.customerId || (nextCustomers[0]?.id ? String(nextCustomers[0].id) : ""),
      }));
      await loadGifts(today);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al cargar obsequios");
    } finally {
      setLoading(false);
    }
  }, [loadGifts]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addGiftLine = () => {
    const product = form.product;
    const quantity = Number(form.quantity || 0);

    if (!product?.id || quantity <= 0) {
      toast.error("Selecciona producto y cantidad de obsequio");
      return;
    }

    setGiftLines((current) => [
      ...current,
      {
        id: `${product.id}-${Date.now()}`,
        productId: Number(product.id),
        name: product.name,
        unit: product.unit,
        quantity,
      },
    ]);
    setForm((current) => ({ ...current, product: null, quantity: "" }));
  };

  const removeGiftLine = (lineId) => {
    setGiftLines((current) => current.filter((line) => line.id !== lineId));
  };

  const saveGift = async () => {
    if (!form.branchId || !form.customerId) {
      toast.error("Selecciona sucursal y cliente");
      return;
    }
    if (!giftLines.length) {
      toast.error("Agrega al menos un producto regalado");
      return;
    }

    setSaving(true);
    try {
      const response = await ordersService.createSalesGift({
        p_branch_id: Number(form.branchId),
        p_customer_id: Number(form.customerId),
        p_gift_date: form.giftDate,
        p_notes: form.notes.trim() || null,
        p_items_json: giftLines.map((line) => ({
          product_id: Number(line.productId),
          quantity: Number(line.quantity),
        })),
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo guardar el obsequio");
        return;
      }

      toast.success("Obsequio registrado");
      setGiftLines([]);
      setForm((current) => ({ ...current, product: null, quantity: "", notes: "" }));
      await loadGifts(form.giftDate);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al guardar el obsequio");
    } finally {
      setSaving(false);
    }
  };

  const totalSelectedValue = giftLines.reduce((total, line) => {
    const product = productsById.get(Number(line.productId));
    const price = Number(product?.base_price || 0);
    const taxPercent = Number(product?.tax_percent || product?.rate_percent || 0);
    return total + Number(line.quantity || 0) * price * (1 + taxPercent / 100);
  }, 0);

  return (
    <FlowPageLayout
      title="Obsequios"
      subtitle="Registra pan regalado sin mezclarlo con venta, vendaje, comision o factura POS."
    >
      <Stack spacing={3}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, height: "100%" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <CardGiftcardRoundedIcon color="secondary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Obsequios del dia</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>{Number(summary.gift_count || 0)}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, height: "100%" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Inventory2RoundedIcon color="success" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Valor operativo</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>${formatCurrencyValue(summary.gift_total || 0, 0)}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, height: "100%" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <PersonRoundedIcon color="info" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Regla</Typography>
                  <Typography sx={{ fontWeight: 900 }}>No suma a venta ni comision</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Registrar obsequio</Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona el cliente, agrega productos regalados y guarda el registro independiente.
                </Typography>
              </Box>
              <Chip label="Independiente de pedidos" color="success" variant="outlined" />
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Sucursal" value={form.branchId} onChange={(event) => updateForm("branchId", event.target.value)}>
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={String(branch.id)}>{getDisplayName(branch)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Cliente que recibe" value={form.customerId} onChange={(event) => updateForm("customerId", event.target.value)}>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={String(customer.id)}>{getDisplayName(customer)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <BalanceDatePicker
                  fullWidth
                  label="Fecha obsequio"
                  value={form.giftDate}
                  maxDate={today}
                  onChange={(value) => {
                    updateForm("giftDate", value);
                    loadGifts(value);
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  fullWidth
                  options={availableProducts}
                  value={form.product}
                  onChange={(_, value) => updateForm("product", value)}
                  getOptionLabel={(option) => option?.name || "Producto"}
                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                  noOptionsText="No hay productos disponibles"
                  renderInput={(params) => <TextField {...params} label="Producto regalado" />}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: "block", py: 1.25 }}>
                      <Typography sx={{ fontWeight: 900 }}>{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.category_name || "Sin categoria"} | ${formatCurrencyValue(option.base_price, 0)} por {option.unit || "unidad"}
                      </Typography>
                    </Box>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  value={form.quantity}
                  onChange={(event) => updateForm("quantity", event.target.value)}
                  inputProps={{ min: 0, step: 1, inputMode: "decimal" }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  startIcon={<AddRoundedIcon />}
                  onClick={addGiftLine}
                  disabled={!form.product || !form.quantity}
                  sx={{ minHeight: 52 }}
                >
                  Agregar
                </Button>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas del obsequio"
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  inputProps={{ maxLength: 255 }}
                />
              </Grid>
            </Grid>

            <Divider />

            {!giftLines.length ? (
              <Alert severity="info">Aun no has agregado productos de obsequio.</Alert>
            ) : (
              <Stack spacing={1.25}>
                {giftLines.map((line) => (
                  <Paper key={line.id} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>{line.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatInventoryQuantity(line.quantity, line.unit)} {line.unit || "unidades"}
                        </Typography>
                      </Box>
                      <IconButton color="error" onClick={() => removeGiftLine(line.id)} aria-label="Retirar producto regalado">
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between" }}>
                  <Typography color="text.secondary">
                    Valor operativo seleccionado: <strong>${formatCurrencyValue(totalSelectedValue, 0)}</strong>
                  </Typography>
                  <AppButton color="secondary" loading={saving} onClick={saveGift} sx={{ minWidth: 220 }}>
                    Guardar obsequio
                  </AppButton>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Obsequios registrados</Typography>
              <Typography variant="body2" color="text.secondary">Registros independientes del {form.giftDate}.</Typography>
            </Box>
            <Chip label={`${gifts.length} registro(s)`} variant="outlined" color="success" />
          </Stack>

          {loading ? <Alert severity="info">Cargando obsequios...</Alert> : null}
          {!loading && !gifts.length ? (
            <Alert severity="info">No hay obsequios registrados para esta fecha.</Alert>
          ) : null}
          <Stack spacing={1.5}>
            {gifts.map((gift) => (
              <Paper key={gift.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>{gift.customer_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vendedor: {gift.sales_agent_name || "Sin vendedor"} | Registrado por: {gift.created_by_name || "Sin usuario"}
                      </Typography>
                    </Box>
                    <Chip label={`$${formatCurrencyValue(gift.total_commercial_value || 0, 0)}`} variant="outlined" color="success" />
                  </Stack>
                  <Divider />
                  <Grid container spacing={1}>
                    {(gift.items || []).map((item) => (
                      <Grid item xs={12} md={6} key={`${gift.id}-${item.product_id}`}>
                        <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "action.hover" }}>
                          <Typography sx={{ fontWeight: 900 }}>{item.product_name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatInventoryQuantity(item.quantity)} unidad(es) | {item.category_name || "Sin categoria"}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  {gift.notes ? <Typography variant="body2" color="text.secondary">Notas: {gift.notes}</Typography> : null}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </FlowPageLayout>
  );
};

export default GiftsPage;

