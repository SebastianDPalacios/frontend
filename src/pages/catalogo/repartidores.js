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

const getInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "RT";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const RoutesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [pendingRouteId, setPendingRouteId] = useState(null);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setInfo(null);
    setError(null);
    try {
      const response = await catalogService.getRoutes({ onlyActive: 0 });
      if (response?.code !== 1) {
        if (response?.code === 0) {
          setInfo(response?.message || "Catalogo de repartidores no disponible en esta version");
          setItems([]);
          return;
        }

        setError(response?.message || "No se pudo cargar el catalogo de repartidores");
        return;
      }
      setItems(normalizeList(response.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Error de red al cargar repartidores"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const handleToggleRouteStatus = async (route) => {
    const isActive = Number(route.is_active) === 1;
    const nextStatus = isActive ? 0 : 1;

    setPendingRouteId(route.id);
    try {
      const response = await catalogService.setRouteStatus(route.id, {
        p_is_active: nextStatus,
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo actualizar la ruta");
        return;
      }

      toast.success(nextStatus === 1 ? "Ruta activada" : "Ruta inactivada");
      await loadRoutes();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Error de red al actualizar la ruta"));
    } finally {
      setPendingRouteId(null);
    }
  };

  return (
    <FlowPageLayout title="Rutas" subtitle="Rutas y repartidores operativos">
      {info ? <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert> : null}
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
              Listado de rutas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {loading ? "Cargando rutas..." : `${items.length} ruta(s) registradas`}
            </Typography>
          </Box>
          <Chip label="Distribucion" color="secondary" variant="outlined" sx={{ fontWeight: 800 }} />
        </Stack>

        {loading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: { xs: 2, md: 3 }, py: 3 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">
              Cargando rutas...
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
            <Table sx={{ minWidth: 840 }}>
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
                  <TableCell>Ruta</TableCell>
                  <TableCell>Repartidor vigente</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((route, index) => {
                  const isActive = Number(route.is_active) === 1;
                  const isPending = pendingRouteId === route.id;
                  const driverName = route.current_driver_name || "Sin asignar";

                  return (
                    <TableRow
                      key={route.id ?? route.code ?? index}
                      sx={{
                        "&:last-child td": { borderBottom: 0 },
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: "secondary.light",
                              color: "secondary.contrastText",
                              fontSize: 14,
                              fontWeight: 900,
                            }}
                          >
                            {getInitials(route.name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                              <Typography sx={{ fontWeight: 850 }}>{route.name || "Sin nombre"}</Typography>
                              <Chip label={route.code || "Sin codigo"} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {route.description || "Sin descripcion registrada"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography sx={{ fontWeight: route.current_driver_name ? 700 : 500 }}>
                            {driverName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Repartidor asignado actualmente
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Chip
                            label={isActive ? "Activa" : "Inactiva"}
                            color={isActive ? "success" : "default"}
                            variant={isActive ? "outlined" : "filled"}
                            size="small"
                            sx={{ minWidth: 82, fontWeight: 800 }}
                          />
                          <Switch
                            checked={isActive}
                            disabled={isPending}
                            onChange={() => handleToggleRouteStatus(route)}
                            size="small"
                          />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography color="text.secondary">No hay rutas registradas.</Typography>
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

export default RoutesPage;
