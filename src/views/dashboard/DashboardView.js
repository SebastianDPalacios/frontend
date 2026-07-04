import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaymentsIcon from "@mui/icons-material/Payments";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import DashboardActionCard from "components/molecules/dashboard/DashboardActionCard";
import DashboardMetricCard from "components/molecules/dashboard/DashboardMetricCard";
import DashboardActionSection from "components/organisms/dashboard/DashboardActionSection";
import DashboardOperationalSignals from "components/organisms/dashboard/DashboardOperationalSignals";
import DashboardWelcomePanel from "components/organisms/dashboard/DashboardWelcomePanel";

const hasPermission = (user, permission) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || permissions.includes(permission);
};

const getUserLabel = (user) => user?.full_name || user?.username || "Usuario";

const DashboardView = ({ stats = {}, insights = {}, currentUser = null }) => {
  const canManageUsers = hasPermission(currentUser, "users.manage");
  const canManageRoles = hasPermission(currentUser, "roles.manage");
  const canManageCustomers = hasPermission(currentUser, "customers.manage");
  const canManageProducts = hasPermission(currentUser, "products.manage");
  const canManageMaterials = hasPermission(currentUser, "materials.manage");
  const canManageRecipes = hasPermission(currentUser, "recipes.manage");
  const canManageOrders = hasPermission(currentUser, "orders.manage");
  const canManageProduction = hasPermission(currentUser, "production.manage");
  const canManageInventory = hasPermission(currentUser, "inventory.manage");

  const salesActions = [
    canManageOrders
      ? { title: "Crear pedido", description: "Captura pedidos para tus clientes asignados.", href: "/orders/count", label: "Crear", icon: <ShoppingCartIcon />, primary: true }
      : null,
    canManageOrders
      ? { title: "Gestionar pedidos", description: "Confirma, despacha, registra entregas o cancela pedidos.", href: "/orders/history", label: "Gestionar", icon: <ReceiptLongIcon /> }
      : null,
    canManageOrders
      ? { title: "Liquidación diaria", description: "Consulta ventas entregadas, comisión y dinero por entregar.", href: "/orders/daily-settlement", label: "Ver liquidación", icon: <PaymentsIcon /> }
      : null,
    canManageOrders
      ? { title: "Cambios y devoluciones", description: "Registra y autoriza solicitudes sobre pedidos entregados.", href: "/orders/returns", label: "Gestionar", icon: <AssignmentReturnIcon /> }
      : null,
    canManageCustomers
      ? { title: "Clientes", description: "Consulta, crea y actualiza clientes activos.", href: "/catalogo/clientes", label: "Ver clientes", icon: <StorefrontIcon /> }
      : null,
    canManageRoles
      ? { title: "Clientes por vendedor", description: "Asigna y reasigna clientes a vendedores externos.", href: "/orders/customer-assignments", label: "Asignar clientes", icon: <PeopleIcon /> }
      : null,
  ].filter(Boolean);

  const productionActions = [
    canManageProduction
      ? { title: "Lotes y empaque", description: "Crea lotes con la receta vigente y registra lo empacado o dañado.", href: "/production/packaging", label: "Gestionar lotes", icon: <FactCheckIcon />, primary: true }
      : null,
    canManageProduction
      ? { title: "Resumen del día", description: "Revisa lotes, productos listos, daños y pendientes del día.", href: "/production/day", label: "Ver diario", icon: <ReceiptLongIcon /> }
      : null,
    canManageProduction
      ? { title: "Reporte mensual", description: "Consulta producción, costos, panaderos y empacadores del mes.", href: "/production/month", label: "Ver mensual", icon: <SyncAltIcon /> }
      : null,
    canManageRecipes
      ? { title: "Recetas", description: "Gestiona recetas, productos finales y nuevas versiones.", href: "/recipes", label: "Ver recetas", icon: <RestaurantMenuIcon /> }
      : null,
  ].filter(Boolean);

  const inventoryActions = [
    canManageInventory
      ? { title: "Stock", description: "Consulta existencias y productos críticos.", href: "/inventory/overview", label: "Ver stock", icon: <WarehouseIcon />, primary: true }
      : null,
    canManageInventory
      ? { title: "Movimientos", description: "Registra entradas, salidas y ajustes manuales.", href: "/inventory/movements", label: "Mover stock", icon: <SyncAltIcon /> }
      : null,
    canManageInventory
      ? { title: "Compras", description: "Crea y recibe órdenes de compra.", href: "/inventory/purchase-orders", label: "Ver compras", icon: <ReceiptLongIcon /> }
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
          value: insights.orders.draft + insights.orders.confirmed,
          helper: `${insights.orders.draft} en borrador y ${insights.orders.dispatchable} listos para despacho.`,
          href: "/orders/history",
          label: "Revisar pedidos",
          color: insights.orders.dispatchable > 0 ? "warning" : "info",
          icon: <ShoppingCartIcon />,
        }
      : null,
    canManageOrders && insights.orders
      ? {
          title: "Entregas por confirmar",
          value: insights.orders.dispatched,
          helper: "Pedidos despachados que todavía no generan comisión ni aparecen en la liquidación.",
          href: "/orders/history",
          label: "Confirmar entregas",
          color: insights.orders.dispatched > 0 ? "warning" : "success",
          icon: <LocalShippingIcon />,
        }
      : null,
    canManageProduction && insights.production
      ? {
          title: "Lotes por contar",
          value: insights.production.open,
          helper: `${insights.production.pending} unidades pendientes. ${insights.production.completed} lotes tienen conteo parcial.`,
          href: "/production/packaging",
          label: "Ver lotes",
          color: insights.production.pending > 0 ? "warning" : "success",
          icon: <FactCheckIcon />,
        }
      : null,
    canManageProduction && Number(insights.shortages?.cases_count || 0) > 0
      ? {
          title: "Faltantes del mes",
          value: insights.shortages.missing_quantity,
          helper: `${insights.shortages.cases_count} casos en ${insights.shortages.affected_products} productos.`,
          href: "/production/shortages",
          label: "Revisar faltantes",
          color: Number(insights.shortages.suspected_theft_cases || 0) > 0 ? "error" : "warning",
          icon: <WarningAmberIcon />,
        }
      : null,
    canManageInventory && insights.inventory
      ? {
          title: "Stock crítico",
          value: insights.inventory.critical,
          helper: `${insights.inventory.materialsCritical} materias primas y ${insights.inventory.productsCritical} productos requieren revisión.`,
          href: "/inventory/overview",
          label: "Ver inventario",
          color: insights.inventory.critical > 0 ? "error" : "success",
          icon: insights.inventory.critical > 0 ? <WarningAmberIcon /> : <WarehouseIcon />,
        }
      : null,
  ].filter(Boolean);

  const primaryActions = [
    canManageOrders
      ? { title: "Crear pedido", description: "Captura una venta para clientes asignados.", href: "/orders/count", label: "Crear pedido", icon: <ShoppingCartIcon />, primary: true }
      : null,
    canManageOrders
      ? { title: "Gestion diaria", description: "Confirma, despacha y entrega pedidos de hoy.", href: "/orders/history", label: "Abrir gestion", icon: <ReceiptLongIcon />, primary: true }
      : null,
    canManageInventory
      ? { title: "Salida a puerta", description: "Descuenta productos terminados del inventario.", href: "/inventory/door-exit", label: "Registrar salida", icon: <WarehouseIcon />, primary: true }
      : null,
    canManageProduction
      ? { title: "Lotes y empaque", description: "Registra fabricados, empacados y faltantes.", href: "/production/packaging", label: "Abrir lotes", icon: <FactCheckIcon />, primary: true }
      : null,
  ].filter(Boolean);

  const isPrimaryAction = (action) => primaryActions.some((primary) => primary.href === action.href);

  return (
    <>
      <DashboardWelcomePanel
        userLabel={getUserLabel(currentUser)}
        canManageOrders={canManageOrders}
        canManageProduction={canManageProduction}
        canManageInventory={canManageInventory}
      />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {canManageOrders && insights.orders ? (
          <>
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <DashboardMetricCard title="Pedidos" value={insights.orders.total} helper="Pedidos recientes" icon={<ShoppingCartIcon />} color="primary" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <DashboardMetricCard title="Por despachar" value={insights.orders.dispatchable} helper="Confirmados y listos" icon={<LocalShippingIcon />} color="warning" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <DashboardMetricCard title="Entregados" value={insights.orders.delivered} helper="Con comisión generada" icon={<CheckCircleIcon />} color="success" />
            </Grid>
          </>
        ) : null}
        {canManageUsers ? (
          <Grid item xs={12} sm={6} md={4} lg={2.4}>
            <DashboardMetricCard title="Usuarios" value={stats.users} helper="Cuentas administrables" icon={<PeopleIcon />} color="primary" />
          </Grid>
        ) : null}
        {canManageCustomers ? (
          <Grid item xs={12} sm={6} md={4} lg={2.4}>
            <DashboardMetricCard title="Clientes" value={stats.customers} helper="Base comercial" icon={<StorefrontIcon />} color="secondary" />
          </Grid>
        ) : null}
        {canManageProducts ? (
          <Grid item xs={12} sm={6} md={4} lg={2.4}>
            <DashboardMetricCard title="Productos" value={stats.products} helper="Catálogo de venta" icon={<Inventory2Icon />} color="success" />
          </Grid>
        ) : null}
      </Grid>

      <Grid container spacing={2.5} sx={{ alignItems: "stretch", mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.5 }, height: "100%" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Acciones rapidas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Las tareas que mas se usan durante el dia.
                </Typography>
              </Box>
              <Grid container spacing={1.5}>
                {primaryActions.map((action) => (
                  <Grid item xs={12} sm={6} key={action.href}>
                    <DashboardActionCard {...action} />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.5 }, height: "100%" }}>
            <DashboardOperationalSignals signals={signals} />
          </Paper>
        </Grid>
      </Grid>

      <DashboardActionSection title="Mas opciones de ventas" subtitle="Liquidaciones, clientes y devoluciones." actions={salesActions.filter((action) => !isPrimaryAction(action))} />
      <DashboardActionSection title="Produccion" subtitle="Reportes, recetas y resumen diario." actions={productionActions.filter((action) => !isPrimaryAction(action))} />
      <DashboardActionSection title="Inventario" subtitle="Stock, movimientos, compras e insumos." actions={inventoryActions.filter((action) => !isPrimaryAction(action))} />
      <DashboardActionSection title="Administracion" subtitle="Usuarios, permisos y catalogos." actions={adminActions} />
    </>
  );
};

export default DashboardView;

