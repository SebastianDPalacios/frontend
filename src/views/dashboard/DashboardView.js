import { Box, Chip, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DashboardMetricCard from "components/molecules/dashboard/DashboardMetricCard";
import DashboardOperationalSignals from "components/organisms/dashboard/DashboardOperationalSignals";
import DashboardWelcomePanel from "components/organisms/dashboard/DashboardWelcomePanel";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const moneyFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "COP",
});

const hasPermission = (user, permission) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || permissions.includes(permission);
};

const getUserLabel = (user) => user?.full_name || user?.username || "Usuario";

const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

const MonthlyRankingCard = ({ title, subtitle, rows = [], valueKey, helperKey, formatter = formatNumber, emptyText }) => {
  const topRows = rows.slice(0, 3);
  const maxValue = topRows.reduce((max, row) => Math.max(max, Number(row[valueKey] || 0)), 0);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.25 }, height: "100%" }}>
      <Stack spacing={1.75}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>

        {topRows.length === 0 ? (
          <Box sx={{ borderRadius: 3, bgcolor: "rgba(59,130,246,0.08)", px: 1.5, py: 1.25 }}>
            <Typography variant="body2" color="text.secondary">
              {emptyText || "Sin datos para este mes."}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.35}>
            {topRows.map((row, index) => {
              const value = Number(row[valueKey] || 0);
              const percent = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 0;

              return (
                <Box key={`${row.name}-${index}`}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between", minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                      {index + 1}. {row.name}
                    </Typography>
                    <Typography sx={{ fontWeight: 900, flexShrink: 0 }}>
                      {formatter(value)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    color={index === 0 ? "secondary" : "primary"}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      mt: 0.65,
                      bgcolor: "rgba(17,24,39,0.08)",
                      "& .MuiLinearProgress-bar": { borderRadius: 999 },
                    }}
                  />
                  {helperKey ? (
                    <Typography variant="caption" color="text.secondary">
                      {formatNumber(row[helperKey])} {helperKey === "orders_count" ? "pedido(s)" : "bulto(s)"}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

const DashboardView = ({ stats = {}, insights = {}, currentUser = null }) => {
  const canManageUsers = hasPermission(currentUser, "users.manage");
  const canManageCustomers = hasPermission(currentUser, "customers.manage");
  const canManageProducts = hasPermission(currentUser, "products.manage");
  const canManageOrders = hasPermission(currentUser, "orders.manage");
  const canManageProduction = hasPermission(currentUser, "production.manage");
  const canManageInventory = hasPermission(currentUser, "inventory.manage");

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

  const monthly = insights.monthly || {};
  return (
    <>
      <DashboardWelcomePanel
        userLabel={getUserLabel(currentUser)}
        canManageOrders={canManageOrders}
        canManageProduction={canManageProduction}
        canManageInventory={canManageInventory}
      />

      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Comportamiento del mes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vendedores, productos y recetas con mayor movimiento en {monthly.month || "el mes actual"}.
            </Typography>
          </Box>
          <Chip label={monthly.date_from && monthly.date_to ? `${monthly.date_from} / ${monthly.date_to}` : "Mes actual"} color="secondary" variant="outlined" />
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <MonthlyRankingCard
              title="Vendedores con mas ventas"
              subtitle="Total vendido por vendedor."
              rows={monthly.top_sellers || []}
              valueKey="total_sales"
              helperKey="orders_count"
              formatter={formatMoney}
            />
          </Grid>
          <Grid item xs={12} lg={4}>
            <MonthlyRankingCard
              title="Producto mas vendido"
              subtitle="Unidades solicitadas en pedidos."
              rows={monthly.top_products || []}
              valueKey="quantity"
              formatter={(value) => `${formatNumber(value)} und`}
            />
          </Grid>
          <Grid item xs={12} lg={4}>
            <MonthlyRankingCard
              title="Receta mas hecha"
              subtitle="Bultos registrados en produccion."
              rows={monthly.top_recipes || []}
              valueKey="batch_quantity"
              helperKey="batches_count"
              formatter={(value) => `${formatNumber(value)} bulto(s)`}
            />
          </Grid>
        </Grid>
      </Box>

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

      <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.5 }, mb: 3 }}>
        <DashboardOperationalSignals signals={signals} />
      </Paper>

    </>
  );
};

export default DashboardView;

