import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Button,
  Dialog, DialogActions, DialogContent, Divider, MenuItem, TextField,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import FlowPageLayout from "views/modules/FlowPageLayout";
import AppButton from "@core/components/ui/AppButton";
import PaginationControls from "components/molecules/PaginationControls";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "COP",
});

const formatCreditLimit = (value) => {
  const number = Number(value || 0);
  return number > 0 ? moneyFormatter.format(number) : "Sin credito";
};

const getInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "CL";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const CustomersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [pendingCustomerId, setPendingCustomerId] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editDialog, setEditDialog] = useState({ open: false, customer: null, values: {}, error: null, saving: false });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, assignments] = await Promise.all([
        catalogService.getCustomers({ page, pageSize, search: debouncedSearch }),
        catalogService.getCustomerAssignments(),
      ]);
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el catalogo de clientes");
        return;
      }
      setItems(normalizeList(response.data));
      setTotal(Number(response.data?.total || 0));
      setSellers(normalizeList(assignments.data?.sellers));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Error de red al cargar clientes"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const openEdit = async (customer) => {
    const assignments = await catalogService.getCustomerAssignments();
    const assigned = normalizeList(assignments.data?.customers).find((item) => Number(item.id) === Number(customer.id));
    setEditDialog({ open: true, customer, values: {
      tax_id: customer.tax_id || "", name: customer.name || "", email: customer.email || "", phone: customer.phone || "",
      address: customer.address || "", neighborhood: customer.neighborhood || "", status: customer.status || "active",
      credit_limit: String(customer.credit_limit ?? 0), sales_agent_user_id: String(assigned?.sales_agent_user_id || ""),
    }, originalSellerId: String(assigned?.sales_agent_user_id || ""), error: null, saving: false });
  };
  const closeEdit = () => setEditDialog({ open: false, customer: null, values: {}, error: null, saving: false });
  const setEditValue = (field, value) => setEditDialog((current) => ({ ...current, values: { ...current.values, [field]: value }, error: null }));
  const saveCustomer = async () => {
    const values = editDialog.values;
    if (!values.name.trim()) { setEditDialog((current) => ({ ...current, error: "El nombre es obligatorio" })); return; }
    setEditDialog((current) => ({ ...current, saving: true, error: null }));
    try {
      const result = await catalogService.updateCustomer(editDialog.customer.id, {
        p_tax_id: values.tax_id.trim() || null, p_name: values.name.trim(), p_email: values.email.trim() || null,
        p_phone: values.phone.trim() || null, p_address: values.address.trim() || null, p_neighborhood: values.neighborhood.trim() || null,
        p_status: values.status, p_credit_limit: Number(values.credit_limit || 0),
      });
      if (result?.code !== 1) throw new Error(result?.message || "No se pudo actualizar el cliente");
      if (String(values.sales_agent_user_id || "") !== String(editDialog.originalSellerId || "")) {
        const assignment = values.sales_agent_user_id
          ? await catalogService.assignCustomer(editDialog.customer.id, Number(values.sales_agent_user_id))
          : await catalogService.unassignCustomer(editDialog.customer.id);
        if (assignment?.code !== 1) throw new Error(assignment?.message || "Cliente actualizado, pero no se pudo cambiar el vendedor");
      }
      toast.success("Cliente actualizado"); closeEdit(); await loadCustomers();
    } catch (requestError) {
      setEditDialog((current) => ({ ...current, saving: false, error: getApiErrorMessage(requestError, requestError.message) }));
    }
  };

  const handleToggleCustomerStatus = async (customer) => {
    const isActive = customer.status === "active";
    const nextStatus = isActive ? "inactive" : "active";

    setPendingCustomerId(customer.id);
    try {
      const response = await catalogService.setCustomerStatus(customer.id, {
        p_status: nextStatus,
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo actualizar el cliente");
        return;
      }

      toast.success(nextStatus === "active" ? "Cliente activado" : "Cliente inactivado");
      await loadCustomers();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Error de red al actualizar el cliente"));
    } finally {
      setPendingCustomerId(null);
    }
  };

  return (
    <FlowPageLayout title="Clientes" subtitle="Listado operativo de clientes">
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            px: { xs: 2, md: 3 },
            py: 2,
            bgcolor: "background.default",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Listado de clientes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {loading ? "Cargando base comercial..." : `${items.length} cliente(s) registrados`}
            </Typography>
          </Box>
          <Chip label="Base comercial" color="secondary" variant="outlined" sx={{ fontWeight: 800 }} />
        </Stack>

        {loading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: { xs: 2, md: 3 }, py: 3 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">
              Cargando clientes...
            </Typography>
          </Stack>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ m: { xs: 2, md: 3 } }}>
            {error}
          </Alert>
        ) : null}

        {!loading ? (<>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ p: 2 }}>
            <TextField fullWidth label="Buscar cliente" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            <TextField select label="Por pagina" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} sx={{ minWidth: 130 }}>{[10, 20, 50, 100].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}</TextField>
          </Stack>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      bgcolor: "background.paper",
                      color: "text.secondary",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 0,
                      textTransform: "uppercase",
                    },
                  }}
                >
                  <TableCell>Cliente</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Credito</TableCell>
                  <TableCell align="right">Accion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((customer, index) => {
                  const isActive = customer.status === "active";
                  const isPending = pendingCustomerId === customer.id;

                  return (
                    <TableRow
                      key={customer.id ?? customer.tax_id ?? index}
                      sx={{
                        "&:last-child td": { borderBottom: 0 },
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Avatar
                            sx={{
                              width: 38,
                              height: 38,
                              bgcolor: "secondary.light",
                              color: "secondary.contrastText",
                              fontSize: 14,
                              fontWeight: 900,
                            }}
                          >
                            {getInitials(customer.name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800 }}>{customer.name || "Sin nombre"}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {customer.tax_id || "Sin identificacion"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2">{customer.email || "Sin correo"}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {customer.phone || "Sin telefono"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {customer.neighborhood || "Sin barrio/zona"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Chip
                            label={isActive ? "Activo" : "Inactivo"}
                            color={isActive ? "success" : "default"}
                            variant={isActive ? "outlined" : "filled"}
                            size="small"
                            sx={{ minWidth: 82, fontWeight: 800 }}
                          />
                          <Switch
                            checked={isActive}
                            disabled={isPending}
                            onChange={() => handleToggleCustomerStatus(customer)}
                            size="small"
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 800 }}>{formatCreditLimit(customer.credit_limit)}</Typography>
                      </TableCell>
                      <TableCell align="right"><Button variant="contained" color="secondary" size="small" onClick={() => openEdit(customer)}>Editar</Button></TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary">No hay clientes registrados.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
          <PaginationControls currentPage={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} onPrevious={() => setPage((value) => value - 1)} onNext={() => setPage((value) => value + 1)} sx={{ py: 2 }} />
        </>) : null}
      </Paper>
      <Dialog open={editDialog.open} onClose={editDialog.saving ? undefined : closeEdit} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
        <Box sx={{ px: { xs: 2.5, md: 4 }, py: 3, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "secondary.main", color: "secondary.contrastText", display: "grid", placeItems: "center" }}><EditOutlinedIcon /></Box>
              <Box><Typography variant="h5" sx={{ fontWeight: 900 }}>Editar cliente</Typography><Typography variant="body2" color="text.secondary">Actualiza sus datos de contacto y condiciones comerciales.</Typography></Box>
            </Stack>
            <Chip label={editDialog.customer?.status === "active" ? "Cliente activo" : "Cliente inactivo"} color={editDialog.customer?.status === "active" ? "success" : "default"} variant="outlined" sx={{ fontWeight: 800 }} />
          </Stack>
        </Box>
        <DialogContent sx={{ px: { xs: 2.5, md: 4 }, py: 3 }}><Stack spacing={3}>
          {editDialog.error ? <Alert severity="error">{editDialog.error}</Alert> : null}
          <Box><Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Datos basicos</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}><TextField fullWidth label="Identificacion" value={editDialog.values.tax_id || ""} onChange={(e) => setEditValue("tax_id", e.target.value)} /><TextField fullWidth required label="Nombre" value={editDialog.values.name || ""} onChange={(e) => setEditValue("name", e.target.value)} /></Stack>
          </Box><Divider />
          <Box><Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Contacto y ubicacion</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}><TextField fullWidth label="Correo" value={editDialog.values.email || ""} onChange={(e) => setEditValue("email", e.target.value)} /><TextField fullWidth label="Telefono" value={editDialog.values.phone || ""} onChange={(e) => setEditValue("phone", e.target.value)} /></Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}><TextField fullWidth label="Direccion" value={editDialog.values.address || ""} onChange={(e) => setEditValue("address", e.target.value)} /><TextField fullWidth label="Barrio / zona" value={editDialog.values.neighborhood || ""} onChange={(e) => setEditValue("neighborhood", e.target.value)} /></Stack>
          </Box><Divider />
          <Box><Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Condiciones comerciales</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}><TextField fullWidth type="number" label="Limite de credito" value={editDialog.values.credit_limit || ""} onChange={(e) => setEditValue("credit_limit", e.target.value)} inputProps={{ min: 0 }} /><TextField select fullWidth label="Estado" value={editDialog.values.status || "active"} onChange={(e) => setEditValue("status", e.target.value)}><MenuItem value="active">Activo</MenuItem><MenuItem value="inactive">Inactivo</MenuItem></TextField><TextField select fullWidth label="Vendedor" value={editDialog.values.sales_agent_user_id || ""} onChange={(e) => setEditValue("sales_agent_user_id", e.target.value)}><MenuItem value="">Sin vendedor</MenuItem>{sellers.map((seller) => <MenuItem key={seller.id} value={String(seller.id)}>{seller.full_name || seller.username}</MenuItem>)}</TextField></Stack>
          </Box>
        </Stack></DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, md: 4 }, py: 2.5, bgcolor: "background.default", borderTop: "1px solid", borderColor: "divider", gap: 1 }}><AppButton variant="outlined" color="secondary" onClick={closeEdit} disabled={editDialog.saving}>Cancelar</AppButton><AppButton color="secondary" onClick={saveCustomer} loading={editDialog.saving} loadingLabel="Guardando...">Guardar cambios</AppButton></DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default CustomersPage;
