import Link from "next/link";
import { Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardWelcomePanel = ({ userLabel, canManageOrders, canManageProduction, canManageInventory }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 2.5 }, mb: 3 }}>
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
    >
      <Stack spacing={0.25}>
        <Typography sx={{ fontWeight: 900 }}>Hola, {userLabel}</Typography>
        <Typography variant="body2" color="text.secondary">
          Elige una tarea o revisa los pendientes importantes.
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {canManageOrders ? (
          <AppButton component={Link} href="/orders/count" color="secondary">
            Crear pedido
          </AppButton>
        ) : null}
        {canManageProduction ? (
          <AppButton component={Link} href="/production/packaging" color="secondary" variant="outlined">
            Lotes y empaque
          </AppButton>
        ) : null}
        {canManageInventory ? (
          <AppButton component={Link} href="/inventory/overview" color="secondary" variant="outlined">
            Ver inventario
          </AppButton>
        ) : null}
      </Stack>
    </Stack>
  </Paper>
);

export default DashboardWelcomePanel;
