import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Divider, Grid, MenuItem, Paper, Stack, Typography } from "@mui/material";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import usersService from "services/users/users-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import FlowPageLayout from "views/modules/FlowPageLayout";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const getTodayInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AsignarRepartidorPage = () => {
  const todayValue = useMemo(() => getTodayInputValue(), []);
  const flowLinks = useMemo(
    () => [
      { label: "Rutas", href: "/catalogo/repartidores" },
      { label: "Nueva ruta", href: "/catalogo/nueva-ruta" },
      { label: "Asignar repartidor", href: "/catalogo/asignar-repartidor", active: true },
    ],
    []
  );

  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [routesError, setRoutesError] = useState(null);
  const [usersError, setUsersError] = useState(null);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      setRoutesError(null);
      setUsersError(null);

      const [routesResult, usersResult] = await Promise.allSettled([
        catalogService.getRoutes({ onlyActive: 1 }),
        usersService.getUsers({ status: "active", page: 1, pageSize: 100 }),
      ]);

      if (routesResult.status === "fulfilled" && routesResult.value?.code === 1) {
        setRoutes(normalizeList(routesResult.value.data));
      } else {
        setRoutes([]);
        setRoutesError(
          routesResult.status === "fulfilled"
            ? routesResult.value?.message || "No se pudieron cargar las rutas activas"
            : getApiErrorMessage(routesResult.reason, "No se pudieron cargar las rutas activas")
        );
      }

      if (usersResult.status === "fulfilled" && usersResult.value?.code === 1) {
        setUsers(normalizeList(usersResult.value.data));
      } else {
        setUsers([]);
        setUsersError(
          usersResult.status === "fulfilled"
            ? usersResult.value?.message || "No se pudieron cargar los usuarios activos"
            : "No se pudieron cargar los usuarios activos"
        );
      }

      setLoadingOptions(false);
    };

    loadOptions();
  }, []);

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit, setFieldValue, setFieldTouched, resetForm } =
    useForm(
      {
        route_id: "",
        user_id: "",
        assigned_from: todayValue,
        assigned_to: "",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.assignRouteDriver(Number(formValues.route_id), {
            p_user_id: Number(formValues.user_id),
            p_assigned_from: formValues.assigned_from,
            p_assigned_to: formValues.assigned_to || null,
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo asignar el repartidor");
            helpers.setSubmitError(result?.message || "Error al asignar repartidor");
            return;
          }

          toast.success(result?.message || "Repartidor asignado correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al asignar repartidor. Verifica tu conexion."));
        }
      },
      {
        route_id: (value) => (!value ? "Selecciona una ruta" : null),
        user_id: (value) => (!value ? "Selecciona un repartidor" : null),
        assigned_from: (value) => {
          if (!value) return "La fecha inicial es obligatoria";
          if (value < todayValue) return "La fecha inicial no puede ser anterior a hoy";
          return null;
        },
        assigned_to: (value) => {
          if (!value || !values.assigned_from) return null;
          if (value < values.assigned_from) return "La fecha final no puede ser menor a la inicial";
          return null;
        },
      }
    );

  return (
    <FlowPageLayout title="Rutas - Asignar repartidor" subtitle="Asignacion de repartidor por periodo" links={flowLinks}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}
      {routesError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {routesError}
        </Alert>
      )}
      {usersError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {usersError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", maxWidth: 1180, mx: "auto" }}>
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
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
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
                <AssignmentIndOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Asignacion de repartidor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vincula un repartidor activo a una ruta durante un periodo.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Ruta y repartidor
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormField
                    select
                    name="route_id"
                    label="Ruta"
                    value={values.route_id}
                    error={errors.route_id}
                    touched={touched.route_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={loadingOptions}
                    helperText={loadingOptions ? "Cargando rutas..." : routes.length === 0 ? "No hay rutas activas disponibles" : ""}
                  >
                    <MenuItem value="">Selecciona una ruta</MenuItem>
                    {!loadingOptions && routes.length === 0 ? (
                      <MenuItem value="" disabled>
                        No hay rutas activas disponibles
                      </MenuItem>
                    ) : null}
                    {routes.map((route) => (
                      <MenuItem key={route.id} value={route.id}>
                        {route.code} - {route.name}
                      </MenuItem>
                    ))}
                  </FormField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormField
                    select
                    name="user_id"
                    label="Repartidor"
                    value={values.user_id}
                    error={errors.user_id}
                    touched={touched.user_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={loadingOptions}
                    helperText={loadingOptions ? "Cargando usuarios..." : users.length === 0 ? "No hay usuarios activos disponibles" : ""}
                  >
                    <MenuItem value="">Selecciona un repartidor</MenuItem>
                    {!loadingOptions && users.length === 0 ? (
                      <MenuItem value="" disabled>
                        No hay usuarios activos disponibles
                      </MenuItem>
                    ) : null}
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.full_name || user.username || user.email}
                      </MenuItem>
                    ))}
                  </FormField>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Periodo de asignacion
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <BalanceDatePicker
                    label="Desde"
                    value={values.assigned_from}
                    onChange={(nextValue) => {
                      setFieldTouched("assigned_from", true);
                      setFieldValue("assigned_from", nextValue);
                    }}
                    minDate={todayValue}
                    fullWidth
                    error={Boolean(touched.assigned_from && errors.assigned_from)}
                    helperText={(touched.assigned_from && errors.assigned_from) || "Fecha inicial de vigencia"}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <BalanceDatePicker
                    label="Hasta"
                    value={values.assigned_to}
                    onChange={(nextValue) => {
                      setFieldTouched("assigned_to", true);
                      setFieldValue("assigned_to", nextValue);
                    }}
                    minDate={values.assigned_from || todayValue}
                    fullWidth
                    error={Boolean(touched.assigned_to && errors.assigned_to)}
                    helperText={(touched.assigned_to && errors.assigned_to) || "Opcional: deja vacio si no tiene fecha final"}
                  />
                </Grid>
              </Grid>
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
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ justifyContent: "flex-end", alignItems: { xs: "stretch", sm: "center" } }}
            >
              <AppButton type="button" variant="outlined" color="secondary" onClick={resetForm}>
                Limpiar formulario
              </AppButton>
              <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Asignando repartidor...">
                Asignar repartidor
              </AppButton>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </FlowPageLayout>
  );
};

export default AsignarRepartidorPage;
