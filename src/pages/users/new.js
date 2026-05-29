import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import usersService from "services/users/users-service";
import rbacService from "services/users/rbac-service";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { FIELD_VALIDATORS } from "constants/validation";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const UsersNewPage = () => {
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(null);

  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/users/list" },
      { label: "Nuevo", href: "/users/new", active: true },
    ],
    []
  );

  useEffect(() => {
    const loadRoles = async () => {
      setRolesLoading(true);
      setRolesError(null);

      try {
        const response = await rbacService.getRoles();
        if (response?.code !== 1) {
          setRolesError(response?.message || "No se pudieron cargar los roles");
          return;
        }

        setRoles(normalizeList(response.data));
      } catch (requestError) {
        setRolesError(getErrorMessage(requestError, "Error al cargar roles"));
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, []);

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit } =
    useForm(
      {
        full_name: "",
        username: "",
        email: "",
        password: "",
        role_code: "ADMIN",
      },
      async (formValues, helpers) => {
        try {
          const result = await usersService.createUser({
            p_username: formValues.username.trim(),
            p_email: formValues.email.trim(),
            p_password_hash: formValues.password,
            p_password_algo: "bcrypt",
            p_full_name: formValues.full_name.trim(),
            p_phone: null,
            p_role_code: formValues.role_code.trim().toUpperCase(),
            p_must_change_password: 1,
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear el usuario");

            if (result.data && Array.isArray(result.data.errors)) {
              const list = (
                <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                  {result.data.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              );

              if (typeof helpers.setFieldError === "function") {
                helpers.setFieldError("password", list);
              }
              if (typeof helpers.setFieldTouched === "function") {
                helpers.setFieldTouched("password", true);
              }

              try {
                document.querySelector('input[name="password"]')?.focus();
              } catch (e) {
                // ignore focus errors
              }
            } else {
              helpers.setSubmitError(result?.message || "No se pudo crear el usuario");
            }

            return;
          }

          toast.success(result?.message || "Usuario creado correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getErrorMessage(requestError, "Error de red al crear usuario. Verifica tu conexion."));
        }
      },
      {
        full_name: FIELD_VALIDATORS.fullName,
        username: FIELD_VALIDATORS.username,
        email: FIELD_VALIDATORS.email,
        password: FIELD_VALIDATORS.password,
        role_code: FIELD_VALIDATORS.roleCode,
      }
    );

  return (
    <FlowPageLayout title="Usuarios - Nuevo" subtitle="Alta de usuario y rol inicial" links={flowLinks}>
      {submitError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      ) : null}
      {rolesError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {rolesError}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }} component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Datos del usuario
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crea la cuenta, asigna el rol inicial y obliga cambio de clave en el primer ingreso.
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormField
                name="full_name"
                label="Nombre completo"
                value={values.full_name}
                error={errors.full_name}
                touched={touched.full_name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Juan Perez Garcia"
                disabled={isSubmitting}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormField
                name="username"
                label="Usuario"
                value={values.username}
                error={errors.username}
                touched={touched.username}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="juan.perez"
                disabled={isSubmitting}
                required
                helperText="4-32 caracteres"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormField
                name="email"
                label="Correo electronico"
                type="email"
                value={values.email}
                error={errors.email}
                touched={touched.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="juan@example.com"
                disabled={isSubmitting}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormField
                name="password"
                label="Contrasena"
                type="password"
                value={values.password}
                error={errors.password}
                touched={touched.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="**********"
                disabled={isSubmitting}
                required
                helperText="Min. 10 caracteres"
                showPasswordToggle
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                name="role_code"
                label="Rol"
                value={values.role_code}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(errors.role_code && touched.role_code)}
                helperText={errors.role_code && touched.role_code ? errors.role_code : "Selecciona el rol inicial"}
                disabled={isSubmitting || rolesLoading}
                required
              >
                {roles.map((role) => (
                  <MenuItem key={role.code} value={role.code}>
                    {role.name || role.code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <AppButton
              type="submit"
              color="secondary"
              loading={isSubmitting}
              loadingLabel="Creando usuario..."
              disabled={isSubmitting || rolesLoading || Object.values(errors).some((v) => Boolean(v))}
            >
              Crear usuario
            </AppButton>
            <Typography variant="body2" color="text.secondary">
              El usuario quedara activo y con cambio de clave pendiente.
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </FlowPageLayout>
  );
};

export default UsersNewPage;
