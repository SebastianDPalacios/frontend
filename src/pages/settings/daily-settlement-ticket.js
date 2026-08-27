import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, FormControlLabel, Grid, Stack, Switch, TextField, Typography } from "@mui/material";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import toast from "react-hot-toast";
import AppCard from "@core/components/ui/AppCard";
import SectionHeader from "components/atoms/SectionHeader";
import settingsService from "services/settings/settings-service";
import FlowPageLayout from "views/modules/FlowPageLayout";

const defaultValues = {
  pageWidthMm: 80,
  pageMarginMm: 3,
  bodyWidthMm: 74,
  bodyFontSize: 10.5,
  titleFontSize: 20,
  metaFontSize: 12,
  customerFontSize: 11.5,
  mutedFontSize: 10,
  totalsFontSize: 11.5,
  deliverFontSize: 15,
  footerFontSize: 9,
  showOrderGrossSale: true,
  showOrderCreditApplied: true,
  showOrderCollectedSale: true,
  showOrderExchange: true,
  showGrossSale: true,
  showCreditApplied: true,
  showCollectedSale: true,
  showReturns: true,
  showCreditGenerated: true,
  showGifts: true,
  showCommission: true,
};

const fields = [
  ["pageWidthMm", "Ancho papel (mm)", 58, 120, 1],
  ["pageMarginMm", "Margen (mm)", 0, 10, 0.5],
  ["bodyWidthMm", "Ancho contenido (mm)", 38, 110, 1],
  ["bodyFontSize", "Texto general", 8, 18, 0.5],
  ["titleFontSize", "Titulo", 14, 32, 1],
  ["metaFontSize", "Datos principales", 9, 20, 0.5],
  ["customerFontSize", "Cliente", 9, 22, 0.5],
  ["mutedFontSize", "Texto secundario", 8, 16, 0.5],
  ["totalsFontSize", "Totales", 9, 20, 0.5],
  ["deliverFontSize", "Valor a entregar", 12, 28, 1],
  ["footerFontSize", "Pie de cierre", 7, 14, 0.5],
];

const visibilityFields = [
  ["showGrossSale", "Venta bruta"],
  ["showCreditApplied", "Saldo aplicado"],
  ["showCollectedSale", "Venta cobrada"],
  ["showReturns", "Cambios"],
  ["showCreditGenerated", "Saldo generado"],
  ["showGifts", "Obsequios"],
  ["showCommission", "Comision"],
];

const orderVisibilityFields = [
  ["showOrderGrossSale", "Venta bruta por pedido"],
  ["showOrderCreditApplied", "Saldo aplicado por pedido"],
  ["showOrderCollectedSale", "Venta cobrada por pedido"],
  ["showOrderExchange", "Cambio entregado por pedido"],
];

const numericValue = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const EditorPanel = ({ title, subtitle, children }) => (
  <Box sx={{
    px: { xs: 2, sm: 3 },
    py: { xs: 2.25, sm: 3 },
    border: "1px solid",
    borderColor: "rgba(17, 24, 39, 0.08)",
    borderRadius: 3,
    bgcolor: "#fff",
    boxShadow: "0 12px 30px rgba(17, 24, 39, 0.04)",
    minWidth: 0,
    "& .MuiFormControl-root": { minWidth: 0 },
    "& .MuiInputBase-root": { boxSizing: "border-box" },
  }}>
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 900, mb: 0.25 }}>{title}</Typography>
        {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
      </Box>
      {children}
    </Stack>
  </Box>
);

