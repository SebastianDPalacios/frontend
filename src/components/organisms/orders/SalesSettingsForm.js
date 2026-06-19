import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Grid, Stack } from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import toast from "react-hot-toast";
import AppCard from "@core/components/ui/AppCard";
import ColombianCurrencyField from "components/atoms/ColombianCurrencyField";
import PercentageField from "components/atoms/PercentageField";
import SectionHeader from "components/atoms/SectionHeader";
import SalesRulesSummary from "components/molecules/SalesRulesSummary";
import ordersService from "services/orders/orders-service";

const initialValues = {
  bonus_percent: "20",
  bonus_minimum_amount: "2000",
  external_seller_commission_percent: "15",
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const SalesSettingsForm = () => {
  const [values, setValues] = useState(initialValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await ordersService.getSalesSettings();
      if (response?.code !== 1 || !response?.data) {
        setError(response?.message || "No se pudieron cargar las reglas de venta");
        return;
      }

      setValues({
        bonus_percent: String(response.data.bonus_percent ?? 20),
        bonus_minimum_amount: String(response.data.bonus_minimum_amount ?? 2000),
        external_seller_commission_percent: String(
          response.data.external_seller_commission_percent ?? 15
        ),
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar las reglas de venta"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const bonusPercent = Number(values.bonus_percent);
    const bonusMinimum = Number(values.bonus_minimum_amount);
    const commissionPercent = Number(values.external_seller_commission_percent);

    if (!Number.isFinite(bonusPercent) || bonusPercent < 0 || bonusPercent > 100) {
      return "El porcentaje de vendaje debe estar entre 0 y 100";
    }
    if (!Number.isFinite(bonusMinimum) || bonusMinimum < 0) {
      return "La compra mínima para vendaje no puede ser negativa";
    }
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
      return "La comisión debe estar entre 0 y 100";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const response = await ordersService.updateSalesSettings({
        bonus_percent: Number(values.bonus_percent),
        bonus_minimum_amount: Number(values.bonus_minimum_amount),
        external_seller_commission_percent: Number(values.external_seller_commission_percent),
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudieron guardar las reglas");
        return;
      }

      toast.success("Reglas de venta actualizadas");
      await loadSettings();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Error de red al guardar las reglas"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 260 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <AppCard variant="outlined">
      <Stack component="form" spacing={3} onSubmit={handleSubmit}>
        <SectionHeader
          title="Parámetros comerciales"
          subtitle="Los pedidos nuevos guardarán una copia de estas reglas para conservar su cálculo histórico."
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Stack spacing={2.5}>
              <PercentageField
                label="Porcentaje de vendaje"
                name="bonus_percent"
                value={values.bonus_percent}
                onChange={handleChange}
                helperText="Porcentaje máximo que podrá obsequiarse como vendaje."
                required
              />
              <ColombianCurrencyField
                label="Compra mínima para vendaje"
                name="bonus_minimum_amount"
                value={values.bonus_minimum_amount}
                onChange={handleChange}
                helperText="El vendaje estará disponible desde este valor, inclusive."
                required
              />
              <PercentageField
                label="Comisión de vendedor externo"
                name="external_seller_commission_percent"
                value={values.external_seller_commission_percent}
                onChange={handleChange}
                helperText="Se aplicará al resumen de ventas del vendedor externo."
                required
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <SalesRulesSummary
              bonusPercent={values.bonus_percent}
              bonusMinimumAmount={values.bonus_minimum_amount}
              commissionPercent={values.external_seller_commission_percent}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            startIcon={<SaveRoundedIcon />}
            disabled={saving || Boolean(error)}
            sx={{ minWidth: 180 }}
          >
            {saving ? "Guardando..." : "Guardar reglas"}
          </Button>
        </Box>
      </Stack>
    </AppCard>
  );
};

export default SalesSettingsForm;
