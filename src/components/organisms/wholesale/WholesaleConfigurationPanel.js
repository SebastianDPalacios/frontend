import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AppButton from "@core/components/ui/AppButton";
import AppCard from "@core/components/ui/AppCard";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import toast from "react-hot-toast";
import wholesaleService from "services/wholesale/wholesale-service";
import SearchableSelect from "@core/components/ui/SearchableSelect";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const emptyData = { availableCustomers: [], availableProducts: [], priceLists: [], customers: [], prices: [] };
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.details || error?.message || fallback;
const normalize = (value) => String(value || "").trim().toLowerCase();
const dateText = (value) => value ? String(value).slice(0, 10) : "Sin límite";

const getPriceState = (price, today) => {
  if (!Number(price?.is_active)) return { label: "Inactivo", color: "default" };
  if (price.valid_from && today < String(price.valid_from).slice(0, 10)) return { label: "Programado", color: "info" };
  if (price.valid_to && today > String(price.valid_to).slice(0, 10)) return { label: "Vencido", color: "warning" };
  return { label: "Activo", color: "success" };
};

const StatusChip = ({ active, activeLabel = "Activo", inactiveLabel = "Inactivo" }) => (
  <Chip size="small" color={active ? "success" : "default"} variant={active ? "filled" : "outlined"} label={active ? activeLabel : inactiveLabel} />
);

const EmptyRow = ({ colSpan, children }) => (
  <TableRow><TableCell colSpan={colSpan}><Alert severity="info">{children}</Alert></TableCell></TableRow>
);

