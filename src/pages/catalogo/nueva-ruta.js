import { useMemo } from "react";
import { Alert, Box, Grid, Paper, Stack, Typography } from "@mui/material";
import AltRouteOutlinedIcon from "@mui/icons-material/AltRouteOutlined";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";

const NuevaRutaPage = () => {
  const flowLinks = useMemo(
    () => [
      { label: "Rutas", href: "/catalogo/repartidores" },
      { label: "Nueva ruta", href: "/catalogo/nueva-ruta", active: true },
    ],
    []
  );

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit, resetForm } =
    useForm(
      {
        code: "",
        name: "",
        description: "",
        is_active: "1",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.createRoute({
            p_code: formValues.code.trim() || null,
            p_name: formValues.name.trim() || null,
            p_description: formValues.description.trim() || null,
            p_is_active: Number(formValues.is_active),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear la ruta");
            helpers.setSubmitError(result?.message || "Error al crear la ruta");
            return;
          }

          toast.success(result?.message || "Ruta creada correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear la ruta. Verifica tu conexion."));
        }
      },
      {
        code: (value) => {
          if (!value?.trim()) return "El codigo es obligatorio";
          if (value.trim().length < 2) return "El codigo debe tener al menos 2 caracteres";
          return null;
        },
        name: (value) => {
          if (!value?.trim()) return "El nombre es obligatorio";
          if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
          return null;
        },
      }
    );

  return (
    <FlowPageLayout title="Rutas - Nueva" subtitle="Formulario de alta de ruta" links={flowLinks}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", maxWidth: 980, mx: "auto" }}>
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
                <AltRouteOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Informacion de la ruta
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crea una ruta activa para organizar entregas y repartidores.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
              Datos de ruta
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormField
                  name="code"
                  label="Codigo"
                  value={values.code}
                  error={errors.code}
                  touched={touched.code}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="R01"
                  required
                />
              </Grid>

              <Grid item xs={12} md={5}>
                <FormField
                  name="name"
                  label="Nombre"
                  value={values.name}
                  error={errors.name}
                  touched={touched.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Ruta centro"
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormField
                  name="description"
                  label="Descripcion"
                  value={values.description}
                  error={errors.description}
                  touched={touched.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Zona centro"
                />
              </Grid>
            </Grid>
          </Box>

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
              <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando ruta...">
                Crear ruta
              </AppButton>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </FlowPageLayout>
  );
};

export default NuevaRutaPage;
