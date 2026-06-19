import { Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const PurchaseEntryIntro = ({ loading, onOpenInvoice }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Registrar factura
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Guarda la factura del proveedor y suma los productos comprados al inventario.
        </Typography>
      </Stack>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: "action.hover" }}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 800 }}>Cuando usarla</Typography>
          <Typography variant="body2" color="text.secondary">
            Cuando necesitas sumar inventario de inmediato sin crear una OC previa.
          </Typography>
        </Stack>
      </Paper>
      <Stack sx={{ mt: "auto", alignItems: "flex-start" }}>
        <AppButton color="secondary" onClick={onOpenInvoice} disabled={loading}>
          Registrar factura
        </AppButton>
      </Stack>
    </Stack>
  </Paper>
);

export default PurchaseEntryIntro;