const WholesaleConfigurationPanel = () => {
  const today = toDateInputValue();
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [exceptionCustomerId, setExceptionCustomerId] = useState("");
  const [listDialog, setListDialog] = useState(null);
  const [customerDialog, setCustomerDialog] = useState(null);
  const [priceDialog, setPriceDialog] = useState(null);
  const [deactivateDialog, setDeactivateDialog] = useState(null);
  const [historyDialog, setHistoryDialog] = useState(null);

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wholesaleService.getConfiguration();
      setData({ ...emptyData, ...(response?.data || {}) });
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible cargar la configuración mayorista"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfiguration(); }, [loadConfiguration]);

  const activeLists = useMemo(() => data.priceLists.filter((item) => Number(item.is_active)), [data.priceLists]);
  const profileByCustomer = useMemo(() => Object.fromEntries(data.customers.map((item) => [String(item.customer_id), item])), [data.customers]);
  const productById = useMemo(() => Object.fromEntries(data.availableProducts.map((item) => [String(item.id), item])), [data.availableProducts]);
  const selectedExceptionProfile = profileByCustomer[String(exceptionCustomerId)] || null;

  const customers = useMemo(() => {
    const search = normalize(customerSearch);
    return data.availableCustomers.filter((item) => !search || normalize(`${item.name} ${item.tax_id}`).includes(search));
  }, [customerSearch, data.availableCustomers]);

  const generalPrices = useMemo(() => {
    const search = normalize(productSearch);
    return data.prices.filter((item) => !item.customer_id && (!search || normalize(`${item.product_name} ${productById[item.product_id]?.sku}`).includes(search)));
  }, [data.prices, productById, productSearch]);

  const exceptionPrices = useMemo(() => data.prices.filter((item) => item.customer_id && (!exceptionCustomerId || String(item.customer_id) === String(exceptionCustomerId))), [data.prices, exceptionCustomerId]);

  const runSave = async (operation, successMessage) => {
    setSaving(true);
    try {
      await operation();
      toast.success(successMessage);
      setListDialog(null);
      setCustomerDialog(null);
      setPriceDialog(null);
      setDeactivateDialog(null);
      await loadConfiguration();
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible guardar la configuración"));
    } finally {
      setSaving(false);
    }
  };

  const openCustomer = (customer, activate = true) => {
    const profile = profileByCustomer[String(customer.id)];
    setCustomerDialog({
      customer,
      priceListId: String(profile?.price_list_id || activeLists[0]?.id || ""),
      validFrom: String(profile?.valid_from || today).slice(0, 10),
      validTo: profile?.valid_to ? String(profile.valid_to).slice(0, 10) : "",
      isActive: activate,
      reason: "",
    });
  };

  const openPrice = ({ price = null, customerId = null } = {}) => {
    const product = productById[String(price?.product_id)];
    const profile = customerId ? profileByCustomer[String(customerId)] : null;
    setPriceDialog({
      id: price?.id || null,
      customerId: price?.customer_id || customerId || null,
      priceListId: String(price?.price_list_id || profile?.price_list_id || activeLists[0]?.id || ""),
      productId: String(price?.product_id || ""),
      regularPrice: Number(product?.base_price || price?.regular_price_reference || 0),
      wholesalePrice: price?.wholesale_price == null ? "" : Number(price.wholesale_price),
      validFrom: String(price?.valid_from || today).slice(0, 10),
      validTo: price?.valid_to ? String(price.valid_to).slice(0, 10) : "",
      isActive: price ? Boolean(Number(price.is_active)) : true,
      reason: "",
    });
  };

  const openHistory = async (entityType, entityId, title) => {
    setHistoryDialog({ title, loading: true, items: [] });
    try {
      const response = await wholesaleService.getHistory({ entityType, entityId });
      setHistoryDialog({ title, loading: false, items: Array.isArray(response?.data) ? response.data : [] });
    } catch (error) {
      setHistoryDialog(null);
      toast.error(getErrorMessage(error, "No fue posible consultar el historial"));
    }
  };

  const selectedGeneralReference = useMemo(() => {
    if (!priceDialog?.customerId || !priceDialog.productId || !priceDialog.priceListId) return null;
    return data.prices.find((item) => !item.customer_id
      && String(item.product_id) === String(priceDialog.productId)
      && String(item.price_list_id) === String(priceDialog.priceListId)
      && getPriceState(item, today).label === "Activo") || null;
  }, [data.prices, priceDialog, today]);

  if (loading) return <AppCard><Typography>Cargando configuración mayorista...</Typography></AppCard>;

  return <Stack spacing={2.5}>
    <Alert severity="info">
      Prioridad: <b>precio especial del cliente</b> → <b>precio mayorista general</b> → <b>precio regular</b>.
      Esta vista configura precios; no modifica productos, inventarios ni pedidos históricos.
    </Alert>

    <AppCard contentSx={{ pb: "16px !important" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
        <Box><Typography variant="h6">Listas de precios</Typography><Typography variant="body2" color="text.secondary">Agrupan los precios que se asignan a cada cliente mayorista.</Typography></Box>
        <AppButton color="secondary" startIcon={<AddRoundedIcon />} onClick={() => setListDialog({ code: "", name: "", reason: "" })}>Nueva lista</AppButton>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
        {data.priceLists.map((item) => <Chip key={item.id} label={`${item.name} · ${item.is_active ? "Activa" : "Inactiva"}`} color={item.is_active ? "success" : "default"} variant="outlined" />)}
        {!data.priceLists.length ? <Typography color="text.secondary">Crea una lista para comenzar.</Typography> : null}
      </Stack>
    </AppCard>

    <AppCard contentSx={{ p: "0 !important" }}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
        <Tab label={`Clientes mayoristas (${data.customers.filter((item) => Number(item.is_active)).length})`} />
        <Tab label={`Precios mayoristas (${generalPrices.length})`} />
        <Tab label={`Excepciones por cliente (${exceptionPrices.length})`} />
      </Tabs>

      {tab === 0 ? <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
          <Box><Typography variant="h6">Clientes mayoristas</Typography><Typography variant="body2" color="text.secondary">Marca clientes, asigna su lista y consulta su vigencia.</Typography></Box>
          <TextField label="Buscar cliente" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} sx={{ minWidth: { md: 320 } }} />
        </Stack>
        <TableContainer><Table sx={{ minWidth: 900 }}><TableHead><TableRow><TableCell>Cliente</TableCell><TableCell>Lista</TableCell><TableCell>Vigencia</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead><TableBody>
          {customers.map((customer) => { const profile = profileByCustomer[String(customer.id)]; const active = Boolean(Number(profile?.is_active)); return <TableRow key={customer.id} hover>
            <TableCell><Typography fontWeight={800}>{customer.name}</Typography><Typography variant="caption" color="text.secondary">{customer.tax_id || "Sin identificación"}</Typography></TableCell>
            <TableCell>{profile?.price_list_name || "Precio regular"}</TableCell>
            <TableCell>{profile ? `${dateText(profile.valid_from)} → ${dateText(profile.valid_to)}` : "Sin configuración"}</TableCell>
            <TableCell><StatusChip active={active} activeLabel="Mayorista" inactiveLabel="Regular" /></TableCell>
            <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end">
              {profile ? <AppButton size="small" variant="outlined" color="inherit" onClick={() => openHistory("customer_profile", profile.id, `Historial de ${customer.name}`)} startIcon={<HistoryRoundedIcon />}>Historial</AppButton> : null}
              <AppButton size="small" variant="outlined" color={active ? "error" : "secondary"} onClick={() => openCustomer(customer, !active)}>{active ? "Desmarcar" : profile ? "Reactivar" : "Marcar mayorista"}</AppButton>
            </Stack></TableCell>
          </TableRow>; })}
          {!customers.length ? <EmptyRow colSpan={5}>No hay clientes que coincidan con la búsqueda.</EmptyRow> : null}
        </TableBody></Table></TableContainer>
      </Box> : null}

      {tab === 1 ? <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
          <Box><Typography variant="h6">Precios mayoristas generales</Typography><Typography variant="body2" color="text.secondary">Aplican cuando el cliente no tiene una excepción vigente.</Typography></Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><TextField label="Buscar producto" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} /><AppButton color="secondary" startIcon={<AddRoundedIcon />} disabled={!activeLists.length} onClick={() => openPrice()}>Crear precio</AppButton></Stack>
        </Stack>
        <TableContainer><Table sx={{ minWidth: 1050 }}><TableHead><TableRow><TableCell>Producto</TableCell><TableCell>Lista</TableCell><TableCell>Precio regular actual</TableCell><TableCell>Precio mayorista</TableCell><TableCell>Diferencia</TableCell><TableCell>Vigencia</TableCell><TableCell>Estado</TableCell><TableCell>Última modificación</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead><TableBody>
          {generalPrices.map((price) => { const product = productById[String(price.product_id)]; const regular = Number(product?.base_price || 0); const state = getPriceState(price, today); return <TableRow key={price.id} hover>
            <TableCell><Typography fontWeight={800}>{price.product_name}</Typography><Typography variant="caption" color="text.secondary">{product?.sku}</Typography></TableCell><TableCell>{price.price_list_name}</TableCell><TableCell>{money.format(regular)}</TableCell><TableCell><b>{money.format(Number(price.wholesale_price))}</b></TableCell><TableCell>{money.format(Number(price.wholesale_price) - regular)}</TableCell><TableCell>{dateText(price.valid_from)} → {dateText(price.valid_to)}</TableCell><TableCell><Chip size="small" color={state.color} label={state.label} /></TableCell><TableCell>{String(price.updated_at || "").replace("T", " ").slice(0, 16)}</TableCell>
            <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end"><AppButton size="small" variant="outlined" color="inherit" onClick={() => openHistory("product_price", price.id, `Historial de ${price.product_name}`)}><HistoryRoundedIcon fontSize="small" /></AppButton><AppButton size="small" variant="outlined" onClick={() => openPrice({ price })}><EditRoundedIcon fontSize="small" /></AppButton>{Number(price.is_active) ? <AppButton size="small" variant="outlined" color="error" onClick={() => setDeactivateDialog({ price, reason: "", exception: false })}>Desactivar</AppButton> : null}</Stack></TableCell>
          </TableRow>; })}
          {!generalPrices.length ? <EmptyRow colSpan={9}>No hay precios generales para el filtro seleccionado.</EmptyRow> : null}
        </TableBody></Table></TableContainer>
      </Box> : null}

      {tab === 2 ? <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}><Box><Typography variant="h6">Excepciones por cliente</Typography><Typography variant="body2" color="text.secondary">Tienen prioridad sobre el precio mayorista general.</Typography></Box><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><SearchableSelect select label="Cliente mayorista" value={exceptionCustomerId} onChange={(event) => setExceptionCustomerId(event.target.value)} sx={{ minWidth: 280 }}><MenuItem value="">Todos</MenuItem>{data.customers.filter((item) => Number(item.is_active)).map((item) => <MenuItem key={item.customer_id} value={String(item.customer_id)}>{item.customer_name}</MenuItem>)}</SearchableSelect><AppButton color="secondary" startIcon={<AddRoundedIcon />} disabled={!selectedExceptionProfile} onClick={() => openPrice({ customerId: Number(exceptionCustomerId) })}>Crear excepción</AppButton></Stack></Stack>
        {!exceptionCustomerId ? <Alert severity="info" sx={{ mb: 2 }}>Selecciona un cliente para crear una excepción. La tabla puede mostrar todas las existentes.</Alert> : null}
        <TableContainer><Table sx={{ minWidth: 1000 }}><TableHead><TableRow><TableCell>Cliente</TableCell><TableCell>Producto</TableCell><TableCell>Precio general de referencia</TableCell><TableCell>Precio especial</TableCell><TableCell>Vigencia</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead><TableBody>
          {exceptionPrices.map((price) => { const general = data.prices.find((item) => !item.customer_id && item.product_id === price.product_id && item.price_list_id === price.price_list_id && getPriceState(item, today).label === "Activo"); const state = getPriceState(price, today); return <TableRow key={price.id} hover><TableCell><b>{price.customer_name}</b></TableCell><TableCell>{price.product_name}</TableCell><TableCell>{general ? money.format(Number(general.wholesale_price)) : "Usará precio regular"}</TableCell><TableCell><b>{money.format(Number(price.wholesale_price))}</b></TableCell><TableCell>{dateText(price.valid_from)} → {dateText(price.valid_to)}</TableCell><TableCell><Chip size="small" color={state.color} label={state.label} /></TableCell><TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end"><AppButton size="small" variant="outlined" color="inherit" onClick={() => openHistory("product_price", price.id, `Historial de ${price.customer_name}`)}><HistoryRoundedIcon fontSize="small" /></AppButton><AppButton size="small" variant="outlined" onClick={() => openPrice({ price })}>Editar</AppButton>{Number(price.is_active) ? <AppButton size="small" variant="outlined" color="error" onClick={() => setDeactivateDialog({ price, reason: "", exception: true })}>Quitar excepción</AppButton> : null}</Stack></TableCell></TableRow>; })}
          {!exceptionPrices.length ? <EmptyRow colSpan={7}>No hay excepciones configuradas.</EmptyRow> : null}
        </TableBody></Table></TableContainer>
      </Box> : null}
    </AppCard>

    <Dialog open={Boolean(listDialog)} onClose={() => !saving && setListDialog(null)} fullWidth maxWidth="sm"><DialogTitle>Nueva lista mayorista</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Código" value={listDialog?.code || ""} onChange={(event) => setListDialog((current) => ({ ...current, code: event.target.value.toUpperCase() }))} helperText="Ejemplo: MAYORISTA_GENERAL" /><TextField label="Nombre" value={listDialog?.name || ""} onChange={(event) => setListDialog((current) => ({ ...current, name: event.target.value }))} /><TextField multiline minRows={3} label="Motivo opcional" value={listDialog?.reason || ""} onChange={(event) => setListDialog((current) => ({ ...current, reason: event.target.value }))} /></Stack></DialogContent><DialogActions><AppButton variant="outlined" onClick={() => setListDialog(null)}>Cancelar</AppButton><AppButton color="secondary" loading={saving} disabled={!listDialog?.code || !listDialog?.name} onClick={() => runSave(() => wholesaleService.createPriceList(listDialog), "Lista mayorista creada")}>Guardar</AppButton></DialogActions></Dialog>

    <Dialog open={Boolean(customerDialog)} onClose={() => !saving && setCustomerDialog(null)} fullWidth maxWidth="sm"><DialogTitle>{customerDialog?.isActive ? "Configurar cliente mayorista" : "Desmarcar cliente mayorista"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity={customerDialog?.isActive ? "info" : "warning"}>{customerDialog?.customer?.name}</Alert><SearchableSelect select label="Lista de precios" value={customerDialog?.priceListId || ""} disabled={!customerDialog?.isActive} onChange={(event) => setCustomerDialog((current) => ({ ...current, priceListId: event.target.value }))}>{activeLists.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}</SearchableSelect><Grid container spacing={2}><Grid item xs={12} sm={6}><BalanceDatePicker fullWidth label="Vigente desde" value={customerDialog?.validFrom || today} onChange={(value) => setCustomerDialog((current) => ({ ...current, validFrom: value }))} /></Grid><Grid item xs={12} sm={6}><BalanceDatePicker fullWidth label="Vigente hasta (opcional)" value={customerDialog?.validTo || ""} minDate={customerDialog?.validFrom} onChange={(value) => setCustomerDialog((current) => ({ ...current, validTo: value }))} /></Grid></Grid><TextField multiline minRows={3} label="Motivo opcional" value={customerDialog?.reason || ""} onChange={(event) => setCustomerDialog((current) => ({ ...current, reason: event.target.value }))} /></Stack></DialogContent><DialogActions><AppButton variant="outlined" onClick={() => setCustomerDialog(null)}>Cancelar</AppButton><AppButton color={customerDialog?.isActive ? "secondary" : "error"} loading={saving} disabled={!customerDialog?.priceListId} onClick={() => runSave(() => wholesaleService.setCustomer(customerDialog.customer.id, { priceListId: Number(customerDialog.priceListId), validFrom: customerDialog.validFrom, validTo: customerDialog.validTo || null, isActive: customerDialog.isActive, reason: customerDialog.reason }), customerDialog.isActive ? "Cliente configurado como mayorista" : "Cliente desmarcado")}>{customerDialog?.isActive ? "Guardar" : "Desmarcar"}</AppButton></DialogActions></Dialog>

    <Dialog open={Boolean(priceDialog)} onClose={() => !saving && setPriceDialog(null)} fullWidth maxWidth="md"><DialogTitle>{priceDialog?.customerId ? "Precio especial por cliente" : "Precio mayorista general"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="info">{priceDialog?.customerId ? "Este precio tendrá prioridad sobre el mayorista general." : "Este precio se usará si el cliente no tiene una excepción vigente."}</Alert><Grid container spacing={2}><Grid item xs={12} md={6}><SearchableSelect select fullWidth label="Lista de precios" value={priceDialog?.priceListId || ""} onChange={(event) => setPriceDialog((current) => ({ ...current, priceListId: event.target.value }))}>{activeLists.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}</SearchableSelect></Grid><Grid item xs={12} md={6}><SearchableSelect select fullWidth label="Producto" value={priceDialog?.productId || ""} onChange={(event) => { const product = productById[event.target.value]; setPriceDialog((current) => ({ ...current, productId: event.target.value, regularPrice: Number(product?.base_price || 0) })); }}>{data.availableProducts.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name} · {money.format(Number(item.base_price))}</MenuItem>)}</SearchableSelect></Grid><Grid item xs={12} md={6}><TextField fullWidth disabled label="Precio regular actual" value={money.format(Number(priceDialog?.regularPrice || 0))} /></Grid><Grid item xs={12} md={6}><TextField fullWidth type="text" label={priceDialog?.customerId ? "Precio especial" : "Precio mayorista"} value={priceDialog?.wholesalePrice ?? ""} onChange={(event) => { const value = event.target.value; if (/^\d*$/.test(value)) setPriceDialog((current) => ({ ...current, wholesalePrice: value })); }} inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }} helperText="Ingresa un valor entero, sin decimales" /></Grid></Grid>{priceDialog?.customerId ? <Alert severity={selectedGeneralReference ? "success" : "warning"}>Precio mayorista general de referencia: <b>{selectedGeneralReference ? money.format(Number(selectedGeneralReference.wholesale_price)) : "no configurado; el respaldo será el precio regular"}</b>.</Alert> : null}<Grid container spacing={2}><Grid item xs={12} sm={6}><BalanceDatePicker fullWidth label="Vigente desde" value={priceDialog?.validFrom || today} onChange={(value) => setPriceDialog((current) => ({ ...current, validFrom: value }))} /></Grid><Grid item xs={12} sm={6}><BalanceDatePicker fullWidth label="Vigente hasta (opcional)" value={priceDialog?.validTo || ""} minDate={priceDialog?.validFrom} onChange={(value) => setPriceDialog((current) => ({ ...current, validTo: value }))} /></Grid></Grid><FormControlLabel control={<Switch checked={Boolean(priceDialog?.isActive)} onChange={(event) => setPriceDialog((current) => ({ ...current, isActive: event.target.checked }))} />} label="Precio activo" /><TextField multiline minRows={3} label="Motivo opcional" value={priceDialog?.reason || ""} onChange={(event) => setPriceDialog((current) => ({ ...current, reason: event.target.value }))} /></Stack></DialogContent><DialogActions><AppButton variant="outlined" onClick={() => setPriceDialog(null)}>Cancelar</AppButton><AppButton color="secondary" loading={saving} disabled={!priceDialog?.priceListId || !priceDialog?.productId || !Number.isInteger(Number(priceDialog?.wholesalePrice)) || Number(priceDialog?.wholesalePrice) <= 0} onClick={() => { const payload = { priceListId: Number(priceDialog.priceListId), productId: Number(priceDialog.productId), customerId: priceDialog.customerId ? Number(priceDialog.customerId) : null, wholesalePrice: Number(priceDialog.wholesalePrice), validFrom: priceDialog.validFrom, validTo: priceDialog.validTo || null, isActive: priceDialog.isActive, reason: priceDialog.reason }; return runSave(() => priceDialog.id ? wholesaleService.updatePrice(priceDialog.id, payload) : wholesaleService.createPrice(payload), "Precio mayorista guardado"); }}>Guardar precio</AppButton></DialogActions></Dialog>

    <Dialog open={Boolean(deactivateDialog)} onClose={() => !saving && setDeactivateDialog(null)} fullWidth maxWidth="sm"><DialogTitle>{deactivateDialog?.exception ? "Quitar excepción" : "Desactivar precio"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="warning">El registro permanecerá en el historial y dejará de participar en la prioridad de precios.</Alert><TextField multiline minRows={3} label="Motivo opcional" value={deactivateDialog?.reason || ""} onChange={(event) => setDeactivateDialog((current) => ({ ...current, reason: event.target.value }))} /></Stack></DialogContent><DialogActions><AppButton variant="outlined" onClick={() => setDeactivateDialog(null)}>Cancelar</AppButton><AppButton color="error" loading={saving} onClick={() => runSave(() => wholesaleService.deactivatePrice(deactivateDialog.price.id, deactivateDialog.reason), deactivateDialog.exception ? "Excepción retirada; volverá a aplicar la prioridad general" : "Precio desactivado")}>Confirmar</AppButton></DialogActions></Dialog>

    <Dialog open={Boolean(historyDialog)} onClose={() => setHistoryDialog(null)} fullWidth maxWidth="md"><DialogTitle>{historyDialog?.title}</DialogTitle><DialogContent>{historyDialog?.loading ? <Typography>Cargando historial...</Typography> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Acción</TableCell><TableCell>Motivo</TableCell><TableCell>Administrador</TableCell></TableRow></TableHead><TableBody>{historyDialog?.items?.map((item) => <TableRow key={item.id}><TableCell>{String(item.created_at || "").replace("T", " ").slice(0, 19)}</TableCell><TableCell>{item.action_type}</TableCell><TableCell>{item.reason}</TableCell><TableCell>{item.changed_by_name}</TableCell></TableRow>)}{!historyDialog?.items?.length ? <EmptyRow colSpan={4}>No hay cambios registrados.</EmptyRow> : null}</TableBody></Table></TableContainer>}</DialogContent><DialogActions><AppButton onClick={() => setHistoryDialog(null)}>Cerrar</AppButton></DialogActions></Dialog>
  </Stack>;
};

export default WholesaleConfigurationPanel;
