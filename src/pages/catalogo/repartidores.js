import { useCallback, useEffect, useState } from "react";
import { Alert, Stack, Switch, Typography } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";

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

  const columns = [
    { key: "code", label: "Codigo" },
    { key: "name", label: "Ruta" },
    { key: "description", label: "Descripcion" },
    {
      key: "is_active",
      label: "Estado",
      render: (row) => {
        const isActive = Number(row.is_active) === 1;

        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Switch
              checked={isActive}
              disabled={pendingRouteId === row.id}
              onChange={() => handleToggleRouteStatus(row)}
              size="small"
            />
            <Typography variant="body2">{isActive ? "Activa" : "Inactiva"}</Typography>
          </Stack>
        );
      },
    },
    {
      key: "current_driver_name",
      label: "Repartidor vigente",
      render: (row) => row.current_driver_name || "Sin asignar",
    },
  ];

  return (
    <FlowPageLayout title="Rutas" subtitle="Rutas y repartidores operativos">
      {info ? <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert> : null}
      <FlowTableCard
        title="Listado de rutas"
        loading={loading}
        error={error}
        columns={columns}
        rows={items}
        emptyMessage="No hay rutas registradas."
      />
    </FlowPageLayout>
  );
};

export default RoutesPage;
