import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import AddBusinessOutlinedIcon from "@mui/icons-material/AddBusinessOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";
import catalogService from "services/catalog/catalog-service";
import authService from "services/auth/auth-service";
import { isAdministrativeUser } from "configs/access";
import { normalizeRows } from "views/modules/flow-utils";

const emptyForm = { id: null, code: "", name: "", address: "", phone: "", isActive: true };
const normalizeSearch = (value) => String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const BranchesConfigurationPage = () => {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await catalogService.getBranches({ onlyActive: 0 });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudieron cargar las sucursales");
      setItems(normalizeRows(response.data));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "No se pudieron cargar las sucursales");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const isAllowed = isAdministrativeUser(authService.getCurrentUser());
    setAllowed(isAllowed);
    if (!isAllowed) router.replace("/dashboards/analytics");
    else load();
  }, [load, router]);

  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return items;
    return items.filter((item) => normalizeSearch(`${item.code} ${item.name} ${item.address || ""} ${item.phone || ""}`).includes(query));
  }, [items, search]);

  const openEdit = (branch) => setForm({ id: Number(branch.id), code: branch.code || "", name: branch.name || "", address: branch.address || "", phone: branch.phone || "", isActive: Number(branch.is_active) === 1 });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = async () => {
    if (saving) return;
    const code = String(form?.code || "").trim().toUpperCase();
    const name = String(form?.name || "").trim();
    if (!form?.id && !/^[A-Z0-9_-]{2,30}$/.test(code)) return toast.error("Ingresa un código válido de 2 a 30 caracteres");
    if (name.length < 2) return toast.error("Ingresa el nombre de la sucursal");
    setSaving(true);
    try {
      const payload = { p_code: code, p_name: name, p_address: String(form.address || "").trim() || null, p_phone: String(form.phone || "").trim() || null, p_is_active: form.isActive ? 1 : 0 };
      const response = form.id ? await catalogService.updateBranch(form.id, payload) : await catalogService.createBranch(payload);
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo guardar la sucursal");
      toast.success(form.id ? "Sucursal actualizada" : "Sucursal creada");
      setForm(null);
      await load();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || requestError?.message || "No se pudo guardar la sucursal");
    } finally { setSaving(false); }
  };

  return <FlowPageLayout title="Sucursales" subtitle="Crea y actualiza las sedes operativas utilizadas por pedidos, inventario y producción.">
    {allowed !== true ? <Alert severity="info">Validando acceso administrativo...</Alert> : <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TextField fullWidth label="Buscar sucursal" placeholder="Código, nombre, dirección o teléfono" value={search} onChange={(event) => setSearch(event.target.value)} />
          <AppButton color="secondary" startIcon={<AddBusinessOutlinedIcon />} onClick={() => setForm({ ...emptyForm })} sx={{ minWidth: 190, minHeight: 52 }}>Nueva sucursal</AppButton>
        </Stack>
      </Paper>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <Alert severity="info">Cargando sucursales...</Alert> : null}
      {!loading && !filtered.length ? <Alert severity="info">No hay sucursales que coincidan con la búsqueda.</Alert> : null}
      <Grid container spacing={2}>
        {filtered.map((branch) => {
          const active = Number(branch.is_active) === 1;
          return <Grid item xs={12} md={6} xl={4} key={branch.id}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}><Stack spacing={2} height="100%">
            <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={1.5} minWidth={0}><Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "secondary.main", color: "secondary.contrastText", display: "grid", placeItems: "center", flexShrink: 0 }}><StorefrontOutlinedIcon /></Box><Box minWidth={0}><Typography variant="h6" fontWeight={900}>{branch.name}</Typography><Typography variant="body2" color="text.secondary">Código: {branch.code}</Typography></Box></Stack>
              <Chip label={active ? "Activa" : "Inactiva"} color={active ? "success" : "default"} variant={active ? "filled" : "outlined"} />
            </Stack>
            <Box><Typography variant="caption" color="text.secondary">Dirección</Typography><Typography>{branch.address || "Sin dirección"}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Teléfono</Typography><Typography>{branch.phone || "Sin teléfono"}</Typography></Box>
            <Box flex={1} />
            <AppButton variant="outlined" color="secondary" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(branch)}>Editar sucursal</AppButton>
          </Stack></Paper></Grid>;
        })}
      </Grid>
    </Stack>}

    <Dialog open={Boolean(form)} onClose={() => !saving && setForm(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, m: 1.5 } }}>
      <DialogTitle><Typography variant="h5" fontWeight={900}>{form?.id ? "Editar sucursal" : "Nueva sucursal"}</Typography><Typography variant="body2" color="text.secondary">La sucursal estará disponible en los procesos operativos cuando se encuentre activa.</Typography></DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <TextField autoFocus fullWidth required disabled={Boolean(form?.id)} label="Código" value={form?.code || ""} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30) }))} helperText={form?.id ? "El código se conserva para proteger las referencias existentes" : "Letras, números, guion y guion bajo"} />
        <TextField fullWidth required label="Nombre" value={form?.name || ""} onChange={update("name")} inputProps={{ maxLength: 120 }} />
        <TextField fullWidth label="Dirección" value={form?.address || ""} onChange={update("address")} inputProps={{ maxLength: 255 }} />
        <TextField fullWidth label="Teléfono" value={form?.phone || ""} onChange={update("phone")} inputProps={{ maxLength: 30 }} />
        {form?.id ? <FormControlLabel control={<Switch checked={Boolean(form?.isActive)} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />} label={form?.isActive ? "Sucursal activa" : "Sucursal inactiva"} /> : null}
        {form?.id && !form?.isActive ? <Alert severity="warning">La sucursal dejará de aparecer en operaciones nuevas. Sus pedidos, inventarios y reportes históricos se conservarán.</Alert> : null}
      </Stack></DialogContent>
      <DialogActions sx={{ p: 2.5 }}><AppButton variant="outlined" color="secondary" disabled={saving} onClick={() => setForm(null)}>Cancelar</AppButton><AppButton color="secondary" loading={saving} onClick={save}>Guardar sucursal</AppButton></DialogActions>
    </Dialog>
  </FlowPageLayout>;
};

export default BranchesConfigurationPage;
