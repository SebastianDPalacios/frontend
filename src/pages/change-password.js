import { useRouter } from "next/router";
import { Alert, Avatar, Box, Divider, Paper, Stack, Typography } from "@mui/material";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import toast from "react-hot-toast";
import authService from "services/auth/auth-service";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import { FIELD_VALIDATORS } from "constants/validation";

const ChangePasswordPage = () => {
  const router = useRouter();

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit } = useForm(
    {
      password: "",
      confirmPassword: "",
    },
    async (formValues, helpers) => {
      if (formValues.password !== formValues.confirmPassword) {
        helpers.setFieldError("confirmPassword", "Las contrasenas no coinciden");
        helpers.setFieldTouched("confirmPassword", true);
        return;
      }

      try {
        const result = await authService.changePassword(formValues.password);
        if (result?.code !== 1) {
          if (result?.data && Array.isArray(result.data.errors)) {
            helpers.setFieldError(
              "password",
              <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                {result.data.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            );
            helpers.setFieldTouched("password", true);
            return;
          }

          helpers.setSubmitError(result?.message || "No se pudo actualizar la contrasena");
          return;
        }

        authService.updateCurrentUser({ must_change_password: 0 });
        toast.success("Contrasena actualizada");
        router.replace("/dashboards/analytics");
      } catch (error) {
        helpers.setSubmitError("Error de conexion al actualizar la contrasena");
      }
    },
    {
      password: FIELD_VALIDATORS.password,
      confirmPassword: (value) => {
        if (!value) return "Confirma la contrasena";
        return null;
      },
    }
  );

  const onLogout = async () => {
    await authService.logout();
    router.replace("/login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, md: 4 },
        background:
          "radial-gradient(circle at 14% 20%, rgba(234, 88, 12, 0.18), transparent 28%), linear-gradient(135deg, #fff7ed 0%, #f8fafc 48%, #eef2ff 100%)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 4,
          border: "1px solid rgba(148, 163, 184, 0.34)",
          boxShadow: "0 26px 70px rgba(15, 23, 42, 0.16)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", mb: 3 }}>
            <Avatar sx={{ width: 58, height: 58, bgcolor: "secondary.main", boxShadow: "0 12px 24px rgba(234, 88, 12, 0.24)" }}>
              <LockResetRoundedIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0 }}>
                Actualiza tu contrasena
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", lineHeight: 1.7 }}>
                Por seguridad debes crear una nueva clave antes de ingresar al sistema.
              </Typography>
            </Box>
          </Stack>

          <Alert icon={<ShieldRoundedIcon />} severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            Usa una clave nueva de al menos 10 caracteres.
          </Alert>

          {submitError ? (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {submitError}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={handleSubmit}>
            <FormField
              name="password"
              label="Nueva contrasena"
              type="password"
              value={values.password}
              error={errors.password}
              touched={touched.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              autoComplete="new-password"
              helperText="Min. 10 caracteres"
              showPasswordToggle
              sx={{ mb: 2.25 }}
            />

            <FormField
              name="confirmPassword"
              label="Confirmar contrasena"
              type="password"
              value={values.confirmPassword}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              autoComplete="new-password"
              showPasswordToggle
              sx={{ mb: 3 }}
            />

            <AppButton
              type="submit"
              variant="contained"
              color="secondary"
              fullWidth
              loading={isSubmitting}
              loadingLabel="Actualizando..."
              sx={{
                minHeight: 48,
                borderRadius: 2.5,
                fontSize: 16,
                boxShadow: "0 14px 28px rgba(234, 88, 12, 0.24)",
              }}
            >
              Cambiar contrasena
            </AppButton>
          </Box>

          <Divider sx={{ my: 3 }} />

          <AppButton type="button" variant="text" color="secondary" fullWidth onClick={onLogout} disabled={isSubmitting}>
            Salir e iniciar con otra cuenta
          </AppButton>
        </Box>
      </Paper>
    </Box>
  );
};

ChangePasswordPage.getLayout = (page) => page;

export default ChangePasswordPage;
