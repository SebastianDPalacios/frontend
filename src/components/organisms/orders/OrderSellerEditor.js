import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, Stack, TextField, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";

const editableStatuses = ["draft", "confirmed", "ready", "dispatched", "delivered"];

const OrderSellerEditor = ({ order, canEdit, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const isEditable = canEdit && editableStatuses.includes(order?.status);

  const currentSeller = useMemo(() => ({
    id: order?.sales_agent_user_id,
    full_name: order?.sales_agent_name,
  }), [order?.sales_agent_name, order?.sales_agent_user_id]);

  useEffect(() => {
    setEditing(false);
    setSellers([]);
    setCustomers([]);
    setSelectedSeller(null);
    setSelectedCustomer(null);
  }, [order?.id]);

  const loadCustomers = async (seller, preserveCurrent = false) => {
    if (!seller?.id) {
      setCustomers([]);
      setSelectedCustomer(null);
      return;
    }
    setCustomersLoading(true);
    try {
      const response = await ordersService.getBaseData({
        onlyActive: 1,
        page: 1,
        pageSize: 200,
        salesAgentUserId: seller.id,
      });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudieron consultar los clientes");
      const rows = normalizeRows(response.data?.customers);
      setCustomers(rows);
      const current = preserveCurrent
        ? rows.find((customer) => String(customer.id) === String(order.customer_id))
        : null;
      setSelectedCustomer(current || null);
    } catch (error) {
      setCustomers([]);
      setSelectedCustomer(null);
      toast.error(error?.response?.data?.message || error?.message || "Error al consultar clientes");
    } finally {
      setCustomersLoading(false);
    }
  };

  const startEditing = async () => {
    setEditing(true);
    setLoading(true);
    try {
      const response = await ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 200 });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudieron consultar los vendedores");
      const rows = normalizeRows(response.data?.sellers);
      setSellers(rows);
      const seller = rows.find((item) => String(item.id) === String(order.sales_agent_user_id)) || currentSeller;
      setSelectedSeller(seller);
      await loadCustomers(seller, true);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al consultar vendedores");
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const saveSeller = async () => {
    if (!selectedSeller?.id || !selectedCustomer?.id || saving) return;
    setSaving(true);
    try {
      const response = await ordersService.updateSeller(order.id, Number(selectedSeller.id), Number(selectedCustomer.id));
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo cambiar el vendedor");
        return;
      }
      toast.success(response.message || "Vendedor y cliente actualizados");
      await onSaved(response.data);
      setEditing(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al cambiar el vendedor");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">Vendedor</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          <Typography variant="h5" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>{order?.sales_agent_name || "Sin vendedor"}</Typography>
          {isEditable ? (
            <Button size="small" color="secondary" startIcon={<EditOutlinedIcon />} onClick={startEditing}>
              Cambiar vendedor y cliente
            </Button>
          ) : null}
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      <Autocomplete
        fullWidth
        size="small"
        loading={loading}
        options={sellers}
        value={selectedSeller}
        onChange={async (_event, seller) => {
          setSelectedSeller(seller);
          await loadCustomers(seller, true);
        }}
        getOptionLabel={(seller) => getDisplayName(seller)}
        isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
        renderInput={(params) => <TextField {...params} label="Vendedor" placeholder="Buscar vendedor" />}
      />
      <Autocomplete
        fullWidth
        size="small"
        disabled={!selectedSeller?.id}
        loading={customersLoading}
        options={customers}
        value={selectedCustomer}
        onChange={(_event, customer) => setSelectedCustomer(customer)}
        getOptionLabel={(customer) => getDisplayName(customer)}
        isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
        noOptionsText={selectedSeller?.id ? "Este vendedor no tiene clientes asignados" : "Selecciona primero un vendedor"}
        renderInput={(params) => <TextField {...params} label="Cliente del vendedor" placeholder="Buscar cliente" />}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button variant="contained" color="secondary" onClick={saveSeller} disabled={loading || customersLoading || saving || !selectedCustomer?.id}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button color="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
      </Stack>
    </Stack>
  );
};

export default OrderSellerEditor;
