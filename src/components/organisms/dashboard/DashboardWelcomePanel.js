import Link from "next/link";
import { Box, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const DashboardWelcomePanel = ({ userLabel, canManageOrders, canManageProduction, canManageInventory }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: { xs: 3, md: 4 },
      p: { xs: 2, md: 3 },
      mb: 2.5,
      overflow: "hidden",
      position: "relative",
      bgcolor: "rgba(221, 91, 42, 0.04)",
      borderColor: "secondary.light",
    }}
  >
    <Box
      sx={{
        position: "absolute",
        right: { xs: -72, md: -48 },
        top: { xs: -76, md: -64 },
        width: { xs: 150, md: 180 },
        height: { xs: 150, md: 180 },
        borderRadius: "50%",
        bgcolor: "rgba(221, 91, 42, 0.12)",
      }}
    />
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ position: "relative", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: 27, sm: 30 }, overflowWrap: "anywhere" }}>
          Hola, {userLabel}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: 16, sm: 17 }, lineHeight: 1.45 }}>
          Empieza por lo urgente o abre una tarea frecuente.
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: { md: 440 }, justifyContent: "flex-end" }}>
        {canManageOrders ? (
          <AppButton component={Link} href="/orders/count" color="secondary" sx={{ minHeight: 48 }}>
            Crear pedido
          </AppButton>
        ) : null}
        {canManageProduction ? (
          <AppButton component={Link} href="/production/packaging" color="secondary" variant="outlined" sx={{ minHeight: 48 }}>
            Lotes y empaque
          </AppButton>
        ) : null}
        {canManageInventory ? (
          <AppButton component={Link} href="/inventory/overview" color="secondary" variant="outlined" sx={{ minHeight: 48 }}>
            Ver inventario
          </AppButton>
        ) : null}
      </Stack>
    </Stack>
  </Paper>
);

export default DashboardWelcomePanel;
