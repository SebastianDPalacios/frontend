import Link from "next/link";
import { Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const InventoryQuickActions = () => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Accesos rapidos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Operaciones frecuentes de inventario.
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "flex-end" }}>
        <AppButton component={Link} href="/inventory/movements" color="secondary">
          Registrar movimiento
        </AppButton>
        <AppButton component={Link} href="/inventory/purchase-orders" color="secondary" variant="outlined">
          Compras y recepciones
        </AppButton>
        <AppButton component={Link} href="/inventory/raw-materials" color="secondary" variant="outlined">
          Materias primas
        </AppButton>
        <AppButton component={Link} href="/inventory/products" color="secondary" variant="outlined">
          Productos
        </AppButton>
      </Stack>
    </Stack>
  </Paper>
);

export default InventoryQuickActions;
