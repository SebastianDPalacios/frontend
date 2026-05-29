import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import usersService from "services/users/users-service";
import catalogService from "services/catalog/catalog-service";
import authService from "services/auth/auth-service";
import ordersService from "services/orders/orders-service";
import productionService from "services/production/production-service";
import inventoryService from "services/inventory/inventory-service";
import DashboardView from "views/dashboard/DashboardView";
import { normalizeRows } from "views/modules/flow-utils";

const hasPermission = (user, permission) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || permissions.includes(permission);
};

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ users: 0, customers: 0, routes: 0, products: 0 });
  const [insights, setInsights] = useState({
    orders: null,
    production: null,
    inventory: null,
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const run = async () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      setLoading(true);
      setError(null);

      try {
        const requests = {
          users: hasPermission(user, "users.manage")
            ? usersService.getUsers({ page: 1, pageSize: 1 })
            : Promise.resolve(null),
          customers: hasPermission(user, "customers.manage")
            ? catalogService.getCustomers({ page: 1, pageSize: 1 })
            : Promise.resolve(null),
          routes: hasPermission(user, "routes.manage")
            ? catalogService.getRoutes({ page: 1, pageSize: 1 })
            : Promise.resolve(null),
          products: hasPermission(user, "products.manage")
            ? catalogService.getProducts({ page: 1, pageSize: 1 })
            : Promise.resolve(null),
          orders: hasPermission(user, "orders.manage")
            ? ordersService.getOrders({ page: 1, pageSize: 80 })
            : Promise.resolve(null),
          production: hasPermission(user, "production.manage")
            ? productionService.getOrders({ page: 1, pageSize: 80 })
            : Promise.resolve(null),
          inventory: hasPermission(user, "inventory.manage")
            ? inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 80 })
            : Promise.resolve(null),
        };

        const [users, customers, routes, products, orders, production, inventory] = await Promise.allSettled([
          requests.users,
          requests.customers,
          requests.routes,
          requests.products,
          requests.orders,
          requests.production,
          requests.inventory,
        ]);

        const getTotal = (result) => {
          if (result.status !== "fulfilled" || !result.value) {
            return null;
          }

          return result.value?.data?.total || 0;
        };

        setStats({
          users: getTotal(users),
          customers: getTotal(customers),
          routes: getTotal(routes),
          products: getTotal(products),
        });

        const orderRows = orders.status === "fulfilled" && orders.value ? normalizeRows(orders.value.data?.items) : [];
        const productionRows = production.status === "fulfilled" && production.value ? normalizeRows(production.value.data?.items) : [];
        const inventoryData = inventory.status === "fulfilled" && inventory.value ? inventory.value.data : null;
        const productStockRows = normalizeRows(inventoryData?.products);
        const materialStockRows = normalizeRows(inventoryData?.raw_materials);
        const criticalStockRows = [...productStockRows, ...materialStockRows].filter((item) => {
          const stock = Number(item.quantity_on_hand || 0);
          const min = Number(item.min_stock || 0);
          return stock <= 0 || (min > 0 && stock < min);
        });

        setInsights({
          orders: requests.orders
            ? {
                total: orderRows.length,
                draft: orderRows.filter((order) => order.status === "draft").length,
                confirmed: orderRows.filter((order) => order.status === "confirmed").length,
                inProduction: orderRows.filter((order) => order.status === "in_production" || order.status === "ready").length,
                dispatchable: orderRows.filter(
                  (order) =>
                    order.status === "ready" ||
                    (order.status === "in_production" &&
                      order.production_order_id &&
                      order.production_status === "completed" &&
                      Number(order.production_pending_items || 0) === 0)
                ).length,
              }
            : null,
          production: requests.production
            ? {
                total: productionRows.length,
                open: productionRows.filter((order) => !["completed", "cancelled"].includes(order.status)).length,
                pending: productionRows.filter((order) => Number(order.pending_items || 0) > 0).length,
                completed: productionRows.filter((order) => order.status === "completed").length,
              }
            : null,
          inventory: requests.inventory
            ? {
                critical: criticalStockRows.length,
                productsCritical: productStockRows.filter((item) => {
                  const stock = Number(item.quantity_on_hand || 0);
                  const min = Number(item.min_stock || 0);
                  return stock <= 0 || (min > 0 && stock < min);
                }).length,
                materialsCritical: materialStockRows.filter((item) => {
                  const stock = Number(item.quantity_on_hand || 0);
                  const min = Number(item.min_stock || 0);
                  return stock <= 0 || (min > 0 && stock < min);
                }).length,
              }
            : null,
        });
      } catch (err) {
        setError("No se pudieron cargar metricas iniciales");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontSize: { xs: 24, sm: 30 } }}>
        Dashboard operativo
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}
      <DashboardView stats={stats} insights={insights} currentUser={currentUser} />
    </Box>
  );
};

export default AnalyticsPage;
