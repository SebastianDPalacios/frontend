import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
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
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import FlowPageLayout from "views/modules/FlowPageLayout";

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

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await catalogService.getCustomers({ page: 1, pageSize: 20 });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el catalogo de clientes");
        return;
      }
      setItems(normalizeList(response.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Error de red al cargar clientes"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

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

        {!loading ? (
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
                    </TableRow>
                  );
                })}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography color="text.secondary">No hay clientes registrados.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Paper>
    </FlowPageLayout>
  );
};

export default CustomersPage;
