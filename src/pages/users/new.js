import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
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
            p_must_change_password: 0,
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
                <PersonAddAlt1OutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Datos del usuario
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crea la cuenta con su clave inicial y asigna el rol correspondiente.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Identidad
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
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

                <Grid item xs={12} md={6}>
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
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Acceso
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
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

                <Grid item xs={12} md={6}>
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
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                Rol inicial
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
                  <Alert severity="info" sx={{ height: "100%", alignItems: "center" }}>
                    El usuario quedara activo y podra ingresar con la clave definida.
                  </Alert>
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "flex-end", alignItems: { xs: "stretch", sm: "center" } }}>
              <AppButton
                type="submit"
                color="secondary"
                loading={isSubmitting}
                loadingLabel="Creando usuario..."
                disabled={isSubmitting || rolesLoading || Object.values(errors).some((v) => Boolean(v))}
              >
                Crear usuario
              </AppButton>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </FlowPageLayout>
  );
};

export default UsersNewPage;
