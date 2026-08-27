import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { Alert, Avatar, Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import BakeryDiningRoundedIcon from "@mui/icons-material/BakeryDiningRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import authService from "services/auth/auth-service";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import { FIELD_VALIDATORS } from "constants/validation";
import { getHomePathForUser } from "configs/access";

const operationHighlights = [
  { label: "Pedidos", value: "Venta diaria", icon: <BakeryDiningRoundedIcon fontSize="small" /> },
  { label: "Produccion", value: "Recetas y avance", icon: <Inventory2RoundedIcon fontSize="small" /> },
  { label: "Vendedores", value: "Clientes asignados", icon: <GroupRoundedIcon fontSize="small" /> },
];

const Login = () => {
  const router = useRouter();
  const [maintenance, setMaintenance] = useState(null);

  useEffect(() => {
    if (router.query.maintenance !== "1") return;
    try {
      const stored = window.sessionStorage.getItem("systemMaintenance");
      setMaintenance(stored ? JSON.parse(stored) : {});
    } catch (error) {
      setMaintenance({});
    }
  }, [router.query.maintenance]);

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit } = useForm(
    { identifier: "", password: "" },
    async (formValues, helpers) => {
      try {
        const result = await authService.login(formValues.identifier.trim(), formValues.password);
        if (result.code !== 1) {
          helpers.setSubmitError(result.message || "No se pudo iniciar sesion");
          return;
        }
        toast.success("Bienvenido");
        if (Number(result.data?.user?.must_change_password) === 1) {
          router.replace("/change-password");
          return;
        }
        router.replace(getHomePathForUser(result.data?.user));
      } catch (error) {
        helpers.setSubmitError("Error de conexion al iniciar sesion");
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        background:
          "radial-gradient(circle at 14% 20%, rgba(234, 88, 12, 0.20), transparent 28%), linear-gradient(135deg, #fff7ed 0%, #f8fafc 45%, #eef2ff 100%)",
        p: { xs: 2, md: 4 },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "auto -8% -22% auto",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(234, 88, 12, 0.12)",
          filter: "blur(4px)",
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1060,
          minHeight: { md: 620 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.08fr 0.92fr" },
          overflow: "hidden",
          position: "relative",
          border: "1px solid rgba(148, 163, 184, 0.34)",
          borderRadius: { xs: 4, md: 5 },
          boxShadow: "0 26px 70px rgba(15, 23, 42, 0.16)",
        }}
      >
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            color: "common.white",
            p: 5,
            background:
              "linear-gradient(145deg, rgba(17, 24, 39, 0.96), rgba(67, 20, 7, 0.92)), radial-gradient(circle at 72% 26%, rgba(251, 146, 60, 0.38), transparent 30%)",
          }}
        >
          <Stack spacing={3}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: "secondary.main" }}>
                <BakeryDiningRoundedIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  Panaderia
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                  Plataforma operativa
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ maxWidth: 470, pt: 5 }}>
              <Chip
                label="Control diario"
                sx={{
                  mb: 2.5,
                  color: "common.white",
                  bgcolor: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.04, letterSpacing: 0 }}>
                Produccion, ventas e inventario en un solo lugar.
              </Typography>
              <Typography variant="body1" sx={{ mt: 2.5, color: "rgba(255,255,255,0.76)", lineHeight: 1.8 }}>
                Entra para revisar pedidos, preparar produccion, controlar materias primas y mantener la operacion lista para la jornada.
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.5}>
            {operationHighlights.map((item) => (
              <Paper
                key={item.label}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  color: "common.white",
                  bgcolor: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ width: 36, height: 36, color: "secondary.main", bgcolor: "rgba(255,255,255,0.92)" }}>
                    {item.icon}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, lineHeight: 1.15 }}>{item.label}</Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.68)" }}>
                      {item.value}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", p: { xs: 2.5, sm: 4, md: 5 } }}>
          <Box sx={{ width: "100%", maxWidth: 420, mx: "auto" }}>
            <Stack spacing={1.5} sx={{ mb: 3.5, alignItems: { xs: "center", md: "flex-start" }, textAlign: { xs: "center", md: "left" } }}>
              <Avatar sx={{ display: { md: "none" }, width: 54, height: 54, bgcolor: "secondary.main", boxShadow: "0 12px 24px rgba(234, 88, 12, 0.24)" }}>
                <BakeryDiningRoundedIcon />
              </Avatar>
              <Chip
                icon={<ShieldRoundedIcon />}
                label="Acceso seguro"
                variant="outlined"
                sx={{
                  alignSelf: { xs: "center", md: "flex-start" },
                  borderColor: "rgba(234, 88, 12, 0.34)",
                  color: "secondary.main",
                  fontWeight: 700,
                }}
              />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0 }}>
                  Bienvenido de nuevo
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", lineHeight: 1.7 }}>
                  Ingresa con tu usuario para continuar con la operacion de hoy.
                </Typography>
              </Box>
            </Stack>

            {submitError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {submitError}
              </Alert>
            )}

            {maintenance && (
              <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>Sistema temporalmente bloqueado</Typography>
                <Typography variant="body2">
                  {maintenance.message || "Hay un mantenimiento programado. Intenta ingresar nuevamente cuando finalice."}
                </Typography>
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
                sx={{ mb: 2.25 }}
              />

              <FormField
                name="password"
                label="Contrasena"
                type="password"
                value={values.password}
                error={errors.password}
                touched={touched.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="********"
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
                sx={{
                  minHeight: 48,
                  borderRadius: 2.5,
                  fontSize: 16,
                  boxShadow: "0 14px 28px rgba(234, 88, 12, 0.24)",
                  "&:hover": {
                    boxShadow: "0 16px 32px rgba(234, 88, 12, 0.30)",
                  },
                }}
              >
                Entrar
              </AppButton>
            </Box>

            <Divider sx={{ my: 3 }} />
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", textAlign: "center" }}>
              Sistema interno para gestion de panaderia.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

Login.authGuard = false;
Login.getLayout = (page) => page;

export default Login;
