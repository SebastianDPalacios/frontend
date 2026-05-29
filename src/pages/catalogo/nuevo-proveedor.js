import { useMemo } from "react";
import { Alert, Grid } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";

const NuevoProveedorPage = () => {
  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/catalogo/proveedores" },
      { label: "Nuevo proveedor", href: "/catalogo/nuevo-proveedor", active: true },
    ],
    []
  );

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit, resetForm } =
    useForm(
      {
        tax_id: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        contact_name: "",
        status: "ACTIVE",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.createSupplier({
            p_tax_id: formValues.tax_id.trim() || null,
            p_name: formValues.name.trim() || null,
            p_email: formValues.email.trim() || null,
            p_phone: formValues.phone.trim() || null,
            p_address: formValues.address.trim() || null,
            p_contact_name: formValues.contact_name.trim() || null,
            p_status: formValues.status.trim() || null,
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear el proveedor");
            helpers.setSubmitError(result?.message || "Error al crear el proveedor");
            return;
          }

          toast.success(result?.message || "Proveedor creado correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear el proveedor. Verifica tu conexion."));
        }
      }
    );

  return (
    <FlowPageLayout title="Proveedores - Nuevo" subtitle="Formulario de alta de proveedor" links={flowLinks}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
        <Grid item xs={12} md={4}>
          <FormField
            name="tax_id"
            label="RUC / NIT"
            value={values.tax_id}
            error={errors.tax_id}
            touched={touched.tax_id}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="123456789"
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
            placeholder="Panadería XYZ"
            required
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="email"
            label="Correo electrónico"
            type="email"
            value={values.email}
            error={errors.email}
            touched={touched.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="proveedor@example.com"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="phone"
            label="Teléfono"
            value={values.phone}
            error={errors.phone}
            touched={touched.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="123456789"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="address"
            label="Dirección"
            value={values.address}
            error={errors.address}
            touched={touched.address}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Av. Principal 123"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="contact_name"
            label="Contacto"
            value={values.contact_name}
            error={errors.contact_name}
            touched={touched.contact_name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="María Pérez"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="status"
            label="Estado"
            value={values.status}
            error={errors.status}
            touched={touched.status}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="ACTIVE"
            helperText="ACTIVE / INACTIVE"
          />
        </Grid>

        <Grid item xs={12}>
          <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando proveedor...">
            Crear proveedor
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default NuevoProveedorPage;