const SettlementTicketPreview = ({ values }) => {
  const print = Object.keys(defaultValues).reduce((result, key) => ({
    ...result,
    [key]: numericValue(values[key], defaultValues[key]),
  }), {});
  const contentWidth = Math.min(print.bodyWidthMm, Math.max(38, print.pageWidthMm - (print.pageMarginMm * 2)));

  return (
      <Box sx={{ overflowX: "auto", pb: 1, px: 1 }}>
        <Box
          sx={{
            width: `${print.pageWidthMm}mm`,
            minHeight: 520,
            mx: "auto",
            p: `${print.pageMarginMm}mm`,
            bgcolor: "#fff",
            color: "#111",
            boxShadow: "0 8px 28px rgba(17, 24, 39, 0.14)",
          }}
        >
          <Box sx={{ width: `${contentWidth}mm`, maxWidth: "100%", mx: "auto", fontFamily: "Arial, sans-serif", fontSize: `${print.bodyFontSize}px` }}>
            <Box component="h1" sx={{ m: 0, textAlign: "center", fontSize: `${print.titleFontSize}px`, textTransform: "uppercase" }}>
              Panaderia
            </Box>
            <Box sx={{ mt: "3px", textAlign: "center", fontWeight: 800, fontSize: `${print.metaFontSize}px` }}>
              LIQUIDACION DIARIA
            </Box>
            <Box sx={{ my: "7px", borderTop: "1px dashed #111" }} />
            <Box sx={{ display: "grid", gap: "3px", fontSize: `${print.metaFontSize}px` }}>
              <Box component="strong" sx={{ fontSize: `${print.metaFontSize + 0.5}px` }}>VENDEDOR DE EJEMPLO</Box>
              <span>Fecha: 2026-08-03</span>
              <span>Pedidos entregados: 2</span>
            </Box>
            <Box sx={{ my: "7px", borderTop: "1px dashed #111" }} />
            {[
              ["Cliente principal", "$ 42.000", "$ 45.000", "$ 3.000"],
              ["Cliente secundario", "$ 28.000", "$ 28.000", "$ 0"],
            ].map(([customer, collected, gross, credit], index) => (
              <Box key={customer} sx={{ py: "5px", borderBottom: "1px dashed #777" }}>
                <Box sx={{ fontSize: `${print.customerFontSize}px`, fontWeight: 900 }}>{customer}</Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: "2px" }}>
                  <span>Pedido #{index + 1}</span><strong>{collected}</strong>
                </Box>
                {print.showOrderGrossSale ? <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: "2px", color: "#444", fontSize: `${print.mutedFontSize}px` }}>
                  <span>Venta bruta</span><span>{gross}</span>
                </Box> : null}
                {print.showOrderCreditApplied ? <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: "2px", color: "#444", fontSize: `${print.mutedFontSize}px` }}>
                  <span>Saldo aplicado</span><span>-{credit}</span>
                </Box> : null}
                {print.showOrderCollectedSale ? <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: "2px", color: "#444", fontSize: `${print.mutedFontSize}px` }}>
                  <span>Venta cobrada</span><span>{collected}</span>
                </Box> : null}
                {print.showOrderExchange && index === 0 ? <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: "2px", color: "#444", fontSize: `${print.mutedFontSize}px` }}>
                  <span>Cambio entregado</span><span>$ 5.000</span>
                </Box> : null}
              </Box>
            ))}
            <Box sx={{ my: "7px", borderTop: "1px dashed #111" }} />
            <Box component="strong">OBSEQUIOS REGISTRADOS</Box>
            <Box sx={{ py: "5px", borderBottom: "1px dashed #777" }}>
              <Box sx={{ fontSize: `${print.customerFontSize}px`, fontWeight: 900 }}>Cliente principal</Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: "2px" }}>
                <span>Pan de ejemplo x 2</span><strong>$ 2.000</strong>
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 10px", mt: "8px", fontSize: `${print.totalsFontSize}px` }}>
              {print.showGrossSale ? <><span>VENTA BRUTA</span><strong>$ 73.000</strong></> : null}
              {print.showCreditApplied ? <><span>SALDO APLICADO</span><strong>-$ 3.000</strong></> : null}
              {print.showCollectedSale ? <><span>VENTA COBRADA</span><strong>$ 70.000</strong></> : null}
              {print.showReturns ? <><span>CAMBIOS</span><strong>$ 5.000</strong></> : null}
              {print.showCreditGenerated ? <><span>SALDO GENERADO</span><strong>$ 5.000</strong></> : null}
              {print.showGifts ? <><span>OBSEQUIOS</span><strong>$ 2.000</strong></> : null}
              {print.showCommission ? <><span>COMISION</span><strong>$ 3.500</strong></> : null}
              <Box sx={{ pt: "5px", borderTop: "2px solid #111", fontSize: `${print.deliverFontSize}px`, fontWeight: 900 }}>ENTREGAR</Box>
              <Box sx={{ pt: "5px", borderTop: "2px solid #111", fontSize: `${print.deliverFontSize}px`, fontWeight: 900 }}>$ 66.500</Box>
            </Box>
            <Box sx={{ mt: "9px", textAlign: "center", fontSize: `${print.footerFontSize}px` }}>Generado: 03/08/2026, 2:30 p. m.</Box>
          </Box>
        </Box>
      </Box>
  );
};

