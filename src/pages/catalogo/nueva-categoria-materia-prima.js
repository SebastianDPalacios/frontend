import { useMemo } from "react";
import { Alert, Box, Grid, Paper, Stack, Typography } from "@mui/material";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";

const NuevaCategoriaMateriaPrimaPage = () => {
  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/catalogo/categorias-materia-prima" },
      { label: "Nueva categoria", href: "/catalogo/nueva-categoria-materia-prima", active: true },
    ],
    []
  );

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit, resetForm } =
    useForm(
      {
        name: "",
        description: "",
        is_active: "1",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.createRawMaterialCategory({
            p_name: formValues.name.trim() || null,
            p_description: formValues.description.trim() || null,
            p_is_active: Number(formValues.is_active),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear la categoria de materia prima");
            helpers.setSubmitError(result?.message || "Error al crear la categoria de materia prima");
            return;
          }

          toast.success(result?.message || "Categoria de materia prima creada correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear la categoria de materia prima. Verifica tu conexion."));
        }
      }
    );

  return (
    <FlowPageLayout title="Categorias de materia prima - Nuevo" subtitle="Formulario de alta de categoria de materia prima" links={flowLinks}>
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
                <InventoryOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Informacion de la categoria
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crea una categoria activa para clasificar insumos y materias primas.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
              Datos de categoria
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormField
                  name="name"
                  label="Nombre"
                  value={values.name}
                  error={errors.name}
                  touched={touched.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Harinas"
                  required
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <FormField
                  name="description"
                  label="Descripcion"
                  value={values.description}
                  error={errors.description}
                  touched={touched.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Categoria para harinas y levaduras"
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
              <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando categoria...">
                Crear categoria
              </AppButton>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </FlowPageLayout>
  );
};

export default NuevaCategoriaMateriaPrimaPage;
