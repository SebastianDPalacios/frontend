import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import FlowPageLayout from "views/modules/FlowPageLayout";
import ordersService from "services/orders/orders-service";
import { normalizeRows } from "views/modules/flow-utils";

const getInitials = (name) =>
  String(name || "VE")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const normalizeIds = (values) =>
  (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);

const sameIds = (left, right) =>
  JSON.stringify(normalizeIds(left)) === JSON.stringify(normalizeIds(right));

const CustomerAssignmentsPage = () => {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [savingSellerId, setSavingSellerId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ordersService.getSellerCustomerAssignments();
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron cargar las asignaciones");
        return;
      }

      const nextSellers = normalizeRows(response.data?.sellers);
      const nextCustomers = normalizeRows(response.data?.customers);
      setSellers(nextSellers);
      setCustomers(nextCustomers);
      setDrafts(
        nextSellers.reduce((acc, seller) => {
          acc[seller.id] = nextCustomers
            .filter(
              (customer) =>
                Number(customer.sales_agent_user_id || 0) === Number(seller.id)
            )
            .map((customer) => Number(customer.id));
          return acc;
        }, {})
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Error al cargar asignaciones"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSellers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sellers;
    return sellers.filter((seller) =>
      `${seller.full_name || ""} ${seller.username || ""} ${seller.email || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [search, sellers]);

  const assignedCount = customers.filter((customer) => customer.sales_agent_user_id).length;

  const savePortfolio = async (seller) => {
    setSavingSellerId(seller.id);
    try {
      const response = await ordersService.syncSellerCustomers(
        seller.id,
        normalizeIds(drafts[seller.id])
      );
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo actualizar la cartera");
        return;
      }
      toast.success(response.message);
      await loadData();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Error al actualizar la cartera"
      );
    } finally {
      setSavingSellerId(null);
    }
  };

  return (
    <FlowPageLayout
      title="Clientes por vendedor"
      subtitle="Administra la cartera de cada vendedor externo"
    >
      <Stack spacing={2.5}>
        <Alert severity="info">
          Selecciona en cada vendedor todos los clientes que deben pertenecerle. Al guardar,
          las reasignaciones y retiros se aplican juntos en una sola operacion.
        </Alert>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: "center" }}>
            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                label="Buscar vendedor"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Grid>
            <Grid item xs={6} md={2.5}>
              <Typography variant="caption" color="text.secondary">
                Vendedores activos
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {sellers.length}
              </Typography>
            </Grid>
            <Grid item xs={6} md={2.5}>
              <Typography variant="caption" color="text.secondary">
                Clientes asignados
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {assignedCount}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {loading ? <Alert severity="info">Cargando vendedores y clientes...</Alert> : null}
        {!loading && sellers.length === 0 ? (
          <Alert severity="warning">
            No hay usuarios activos con rol VENTAS.
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          {filteredSellers.map((seller) => {
            const selectedIds = normalizeIds(drafts[seller.id]);
            const originalIds = customers
              .filter(
                (customer) =>
                  Number(customer.sales_agent_user_id || 0) === Number(seller.id)
              )
              .map((customer) => Number(customer.id));
            const selectedCustomers = customers.filter((customer) =>
              selectedIds.includes(Number(customer.id))
            );
            const changed = !sameIds(selectedIds, originalIds);
            const saving = savingSellerId === seller.id;

            return (
              <Grid item xs={12} lg={6} key={seller.id}>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "secondary.main",
                          color: "secondary.contrastText",
                          fontWeight: 900,
                        }}
                      >
                        {getInitials(seller.full_name || seller.username)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }} noWrap>
                          {seller.full_name || seller.username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {seller.email || seller.username}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={selectedIds.length ? "success" : "default"}
                        label={`${selectedIds.length} cliente(s)`}
                        variant="outlined"
                      />
                    </Stack>

                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={customers}
                      value={selectedCustomers}
                      disabled={saving}
                      isOptionEqualToValue={(option, value) =>
                        Number(option.id) === Number(value.id)
                      }
                      getOptionLabel={(customer) => customer.name || "Cliente"}
                      onChange={(_, values) =>
                        setDrafts((current) => ({
                          ...current,
                          [seller.id]: values.map((customer) => Number(customer.id)),
                        }))
                      }
                      renderOption={(props, customer) => (
                        <Box component="li" {...props} key={customer.id}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {customer.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {customer.tax_id || "Sin identificacion"}
                              {customer.sales_agent_name &&
                              Number(customer.sales_agent_user_id) !== Number(seller.id)
                                ? ` | Actualmente: ${customer.sales_agent_name}`
                                : ""}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      renderTags={(values, getTagProps) =>
                        values.map((customer, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={customer.id}
                            label={customer.name}
                            size="small"
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Clientes asignados"
                          placeholder="Busca y selecciona clientes"
                        />
                      )}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      disabled={!changed || saving}
                      onClick={() => savePortfolio(seller)}
                      sx={{ minHeight: 48 }}
                    >
                      {saving ? "Guardando cartera..." : "Guardar clientes del vendedor"}
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {!loading && filteredSellers.length === 0 ? (
          <Alert severity="info">No hay vendedores que coincidan con la busqueda.</Alert>
        ) : null}
      </Stack>
    </FlowPageLayout>
  );
};

export default CustomerAssignmentsPage;
