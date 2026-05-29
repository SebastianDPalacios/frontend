import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { Box, Typography, Alert } from "@mui/material";
import authService from "services/auth/auth-service";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import AppCard from "@core/components/ui/AppCard";
import { FIELD_VALIDATORS } from "constants/validation";

const Login = () => {
  const router = useRouter();

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit } = useForm(
    { identifier: "", password: "" },
    async (formValues, helpers) => {
      try {
        const result = await authService.login(formValues.identifier.trim(), formValues.password);
        if (result.code !== 1) {
          helpers.setSubmitError(result.message || "No se pudo iniciar sesión");
          return;
        }
        toast.success("¡Bienvenido!");
        router.replace("/dashboards/analytics");
      } catch (error) {
        helpers.setSubmitError("Error de conexión al iniciar sesión");
      }
    },
    {
      identifier: FIELD_VALIDATORS.identifier,
      password: FIELD_VALIDATORS.password,
    }
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(145deg, #0f172a 0%, #1f2937 45%, #111827 100%)",
        p: { xs: 1.5, sm: 2 },
      }}
    >
      <AppCard sx={{ width: "100%", maxWidth: 420 }} contentSx={{ p: { xs: 2.5, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, fontSize: { xs: 24, sm: 28 } }}>
          Ingresar
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Panadería - Plataforma Operativa
        </Typography>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <FormField
            name="identifier"
            label="Usuario o correo"
            value={values.identifier}
            error={errors.identifier}
            touched={touched.identifier}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="usuario@example.com"
            disabled={isSubmitting}
            autoComplete="username"
            sx={{ mb: 2 }}
          />

          <FormField
            name="password"
            label="Contraseña"
            type="password"
            value={values.password}
            error={errors.password}
            touched={touched.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="current-password"
            showPasswordToggle
            sx={{ mb: 3 }}
          />

          <AppButton
            type="submit"
            variant="contained"
            color="secondary"
            fullWidth
            loading={isSubmitting}
            loadingLabel="Validando..."
          >
            Entrar
          </AppButton>
        </Box>
      </AppCard>
    </Box>
  );
};

Login.authGuard = false;
Login.getLayout = (page) => page;

export default Login;
