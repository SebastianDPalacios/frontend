import { Box, Grid, Typography, Avatar, Stack, Button, Chip, Paper, useTheme } from "@mui/material";
import Link from "next/link";
import PeopleIcon from "@mui/icons-material/People";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AppButton from "@core/components/ui/AppButton";

const hasPermission = (user, permission) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || permissions.includes(permission);
};

const getUserLabel = (user) => user?.full_name || user?.username || "Usuario";

const StatCard = ({ title, value, helper, icon, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Avatar sx={{ bgcolor: `${color}.main`, width: 46, height: 46 }}>{icon}</Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 900 }}>
          {value ?? "-"}
        </Typography>
        {helper ? (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  </Paper>
);

const ActionTile = ({ title, description, href, icon, label = "Abrir", primary = false }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: 2,
      height: "100%",
      transition: "border-color 160ms ease, box-shadow 160ms ease",
      "&:hover": {
        borderColor: "secondary.main",
        boxShadow: "0 12px 26px rgba(13, 21, 37, 0.08)",
      },
    }}
  >
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Avatar sx={{ bgcolor: primary ? "secondary.main" : "action.hover", color: primary ? "common.white" : "text.primary", width: 40, height: 40 }}>
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ flex: 1 }} />
      <Button component={Link} href={href} color="secondary" variant={primary ? "contained" : "outlined"} sx={{ alignSelf: "flex-start" }}>
        {label}
      </Button>
    </Stack>
  </Paper>
);

