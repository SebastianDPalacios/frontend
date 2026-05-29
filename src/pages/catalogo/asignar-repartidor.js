import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, MenuItem } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import usersService from "services/users/users-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
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

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit } =
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

      <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
        <Grid item xs={12} md={4}>
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

        <Grid item xs={12} md={4}>
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

        <Grid item xs={12} md={2}>
          <FormField
            name="assigned_from"
            label="Desde"
            type="date"
            value={values.assigned_from}
            error={errors.assigned_from}
            touched={touched.assigned_from}
            onChange={handleChange}
            onBlur={handleBlur}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: todayValue }}
            required
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <FormField
            name="assigned_to"
            label="Hasta"
            type="date"
            value={values.assigned_to}
            error={errors.assigned_to}
            touched={touched.assigned_to}
            onChange={handleChange}
            onBlur={handleBlur}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: values.assigned_from || todayValue }}
          />
        </Grid>

        <Grid item xs={12}>
          <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Asignando repartidor...">
            Asignar repartidor
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default AsignarRepartidorPage;
