import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import FormField from "@core/components/ui/FormField";
import FlowPageLayout from "views/modules/FlowPageLayout";
import employeesService from "services/employees/employees-service";
import usersService from "services/users/users-service";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const initialForm = {
  user_id: "",
  employee_code: "",
  document_id: "",
  job_type: "baker",
  custom_job_title: "",
  notes: "",
};

const EmployeesNewPage = () => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);

  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/employees/list" },
      { label: "Nuevo empleado", href: "/employees/new", active: true },
    ],
    []
  );

  const availableUsers = useMemo(() => {
    const assignedUserIds = new Set(employees.map((employee) => Number(employee.user_id)).filter(Boolean));
    return users.filter((user) => user.status === "active" && !assignedUserIds.has(Number(user.id)));
  }, [employees, users]);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResponse, employeesResponse] = await Promise.all([
        usersService.getUsers({ page: 1, pageSize: 200 }),
        employeesService.getEmployees({ page: 1, pageSize: 200 }),
      ]);

      if (usersResponse?.code !== 1) {
        setError(usersResponse?.message || "No se pudieron cargar los usuarios");
        return;
      }

      if (employeesResponse?.code !== 1) {
        setError(employeesResponse?.message || "No se pudieron cargar los empleados actuales");
        return;
      }

      setUsers(normalizeList(usersResponse.data));
      setEmployees(normalizeList(employeesResponse.data));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al cargar datos base"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.user_id) {
      toast.error("Selecciona un usuario");
      return;
    }
    if (form.job_type === "other" && form.custom_job_title.trim().length < 3) {
      toast.error("Escribe el nombre del nuevo cargo");
      return;
    }

    setSaving(true);
    try {
      const response = await employeesService.createEmployee({
        p_user_id: Number(form.user_id),
        p_employee_code: form.employee_code.trim() || null,
        p_document_id: form.document_id.trim() || null,
        p_job_type: form.job_type,
        p_custom_job_title: form.job_type === "other"
          ? form.custom_job_title.trim()
          : null,
        p_notes: form.notes.trim() || null,
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo crear el empleado");
        return;
      }

      toast.success(response?.message || "Empleado creado");
      setForm(initialForm);
      await loadBaseData();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Error al crear empleado"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Empleados - Nuevo" subtitle="Asocia usuarios del sistema al personal operativo" links={flowLinks}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", maxWidth: 1120, mx: "auto" }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
              px: { xs: 2, md: 3 },
              py: 2.5,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <BadgeOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Datos del empleado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Todo empleado debe partir de un usuario activo para mantener trazabilidad.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Usuario asociado
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    select
                    fullWidth
                    label="Usuario"
                    value={form.user_id}
                    onChange={(event) => updateField("user_id", event.target.value)}
                    disabled={loading || saving}
                    helperText="Solo aparecen usuarios activos sin empleado asociado"
                    required
                  >
                    {availableUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.full_name || user.username} - {user.email || user.username}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Cargo operativo"
                    value={form.job_type}
                    onChange={(event) => {
                      updateField("job_type", event.target.value);
                      if (event.target.value !== "other") {
                        updateField("custom_job_title", "");
                      }
                    }}
                    disabled={saving}
                    required
                  >
                    <MenuItem value="baker">Panadero</MenuItem>
                    <MenuItem value="packer">Empaquetador</MenuItem>
                    <MenuItem value="operator">Operador</MenuItem>
                    <MenuItem value="admin">Administrativo</MenuItem>
                    <MenuItem value="other">Otro</MenuItem>
                  </TextField>
                </Grid>
                {form.job_type === "other" ? (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nombre del nuevo cargo"
                      value={form.custom_job_title}
                      onChange={(event) => updateField("custom_job_title", event.target.value)}
                      placeholder="Ejemplo: Vendedor externo"
                      helperText="Este nombre se mostrara como el cargo del trabajador"
                      inputProps={{ maxLength: 100 }}
                      disabled={saving}
                      required
                      autoFocus
                    />
                  </Grid>
                ) : null}
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Identificacion interna
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormField
                    name="employee_code"
                    label="Codigo de empleado"
                    value={form.employee_code}
                    onChange={(event) => updateField("employee_code", event.target.value)}
                    placeholder="EMP-001"
                    disabled={saving}
                    helperText="Opcional"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField
                    name="document_id"
                    label="Documento"
                    value={form.document_id}
                    onChange={(event) => updateField("document_id", event.target.value)}
                    placeholder="Cedula o identificacion"
                    disabled={saving}
                    helperText="Opcional"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Observaciones
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Notas"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Turno, especialidad, comentarios internos..."
                disabled={saving}
              />
            </Box>
          </Stack>

          <Box
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
              px: { xs: 2, md: 3 },
              py: 2,
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
              <AppButton type="submit" color="secondary" loading={saving} loadingLabel="Creando empleado..." disabled={saving || loading || !form.user_id}>
                Crear empleado
              </AppButton>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </FlowPageLayout>
  );
};

export default EmployeesNewPage;
