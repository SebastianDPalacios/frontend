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
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
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

const GiftMetricCard = ({ icon, label, value, helper, color = "secondary" }) => (
  <Paper variant="outlined" sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: 3, height: "100%", position: "relative", overflow: "hidden" }}>
    <Box sx={{ position: "absolute", inset: "0 auto 0 0", width: 4, bgcolor: `${color}.main` }} />
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", pl: 0.5 }}>
      <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: "grid", placeItems: "center", flexShrink: 0, bgcolor: `${color}.50`, color: `${color}.main` }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography sx={{ fontSize: { xs: 24, md: 30 }, lineHeight: 1.1, fontWeight: 950, overflowWrap: "anywhere" }}>{value}</Typography>
        {helper ? <Typography variant="caption" color="text.secondary">{helper}</Typography> : null}
      </Box>
    </Stack>
  </Paper>
);

const GiftsPage = () => {
  const compactView = useMediaQuery("(max-width:1024px)", { noSsr: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [summary, setSummary] = useState({ gift_count: 0, gift_total: 0 });
  const [form, setForm] = useState(emptyForm);
  const [giftLines, setGiftLines] = useState([]);
  const [historySearch, setHistorySearch] = useState("");

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

  const updateGiftLineQuantity = (lineId, value) => {
    const quantity = String(value).replace(/[^0-9.]/g, "");
    setGiftLines((current) => current.map((line) => (line.id === lineId ? { ...line, quantity } : line)));
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
    if (giftLines.some((line) => Number(line.quantity || 0) <= 0)) {
      toast.error("Revisa las cantidades de los productos");
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
  const giftedUnits = gifts.reduce(
    (total, gift) => total + (gift.items || []).reduce((subtotal, item) => subtotal + Number(item.quantity || 0), 0),
    0
  );
  const normalizedHistorySearch = historySearch.trim().toLocaleLowerCase("es");
  const filteredGifts = normalizedHistorySearch
    ? gifts.filter((gift) => `${gift.customer_name || ""} ${gift.sales_agent_name || ""} ${(gift.items || []).map((item) => item.product_name).join(" ")}`.toLocaleLowerCase("es").includes(normalizedHistorySearch))
    : gifts;

  return (
    <FlowPageLayout
      title="Regalos"
      subtitle="Registra pan regalado. No se cuenta como venta."
      hideBreadcrumbsOnMobile
      compactHeaderOnMobile
    >
      <Stack spacing={{ xs: 2, md: 3 }}>
        <Grid container spacing={{ xs: 1.25, md: 2 }}>
          <Grid item xs={6} md={4}>
            <GiftMetricCard icon={<CardGiftcardRoundedIcon />} label="Regalos del día" value={Number(summary.gift_count || 0)} helper="Registros guardados" />
          </Grid>
          <Grid item xs={6} md={4}>
            <GiftMetricCard icon={<Inventory2RoundedIcon />} label="Unidades regaladas" value={formatInventoryQuantity(giftedUnits)} helper="Productos entregados" color="info" />
          </Grid>
          <Grid item xs={12} md={4}>
            <GiftMetricCard icon={<Inventory2RoundedIcon />} label="Valor comercial" value={`$${formatCurrencyValue(summary.gift_total || 0, 0)}`} helper="No se registra como venta" color="success" />
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: 23, md: 20 } }}>Registrar nuevo regalo</Typography>
                <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 14 } }}>
                  Selecciona el cliente y agrega los productos que vas a entregar.
                </Typography>
              </Box>
              <Chip label="No se registra como venta" color="success" variant="outlined" sx={{ alignSelf: "flex-start" }} />
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
                <Autocomplete
                  fullWidth
                  options={customers}
                  value={customers.find((customer) => String(customer.id) === String(form.customerId)) || null}
                  onChange={(_, value) => updateForm("customerId", value?.id ? String(value.id) : "")}
                  getOptionLabel={(option) => getDisplayName(option)}
                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                  noOptionsText="No se encontraron clientes"
                  renderInput={(params) => <TextField {...params} label="Buscar cliente" placeholder="Nombre o identificación" />}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <BalanceDatePicker
                  fullWidth
                  label="Fecha del regalo"
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
                  renderInput={(params) => <TextField {...params} label="Producto a regalar" />}
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
                  sx={{ minHeight: { xs: 60, md: 52 }, fontSize: { xs: 18, md: 15 } }}
                >
                  Agregar
                </Button>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas (opcional)"
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  inputProps={{ maxLength: 255 }}
                />
              </Grid>
            </Grid>

            <Divider />

            {!giftLines.length ? (
              <Alert severity="info" sx={{ fontSize: { xs: 16, md: 14 } }}>Agrega el primer producto para regalar.</Alert>
            ) : (
              <Stack spacing={1.25}>
                {giftLines.map((line) => (
                  <Paper key={line.id} variant="outlined" sx={{ p: { xs: 2, md: 1.5 }, borderRadius: 3 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere", fontSize: { xs: 20, md: 16 } }}>{line.name}</Typography>
                        <Typography color="text.secondary" sx={{ fontSize: { xs: 17, md: 14 } }}>
                          {formatInventoryQuantity(line.quantity, line.unit)} {line.unit || "unidades"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <TextField
                          size="small"
                          type="number"
                          label="Cantidad"
                          value={line.quantity}
                          onChange={(event) => updateGiftLineQuantity(line.id, event.target.value)}
                          inputProps={{ min: 1, step: 1 }}
                          sx={{ width: { xs: "100%", sm: 130 } }}
                        />
                        <IconButton color="error" onClick={() => removeGiftLine(line.id)} aria-label="Retirar producto regalado">
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between" }}>
                  <Typography color="text.secondary" sx={{ fontSize: { xs: 18, md: 14 } }}>
                    <strong sx={{ fontWeight: 900 }}>Total del regalo: ${formatCurrencyValue(totalSelectedValue, 0)}</strong>
                  </Typography>
                  <AppButton color="secondary" loading={saving} onClick={saveGift} fullWidth={compactView} sx={{ minWidth: 220, minHeight: { xs: 62, md: 48 }, fontSize: { xs: 18, md: 15 } }}>
                    Guardar regalo
                  </AppButton>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: 24, md: 20 } }}>Regalos del día</Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 14 } }}>{form.giftDate}</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
              <TextField
                size="small"
                label="Buscar en el historial"
                placeholder="Cliente, vendedor o producto"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                sx={{ minWidth: { sm: 280 } }}
              />
              <Chip label={`${filteredGifts.length} registro${filteredGifts.length === 1 ? "" : "s"}`} variant="outlined" color="success" />
            </Stack>
          </Stack>

          {loading ? <Alert severity="info">Cargando obsequios...</Alert> : null}
          {!loading && !filteredGifts.length ? (
            <Alert severity="info">{gifts.length ? "No hay regalos que coincidan con la búsqueda." : "No hay obsequios registrados para esta fecha."}</Alert>
          ) : null}
          <Stack spacing={1.5}>
            {filteredGifts.map((gift) => (
              <Paper key={gift.id} variant="outlined" sx={{ p: { xs: 2.25, md: 2 }, borderRadius: 4 }}>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: 21, md: 16 } }}>{gift.customer_name}</Typography>
                      <Typography color="text.secondary" sx={{ fontSize: { xs: 15, md: 14 } }}>
                        {compactView ? `Registrado por ${gift.created_by_name || "usuario"}` : `Vendedor: ${gift.sales_agent_name || "Sin vendedor"} | Registrado por: ${gift.created_by_name || "Sin usuario"}`}
                      </Typography>
                    </Box>
                    <Chip label={`$${formatCurrencyValue(gift.total_commercial_value || 0, 0)}`} variant="outlined" color="success" />
                  </Stack>
                  <Divider />
                  <Grid container spacing={1}>
                    {(gift.items || []).map((item) => (
                      <Grid item xs={12} md={6} key={`${gift.id}-${item.product_id}`}>
                        <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "action.hover" }}>
                          <Typography sx={{ fontWeight: 900, fontSize: { xs: 18, md: 16 } }}>{item.product_name}</Typography>
                          <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 14 } }}>
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
