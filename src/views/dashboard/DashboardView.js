import { Grid, Typography } from "@mui/material";
import Link from "next/link";
import AppCard from "@core/components/ui/AppCard";
import AppButton from "@core/components/ui/AppButton";

const StatCard = ({ title, value }) => (
  <AppCard>
    <Typography color="text.secondary" variant="body2">
      {title}
    </Typography>
    <Typography variant="h5" sx={{ mt: 1, fontSize: { xs: 24, sm: 28 } }}>
      {value}
    </Typography>
  </AppCard>
);

const DashboardView = ({ stats }) => {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard title="Usuarios" value={stats.users} />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard title="Clientes" value={stats.customers} />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard title="Productos" value={stats.products} />
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <AppCard>
          <Typography variant="h6">Catalogos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Gestion de productos, materias, clientes y repartidores.
          </Typography>
          <AppButton component={Link} href="/catalog/products" color="secondary" sx={{ width: { xs: "100%", sm: "auto" } }}>
            Ir a Catalogos
          </AppButton>
        </AppCard>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <AppCard>
          <Typography variant="h6">Pedidos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Flujo base del dia para pedidos y distribucion.
          </Typography>
          <AppButton component={Link} href="/orders/day" color="secondary" sx={{ width: { xs: "100%", sm: "auto" } }}>
            Ir a Pedidos
          </AppButton>
        </AppCard>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <AppCard>
          <Typography variant="h6">Produccion</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Base de productos e insumos para produccion diaria.
          </Typography>
          <AppButton component={Link} href="/production/day" color="secondary" sx={{ width: { xs: "100%", sm: "auto" } }}>
            Ir a Produccion
          </AppButton>
        </AppCard>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <AppCard>
          <Typography variant="h6">Inventario</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Base de sucursales, productos y materias para inventario.
          </Typography>
          <AppButton component={Link} href="/inventory/overview" color="secondary" sx={{ width: { xs: "100%", sm: "auto" } }}>
            Ir a Inventario
          </AppButton>
        </AppCard>
      </Grid>
    </Grid>
  );
};

export default DashboardView;
