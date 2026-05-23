import { useMemo, useState } from "react";
import { Alert, Grid, TextField } from "@mui/material";
import toast from "react-hot-toast";
import usersService from "services/users/users-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import AppButton from "@core/components/ui/AppButton";

const UsersNewPage = () => {
  const [form, setForm] = useState({ full_name: "", username: "", email: "", password: "", role_code: "ADMIN" });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/users/list" },
      { label: "Nuevo", href: "/users/new", active: true },
    ],
    []
  );

  const onChange = (field) => (event) => {
    setFieldErrors((prev) => ({ ...prev, [field]: null }));
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.full_name.trim()) {
      nextErrors.full_name = "El nombre completo es obligatorio";
    }

    if (!form.username.trim()) {
      nextErrors.username = "El usuario es obligatorio";
    } else if (!/^[a-zA-Z0-9._-]{4,32}$/.test(form.username.trim())) {
      nextErrors.username = "Usa 4-32 caracteres (letras, numeros, punto, guion o guion bajo)";
    }

    if (!form.email.trim()) {
      nextErrors.email = "El correo es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Ingresa un correo valido";
    }

    if (!form.password) {
      nextErrors.password = "La contrasena es obligatoria";
    } else if (form.password.length < 8) {
      nextErrors.password = "La contrasena debe tener al menos 8 caracteres";
    }

    if (!form.role_code.trim()) {
      nextErrors.role_code = "El rol es obligatorio";
    } else if (!/^[A-Z_]{2,30}$/.test(form.role_code.trim())) {
      nextErrors.role_code = "Usa solo mayusculas y guion bajo (ej: ADMIN)";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (saving) {
      return;
    }

    setError(null);

    if (!validateForm()) {
      setError("Corrige los campos marcados");
      return;
    }

    setSaving(true);
    try {
      const result = await usersService.createUser({
        p_username: form.username.trim(),
        p_email: form.email.trim(),
        p_password_hash: form.password,
        p_password_algo: "bcrypt",
        p_full_name: form.full_name.trim(),
        p_phone: null,
        p_role_code: form.role_code.trim().toUpperCase(),
        p_must_change_password: 1,
      });

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo crear el usuario");
        return;
      }

      toast.success(result?.message || "Usuario creado correctamente");
      setForm({ full_name: "", username: "", email: "", password: "", role_code: "ADMIN" });
    } catch (requestError) {
      setError("Error de red al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Usuarios - Nuevo" subtitle="Formulario de alta conectado al backend" links={flowLinks}>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2} component="form" onSubmit={onSubmit}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Nombre completo"
            value={form.full_name}
            onChange={onChange("full_name")}
            error={Boolean(fieldErrors.full_name)}
            helperText={fieldErrors.full_name || " "}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Usuario"
            value={form.username}
            onChange={onChange("username")}
            error={Boolean(fieldErrors.username)}
            helperText={fieldErrors.username || " "}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Correo"
            value={form.email}
            onChange={onChange("email")}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email || " "}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="password"
            label="Contrasena"
            value={form.password}
            onChange={onChange("password")}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password || " "}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Rol"
            value={form.role_code}
            onChange={onChange("role_code")}
            error={Boolean(fieldErrors.role_code)}
            helperText={fieldErrors.role_code || " "}
          />
        </Grid>
        <Grid item xs={12}>
          <AppButton type="submit" color="secondary" disabled={saving}>{saving ? "Guardando..." : "Crear usuario"}</AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default UsersNewPage;
