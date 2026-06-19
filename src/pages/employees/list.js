import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BakeryDiningOutlinedIcon from "@mui/icons-material/BakeryDiningOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import AppCard from "@core/components/ui/AppCard";
import FlowPageLayout from "views/modules/FlowPageLayout";
import employeesService from "services/employees/employees-service";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const JOB_LABELS = {
  baker: "Panadero",
  packer: "Empaquetador",
  operator: "Operador",
  admin: "Administrativo",
  other: "Otro",
};

const getJobIcon = (jobType) => {
  if (jobType === "baker") return <BakeryDiningOutlinedIcon />;
  if (jobType === "packer") return <Inventory2OutlinedIcon />;
  return <BadgeOutlinedIcon />;
};

const EmployeesListPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("");

  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/employees/list", active: true },
      { label: "Nuevo empleado", href: "/employees/new" },
    ],
    []
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await employeesService.getEmployees({
        status: "active",
        jobType: jobType || undefined,
        search: search.trim() || undefined,
        page: 1,
        pageSize: 100,
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el listado de empleados");
        return;
      }

      setItems(normalizeList(response.data));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar empleados"));
    } finally {
      setLoading(false);
    }
  }, [jobType, search]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const counters = useMemo(
    () => ({
      total: items.length,
      bakers: items.filter((item) => item.job_type === "baker").length,
      packers: items.filter((item) => item.job_type === "packer").length,
    }),
    [items]
  );

  return (
    <FlowPageLayout title="Empleados" subtitle="Personal operativo asociado a usuarios del sistema" links={flowLinks}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <AppCard sx={{ mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            label="Buscar empleado"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, usuario, correo o documento"
            fullWidth
          />
          <TextField
            select
            label="Cargo operativo"
            value={jobType}
            onChange={(event) => setJobType(event.target.value)}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="baker">Panadero</MenuItem>
            <MenuItem value="packer">Empaquetador</MenuItem>
            <MenuItem value="operator">Operador</MenuItem>
            <MenuItem value="admin">Administrativo</MenuItem>
            <MenuItem value="other">Otro</MenuItem>
          </TextField>
          <Button variant="contained" color="secondary" onClick={loadEmployees} disabled={loading}>
            Buscar
          </Button>
        </Stack>
      </AppCard>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <AppCard>
            <Typography variant="body2" color="text.secondary">
              Empleados activos
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              {counters.total}
            </Typography>
          </AppCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <AppCard>
            <Typography variant="body2" color="text.secondary">
              Panaderos
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              {counters.bakers}
            </Typography>
          </AppCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <AppCard>
            <Typography variant="body2" color="text.secondary">
              Empaquetadores
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              {counters.packers}
            </Typography>
          </AppCard>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {items.map((employee) => (
          <Grid item xs={12} md={6} xl={4} key={employee.id}>
            <AppCard sx={{ height: "100%" }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "secondary.main",
                    color: "secondary.contrastText",
                  }}
                >
                  {getJobIcon(employee.job_type)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900 }} noWrap>
                        {employee.full_name || employee.username || "Empleado"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{employee.username}
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        employee.job_type === "other"
                          ? employee.custom_job_title || "Otro"
                          : JOB_LABELS[employee.job_type] || employee.job_type || "Otro"
                      }
                      color="success"
                      size="small"
                    />
                  </Stack>

                  <Stack spacing={0.75} sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Correo: {employee.email || "Sin correo"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Documento: {employee.document_id || "Sin documento"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Codigo: {employee.employee_code || `EMP-${employee.id}`}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </AppCard>
          </Grid>
        ))}
      </Grid>

      {!loading && items.length === 0 ? (
        <AppCard sx={{ mt: 3, textAlign: "center", py: 5 }}>
          <PersonAddAlt1OutlinedIcon sx={{ fontSize: 42, color: "text.secondary", mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            No hay empleados para mostrar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea empleados desde usuarios existentes para usarlos en produccion y empaque.
          </Typography>
        </AppCard>
      ) : null}
    </FlowPageLayout>
  );
};

export default EmployeesListPage;
