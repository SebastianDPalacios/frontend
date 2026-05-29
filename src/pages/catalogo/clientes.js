import { useCallback, useEffect, useState } from "react";
import { Stack, Switch, Typography } from "@mui/material";
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

  const columns = [
    { key: "tax_id", label: "Identificacion" },
    { key: "name", label: "Cliente" },
    { key: "email", label: "Correo" },
    { key: "phone", label: "Telefono" },
    {
      key: "status",
      label: "Estado",
      render: (row) => {
        const isActive = row.status === "active";

        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Switch
              checked={isActive}
              disabled={pendingCustomerId === row.id}
              onChange={() => handleToggleCustomerStatus(row)}
              size="small"
            />
            <Typography variant="body2">{isActive ? "Activo" : "Inactivo"}</Typography>
          </Stack>
        );
      },
    },
    { key: "credit_limit", label: "Credito" },
  ];

  return (
    <FlowPageLayout title="Clientes" subtitle="Listado operativo de clientes">
      <FlowTableCard
        title="Listado de clientes"
        loading={loading}
        error={error}
        columns={columns}
        rows={items}
        emptyMessage="No hay clientes registrados."
      />
    </FlowPageLayout>
  );
};

export default CustomersPage;
