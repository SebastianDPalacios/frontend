import { useMemo } from "react";
import { Alert, Grid } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";

const NuevaTasaImpuestoPage = () => {
  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/catalogo/tasas-de-impuesto" },
      { label: "Nueva tasa", href: "/catalogo/nueva-tasa-impuesto", active: true },
    ],
    []
  );

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit, resetForm } =
    useForm(
      {
        code: "",
        name: "",
        rate_percent: "",
        is_active: "1",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.createTaxRate({
            p_code: formValues.code.trim() || null,
            p_name: formValues.name.trim() || null,
            p_rate_percent: formValues.rate_percent ? Number(formValues.rate_percent) : null,
            p_is_active: Number(formValues.is_active),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear la tasa de impuesto");
            helpers.setSubmitError(result?.message || "Error al crear la tasa de impuesto");
            return;
          }

          toast.success(result?.message || "Tasa de impuesto creada correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear la tasa de impuesto. Verifica tu conexion."));
        }
      }
    );

  return (
    <FlowPageLayout title="Tasas de impuesto - Nueva" subtitle="Formulario de alta de tasa de impuesto" links={flowLinks}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
        <Grid item xs={12} md={4}>
          <FormField
            name="code"
            label="Código"
            value={values.code}
            error={errors.code}
            touched={touched.code}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="IVA10"
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
            placeholder="IVA 10%"
            required
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <FormField
            name="rate_percent"
            label="Porcentaje"
            type="number"
            value={values.rate_percent}
            error={errors.rate_percent}
            touched={touched.rate_percent}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="10"
            inputProps={{ min: 0, step: 0.01 }}
            required
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
          <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando tasa...">
            Crear tasa de impuesto
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default NuevaTasaImpuestoPage;
