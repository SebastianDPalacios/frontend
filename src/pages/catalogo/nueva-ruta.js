import { useMemo } from "react";
import { Alert, Grid, MenuItem } from "@mui/material";
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

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit } =
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

      <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
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

        <Grid item xs={12} md={4}>
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

        <Grid item xs={12} md={3}>
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

        <Grid item xs={12} md={2}>
          <FormField
            select
            name="is_active"
            label="Estado"
            value={values.is_active}
            error={errors.is_active}
            touched={touched.is_active}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <MenuItem value="1">Activa</MenuItem>
            <MenuItem value="0">Inactiva</MenuItem>
          </FormField>
        </Grid>

        <Grid item xs={12}>
          <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando ruta...">
            Crear ruta
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default NuevaRutaPage;