const DailySettlementTicketSettingsPage = () => {
  const [values, setValues] = useState(defaultValues);
  const [ticketSettings, setTicketSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await settingsService.getPosTicketSettings();
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar la configuracion");
        return;
      }
      setTicketSettings(response.data || {});
      setValues({ ...defaultValues, ...(response.data?.settlementPrint || {}) });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudo cargar la configuracion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await settingsService.updatePosTicketSettings({
        ...(ticketSettings || {}),
        settlementPrint: values,
      });
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo guardar la configuracion");
        return;
      }
      setTicketSettings(response.data || {});
      setValues({ ...defaultValues, ...(response.data?.settlementPrint || {}) });
      toast.success("Ticket de liquidacion actualizado");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "No se pudo guardar la configuracion");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FlowPageLayout title="Ticket de liquidacion" subtitle="Configura la impresion del cierre diario.">
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 280 }}><CircularProgress color="secondary" /></Box>
      </FlowPageLayout>
    );
  }

  return (
    <FlowPageLayout title="Ticket de liquidacion diaria" subtitle="Edita tamaños y elementos visibles del cierre diario.">
      <AppCard variant="outlined" contentSx={{ p: { xs: 2.25, sm: 3 } }} sx={{
        mb: 3,
        borderColor: "rgba(219, 91, 39, 0.22)",
        background: "linear-gradient(135deg, rgba(219, 91, 39, 0.10), rgba(255,255,255,0.96) 46%, rgba(17,24,39,0.04))",
      }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}>
          <Box>
            <Typography variant="h5" sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 900, mb: 0.75 }}>Editor visual del cierre diario</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
              Ajusta el ticket con vista previa antes de imprimir: papel, tamaños y contenido sin tocar codigo.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {[`${values.pageWidthMm || 80} mm`, "Vista previa", "Contenido configurable"].map((label) => (
              <Box key={label} sx={{ px: 1.5, py: 0.75, borderRadius: 999, bgcolor: "background.paper", border: "1px solid", borderColor: "rgba(219, 91, 39, 0.25)", color: "secondary.main", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" }}>{label}</Box>
            ))}
          </Stack>
        </Stack>
      </AppCard>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <AppCard variant="outlined" contentSx={{ p: { xs: 2, sm: 2.5 } }} sx={{ bgcolor: "#fbfafc", borderColor: "rgba(17, 24, 39, 0.10)" }}>
            <Stack component="form" spacing={3} onSubmit={saveSettings}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
                <SectionHeader title="Contenido del ticket" subtitle="Los cambios se aplicaran a las proximas impresiones." />
                <Stack direction="row" spacing={1}>
                  <Button color="inherit" startIcon={<RestartAltRoundedIcon />} onClick={() => setValues(defaultValues)}>Restablecer</Button>
                  <Button type="submit" variant="contained" color="secondary" startIcon={<SaveRoundedIcon />} disabled={saving || Boolean(error)} sx={{ minWidth: 150 }}>
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </Stack>
              </Stack>
              {error ? <Alert severity="error">{error}</Alert> : null}

              <EditorPanel title="Papel y contenido" subtitle="Define el formato fisico del rollo y el ancho util de impresion.">
                <Grid container spacing={2}>
                  {fields.slice(0, 3).map(([name, label, min, max, step]) => (
                    <Grid item xs={12} sm={6} md={4} key={name}>
                      <TextField fullWidth type="number" label={label} value={values[name]} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} inputProps={{ min, max, step }} />
                    </Grid>
                  ))}
                </Grid>
              </EditorPanel>

              <EditorPanel title="Tamanos de letra" subtitle="Ajusta cada zona del ticket en pixeles para mantener la lectura clara.">
                <Grid container spacing={2}>
                  {fields.slice(3).map(([name, label, min, max, step]) => (
                    <Grid item xs={12} sm={6} md={4} key={name}>
                      <TextField fullWidth type="number" label={label} value={values[name]} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} inputProps={{ min, max, step }} />
                    </Grid>
                  ))}
                </Grid>
              </EditorPanel>

              <EditorPanel title="Elementos visibles del resumen" subtitle="Elige que conceptos apareceran antes del valor final a entregar.">
                <Grid container spacing={1}>
                  {visibilityFields.map(([name, label]) => (
                    <Grid item xs={12} sm={6} key={name}>
                      <FormControlLabel control={<Switch checked={Boolean(values[name])} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.checked }))} />} label={`Mostrar ${label.toLowerCase()}`} />
                    </Grid>
                  ))}
                </Grid>
              </EditorPanel>

              <EditorPanel title="Detalle visible de cada pedido" subtitle="Elige que valores se muestran debajo de cada cliente y pedido.">
                <Grid container spacing={1}>
                  {orderVisibilityFields.map(([name, label]) => (
                    <Grid item xs={12} sm={6} key={name}>
                      <FormControlLabel control={<Switch checked={Boolean(values[name])} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.checked }))} />} label={`Mostrar ${label.toLowerCase()}`} />
                    </Grid>
                  ))}
                </Grid>
              </EditorPanel>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit" variant="contained" color="secondary" startIcon={<SaveRoundedIcon />} disabled={saving || Boolean(error)} sx={{ minWidth: 190 }}>
                  {saving ? "Guardando..." : "Guardar ticket"}
                </Button>
              </Box>
            </Stack>
          </AppCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <AppCard variant="outlined" contentSx={{ p: { xs: 2, sm: 2.5 } }} sx={{ position: { lg: "sticky" }, top: { lg: 88 }, bgcolor: "#111827", borderColor: "rgba(17, 24, 39, 0.18)" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Vista previa</Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>Referencia visual. La impresion real conserva el ancho configurado.</Typography>
              </Box>
              <Box sx={{ py: 2.5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <SettlementTicketPreview values={values} />
              </Box>
            </Stack>
          </AppCard>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default DailySettlementTicketSettingsPage;
