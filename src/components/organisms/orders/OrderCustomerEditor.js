import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, Stack, TextField, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";

const editableStatuses = ["draft", "confirmed", "ready", "dispatched", "delivered"];

const OrderCustomerEditor = ({ order, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const canEdit = editableStatuses.includes(order?.status) && Boolean(order?.sales_agent_user_id);

  const currentCustomer = useMemo(() => ({
    id: order?.customer_id,
    name: order?.customer_name,
    tax_id: order?.customer_identification,
    phone: order?.customer_phone,
    address: order?.customer_address,
    neighborhood: order?.customer_neighborhood,
  }), [order]);

  useEffect(() => {
    setEditing(false);
    setCustomers([]);
    setSelectedCustomer(null);
  }, [order?.id]);

  const startEditing = async () => {
    setEditing(true);
    setLoading(true);
    try {
      const response = await ordersService.getBaseData({
        onlyActive: 1,
        page: 1,
        pageSize: 200,
        salesAgentUserId: order.sales_agent_user_id,
      });
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron consultar los clientes del vendedor");
        setEditing(false);
        return;
      }
      const sellerCustomers = normalizeRows(response.data?.customers).filter(
        (customer) => String(customer.sales_agent_user_id) === String(order.sales_agent_user_id)
      );
      setCustomers(sellerCustomers);
      setSelectedCustomer(
        sellerCustomers.find((customer) => String(customer.id) === String(order.customer_id)) || currentCustomer
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al consultar clientes");
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const saveCustomer = async () => {
    if (!selectedCustomer?.id || saving) return;
    if (String(selectedCustomer.id) === String(order.customer_id)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const response = await ordersService.updateCustomer(order.id, Number(selectedCustomer.id));
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo cambiar el cliente");
        return;
      }
      toast.success(response.message || "Cliente actualizado");
      await onSaved(response.data?.customer || selectedCustomer);
      setEditing(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al cambiar el cliente");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h5" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
            {order?.customer_name || "Sin cliente"}
          </Typography>
          {canEdit ? (
            <Button size="small" color="secondary" startIcon={<EditOutlinedIcon />} onClick={startEditing}>
              Cambiar cliente
            </Button>
          ) : null}
        </Stack>
        <Typography color="text.secondary">
          {[order?.customer_phone, order?.customer_address, order?.customer_neighborhood].filter(Boolean).join(" · ") || "Sin datos de contacto"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Stack spacing={1.25}>
        <Autocomplete
          fullWidth
          loading={loading}
          options={customers}
          value={selectedCustomer}
          onChange={(_event, customer) => setSelectedCustomer(customer)}
          getOptionLabel={(customer) => getDisplayName(customer)}
          isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
          noOptionsText="Este vendedor no tiene clientes asignados"
          renderInput={(params) => <TextField {...params} size="small" label="Buscar cliente del vendedor" placeholder="Nombre, documento o teléfono" />}
          renderOption={(props, customer) => (
            <Box component="li" {...props} key={customer.id}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>{getDisplayName(customer)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[customer.tax_id, customer.phone, customer.neighborhood].filter(Boolean).join(" · ") || "Sin información adicional"}
                </Typography>
              </Box>
            </Box>
          )}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" color="secondary" onClick={saveCustomer} disabled={loading || saving || !selectedCustomer?.id}>
            {saving ? "Guardando..." : "Guardar cliente"}
          </Button>
          <Button color="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default OrderCustomerEditor;
