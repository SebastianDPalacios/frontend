import { useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { Box, TextField, Typography } from "@mui/material";
import authService from "services/auth/auth-service";
import AppButton from "@core/components/ui/AppButton";
import AppCard from "@core/components/ui/AppCard";

const Login = () => {
  const router = useRouter();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await authService.login(form.identifier, form.password);
      if (result.code !== 1) {
        toast.error(result.message || "No se pudo iniciar sesion");
        return;
      }
      toast.success("Bienvenido");
      router.replace("/dashboards/analytics");
    } catch (error) {
      toast.error("Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

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
          Panaderia - plataforma operativa
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <TextField
            fullWidth
            label="Usuario o correo"
            value={form.identifier}
            onChange={onChange("identifier")}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="password"
            label="Contrasena"
            value={form.password}
            onChange={onChange("password")}
            sx={{ mb: 3 }}
          />
          <AppButton type="submit" variant="contained" color="secondary" fullWidth disabled={loading}>
            {loading ? "Validando..." : "Entrar"}
          </AppButton>
        </Box>
      </AppCard>
    </Box>
  );
};

Login.authGuard = false;
Login.getLayout = (page) => page;

export default Login;
