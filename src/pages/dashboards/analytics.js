import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import usersService from "services/users/users-service";
import catalogService from "services/catalog/catalog-service";
import authService from "services/auth/auth-service";
import ordersService from "services/orders/orders-service";
import productionService from "services/production/production-service";
import inventoryService from "services/inventory/inventory-service";
import dashboardService from "services/dashboard/dashboard-service";
import DashboardView from "views/dashboard/DashboardView";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const hasPermission = (user, permission) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || permissions.includes(permission);
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${day}`,
  };
};

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ users: 0, customers: 0, products: 0 });
  const [insights, setInsights] = useState({
    orders: null,
    production: null,
    shortages: null,
    inventory: null,
    monthly: null,
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
          products: hasPermission(user, "products.manage")
            ? catalogService.getProducts({ page: 1, pageSize: 1 })
            : Promise.resolve(null),
          orders: hasPermission(user, "orders.manage")
            ? ordersService.getOrders({ page: 1, pageSize: 80 })
            : Promise.resolve(null),
          production: hasPermission(user, "production.manage")
            ? productionService.getPendingPackaging({})
            : Promise.resolve(null),
          shortages: hasPermission(user, "production.manage")
            ? productionService.getJustifiedShortages({ ...getCurrentMonthRange(), page: 1, pageSize: 1 })
            : Promise.resolve(null),
          inventory: hasPermission(user, "inventory.manage")
            ? inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 80 })
            : Promise.resolve(null),
          monthly: hasPermission(user, "reports.view")
            ? dashboardService.getMonthly({ month: new Date().toISOString().slice(0, 7) })
            : Promise.resolve(null),
        };

        const [users, customers, products, orders, production, shortages, inventory, monthly] = await Promise.allSettled([
          requests.users,
          requests.customers,
          requests.products,
          requests.orders,
          requests.production,
          requests.shortages,
          requests.inventory,
          requests.monthly,
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
          products: getTotal(products),
        });

        const orderRows = orders.status === "fulfilled" && orders.value ? normalizeRows(orders.value.data?.items) : [];
        const productionRows = production.status === "fulfilled" && production.value ? normalizeRows(production.value.data?.items || production.value.data) : [];
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
                dispatchable: orderRows.filter((order) => ["confirmed", "ready"].includes(order.status)).length,
                dispatched: orderRows.filter((order) => order.status === "dispatched").length,
                delivered: orderRows.filter((order) => order.status === "delivered").length,
                cancelled: orderRows.filter((order) => order.status === "cancelled").length,
              }
            : null,
          production: requests.production
            ? {
                total: productionRows.length,
                open: productionRows.length,
                pending: productionRows.reduce((total, batch) => {
                  return total + normalizeRows(batch.items).reduce((itemsTotal, item) => {
                    return itemsTotal + Number(item.pending_quantity || 0);
                  }, 0);
                }, 0),
                completed: productionRows.filter((batch) => batch.status === "partially_packed").length,
              }
            : null,
          shortages: requests.shortages && shortages.status === "fulfilled" && shortages.value
            ? shortages.value.data?.summary || null
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
          monthly: requests.monthly && monthly.status === "fulfilled" && monthly.value?.code === 1
            ? monthly.value.data
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
    <FlowPageLayout
      title="Panel principal"
      subtitle="Ventas, entregas, producción e inventario en un solo lugar."
      breadcrumbs={[]}
    >
      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}
      <DashboardView stats={stats} insights={insights} currentUser={currentUser} />
    </FlowPageLayout>
  );
};

export default AnalyticsPage;
