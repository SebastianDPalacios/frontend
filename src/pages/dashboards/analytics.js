import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import usersService from "services/users/users-service";
import catalogService from "services/catalog/catalog-service";
import DashboardView from "views/dashboard/DashboardView";

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ users: 0, customers: 0, products: 0 });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [users, customers, products] = await Promise.all([
          usersService.getUsers({ page: 1, pageSize: 1 }),
          catalogService.getCustomers({ page: 1, pageSize: 1 }),
          catalogService.getProducts({ page: 1, pageSize: 1 }),
        ]);

        setStats({
          users: users?.data?.total || 0,
          customers: customers?.data?.total || 0,
          products: products?.data?.total || 0,
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
      <DashboardView stats={stats} />
    </Box>
  );
};

export default AnalyticsPage;
