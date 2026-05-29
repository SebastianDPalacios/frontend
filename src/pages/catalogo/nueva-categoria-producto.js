import { useMemo } from "react";
import { Alert, Grid } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";

const NuevaCategoriaProductoPage = () => {
  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/catalogo/categorias-producto" },
      { label: "Nueva categoría", href: "/catalogo/nueva-categoria-producto", active: true },
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
          const result = await catalogService.createProductCategory({
            p_name: formValues.name.trim() || null,
            p_description: formValues.description.trim() || null,
            p_is_active: Number(formValues.is_active),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear la categoría de producto");
            helpers.setSubmitError(result?.message || "Error al crear la categoría de producto");
            return;
          }

          toast.success(result?.message || "Categoría de producto creada correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear la categoria de producto. Verifica tu conexion."));
        }
      }
    );

  return (
    <FlowPageLayout title="Categorías de producto - Nuevo" subtitle="Formulario de alta de categoría de producto" links={flowLinks}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
        <Grid item xs={12} md={4}>
          <FormField
            name="name"
            label="Nombre"
            value={values.name}
            error={errors.name}
            touched={touched.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Panificación"
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormField
            name="description"
            label="Descripción"
            value={values.description}
            error={errors.description}
            touched={touched.description}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Categoría de panes y bollería"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <FormField
            name="is_active"
            label="Activo"
            value={values.is_active}
            error={errors.is_active}
            touched={touched.is_active}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="1"
            helperText="1 = activo, 0 = inactivo"
          />
        </Grid>

        <Grid item xs={12}>
          <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando categoría...">
            Crear categoría de producto
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default NuevaCategoriaProductoPage;