const RoleSection = ({ title, subtitle, badge, actions }) => {
  if (actions.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <Chip label={badge} variant="outlined" />
      </Stack>
      <Grid container spacing={2}>
        {actions.map((action) => (
          <Grid item xs={12} sm={6} lg={3} key={action.href}>
            <ActionTile {...action} />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

const SignalCard = ({ title, value, helper, href, label, color = "info", icon }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%", borderColor: `${color}.main` }}>
    <Stack spacing={1.5} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 38, height: 38 }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {helper}
      </Typography>
      <Button component={Link} href={href} color="secondary" variant="outlined" sx={{ alignSelf: "flex-start" }}>
        {label}
      </Button>
    </Stack>
  </Paper>
);

const DashboardView = ({ stats = {}, insights = {}, currentUser = null }) => {
  const theme = useTheme();
  const canManageUsers = hasPermission(currentUser, "users.manage");
  const canManageRoles = hasPermission(currentUser, "roles.manage");
  const canManageCustomers = hasPermission(currentUser, "customers.manage");
  const canManageRoutes = hasPermission(currentUser, "routes.manage");
  const canManageProducts = hasPermission(currentUser, "products.manage");
  const canManageMaterials = hasPermission(currentUser, "materials.manage");
  const canManageRecipes = hasPermission(currentUser, "recipes.manage");
  const canManageOrders = hasPermission(currentUser, "orders.manage");
  const canManageProduction = hasPermission(currentUser, "production.manage");
  const canManageInventory = hasPermission(currentUser, "inventory.manage");

  const salesActions = [
    canManageOrders
      ? { title: "Crear pedido", description: "Captura pedido por cliente, ruta y productos.", href: "/orders/count", label: "Crear", icon: <ShoppingCartIcon />, primary: true }
      : null,
    canManageOrders
      ? { title: "Gestionar pedidos", description: "Confirma, crea produccion, despacha o cancela.", href: "/orders/history", label: "Gestionar", icon: <ReceiptLongIcon /> }
      : null,
    canManageCustomers
      ? { title: "Clientes", description: "Consulta, crea y actualiza clientes activos.", href: "/catalogo/clientes", label: "Ver clientes", icon: <StorefrontIcon /> }
      : null,
    canManageRoutes
      ? { title: "Rutas", description: "Administra rutas y asignacion de repartidores.", href: "/catalogo/repartidores", label: "Ver rutas", icon: <LocalShippingIcon /> }
      : null,
  ].filter(Boolean);

  const productionActions = [
    canManageProduction
      ? { title: "Ordenes", description: "Planifica, ajusta y cierra ordenes de produccion.", href: "/production/orders", label: "Ver ordenes", icon: <FactCheckIcon />, primary: true }
      : null,
    canManageProduction
      ? { title: "Registrar avance", description: "Carga produccion por producto y controla faltantes.", href: "/production/register", label: "Registrar", icon: <SyncAltIcon /> }
      : null,
    canManageProduction
      ? { title: "Resumen del dia", description: "Revisa avance operativo de produccion.", href: "/production/day", label: "Ver resumen", icon: <ReceiptLongIcon /> }
      : null,
    canManageRecipes
      ? { title: "Recetas", description: "Define recetas activas para habilitar produccion.", href: "/recipes/new", label: "Crear receta", icon: <RestaurantMenuIcon /> }
      : null,
  ].filter(Boolean);

  const inventoryActions = [
    canManageInventory
      ? { title: "Stock", description: "Consulta existencias y productos criticos.", href: "/inventory/overview", label: "Ver stock", icon: <WarehouseIcon />, primary: true }
      : null,
    canManageInventory
      ? { title: "Movimientos", description: "Registra entradas, salidas y ajustes manuales.", href: "/inventory/movements", label: "Mover stock", icon: <SyncAltIcon /> }
      : null,
    canManageInventory
      ? { title: "Compras", description: "Crea y recepciona ordenes de compra.", href: "/inventory/purchase-orders", label: "Ver compras", icon: <ReceiptLongIcon /> }
      : null,
    canManageMaterials
      ? { title: "Materias primas", description: "Gestiona insumos y base de recetas.", href: "/catalogo/materias-primas", label: "Ver insumos", icon: <Inventory2Icon /> }
      : null,
  ].filter(Boolean);

  const adminActions = [
    canManageUsers
      ? { title: "Usuarios", description: "Administra usuarios, estado y sesiones.", href: "/users/list", label: "Ver usuarios", icon: <PeopleIcon />, primary: true }
      : null,
    canManageRoles
      ? { title: "Roles y permisos", description: "Configura permisos visibles por rol.", href: "/users/roles", label: "Permisos", icon: <AdminPanelSettingsIcon /> }
      : null,
    canManageProducts
      ? { title: "Productos", description: "Administra productos disponibles para venta.", href: "/catalogo/productos", label: "Ver productos", icon: <Inventory2Icon /> }
      : null,
    canManageMaterials
      ? { title: "Proveedores", description: "Mantiene proveedores para compras e insumos.", href: "/catalogo/proveedores", label: "Ver proveedores", icon: <StorefrontIcon /> }
      : null,
  ].filter(Boolean);

  const signals = [
    canManageOrders && insights.orders
      ? {
          title: "Pedidos pendientes",
          value: insights.orders.draft + insights.orders.confirmed + insights.orders.inProduction,
          helper: `${insights.orders.draft} borrador, ${insights.orders.confirmed} confirmados, ${insights.orders.dispatchable} listos para despacho.`,
          href: "/orders/history",
          label: "Revisar pedidos",
          color: insights.orders.dispatchable > 0 ? "success" : insights.orders.confirmed > 0 ? "warning" : "info",
          icon: <ShoppingCartIcon />,
        }
      : null,
    canManageProduction && insights.production
      ? {
          title: "Produccion activa",
          value: insights.production.open,
          helper: `${insights.production.pending} ordenes con faltantes. ${insights.production.completed} completadas en la consulta actual.`,
          href: "/production/orders",
          label: "Ver produccion",
          color: insights.production.pending > 0 ? "warning" : "success",
          icon: <FactCheckIcon />,
        }
      : null,
    canManageInventory && insights.inventory
      ? {
          title: "Stock critico",
          value: insights.inventory.critical,
          helper: `${insights.inventory.materialsCritical} materias primas y ${insights.inventory.productsCritical} productos requieren revision.`,
          href: "/inventory/overview",
          label: "Ver inventario",
          color: insights.inventory.critical > 0 ? "error" : "success",
          icon: insights.inventory.critical > 0 ? <WarningAmberIcon /> : <WarehouseIcon />,
        }
      : null,
  ].filter(Boolean);

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background: `linear-gradient(90deg, ${theme.palette.secondary.main}14, ${theme.palette.background.paper})`,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Panel de Control
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Hola, {getUserLabel(currentUser)}. Estos son tus accesos segun permisos.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {canManageOrders ? (
              <AppButton component={Link} href="/orders/count" color="secondary">
                Crear pedido
              </AppButton>
            ) : null}
            {canManageProduction ? (
              <Button component={Link} href="/production/orders" color="secondary" variant="outlined">
                Produccion
              </Button>
            ) : null}
            {canManageInventory ? (
              <Button component={Link} href="/inventory/overview" color="secondary" variant="outlined">
                Inventario
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {canManageUsers ? (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Usuarios" value={stats.users} helper="Cuentas administrables" icon={<PeopleIcon />} color="primary" />
          </Grid>
        ) : null}
        {canManageCustomers ? (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Clientes" value={stats.customers} helper="Base comercial" icon={<StorefrontIcon />} color="secondary" />
          </Grid>
        ) : null}
        {canManageRoutes ? (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Rutas" value={stats.routes} helper="Rutas activas" icon={<LocalShippingIcon />} color="warning" />
          </Grid>
        ) : null}
        {canManageProducts ? (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Productos" value={stats.products} helper="Catalogo de venta" icon={<Inventory2Icon />} color="success" />
          </Grid>
        ) : null}
      </Grid>

      {signals.length > 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                Alertas operativas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Datos reales de pedidos, produccion e inventario para decidir que atender primero.
              </Typography>
            </Box>
            <Chip label={`${signals.length} bloques activos`} variant="outlined" />
          </Stack>
          <Grid container spacing={2}>
            {signals.map((signal) => (
              <Grid item xs={12} md={4} key={signal.title}>
                <SignalCard {...signal} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      ) : null}

      <RoleSection title="Ventas" subtitle="Captura, seguimiento y despacho de pedidos." badge={`${salesActions.length} accesos`} actions={salesActions} />
      <RoleSection title="Produccion" subtitle="Planificacion, recetas y avance diario." badge={`${productionActions.length} accesos`} actions={productionActions} />
      <RoleSection title="Inventario" subtitle="Stock, movimientos y compras operativas." badge={`${inventoryActions.length} accesos`} actions={inventoryActions} />
      <RoleSection title="Administracion" subtitle="Usuarios, permisos y catalogos maestros." badge={`${adminActions.length} accesos`} actions={adminActions} />
    </>
  );
};

export default DashboardView;
