import { useMemo } from "react";
import { Alert, Grid, MenuItem } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";

const NuevoClientePage = () => {
  const flowLinks = useMemo(
    () => [
      { label: "Clientes", href: "/catalogo/clientes" },
      { label: "Nuevo cliente", href: "/catalogo/nuevo-cliente", active: true },
    ],
    []
  );

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit } =
    useForm(
      {
        tax_id: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        status: "active",
        credit_limit: "0",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.createCustomer({
            p_tax_id: formValues.tax_id.trim() || null,
            p_name: formValues.name.trim() || null,
            p_email: formValues.email.trim() || null,
            p_phone: formValues.phone.trim() || null,
            p_address: formValues.address.trim() || null,
            p_status: formValues.status,
            p_credit_limit: formValues.credit_limit === "" ? 0 : Number(formValues.credit_limit),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear el cliente");
            helpers.setSubmitError(result?.message || "Error al crear el cliente");
            return;
          }

          toast.success(result?.message || "Cliente creado correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear el cliente. Verifica tu conexion."));
        }
      },
      {
        name: (value) => {
          if (!value?.trim()) return "El nombre es obligatorio";
          if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
          return null;
        },
        email: (value) => {
          if (!value?.trim()) return null;
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Ingresa un correo valido";
          return null;
        },
        credit_limit: (value) => {
          if (value === "" || value === null || value === undefined) return null;
          if (Number(value) < 0) return "El limite de credito debe ser mayor o igual a 0";
          return null;
        },
      }
    );

  return (
    <FlowPageLayout title="Clientes - Nuevo" subtitle="Formulario de alta de cliente" links={flowLinks}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
        <Grid item xs={12} md={4}>
          <FormField
            name="tax_id"
            label="Identificacion"
            value={values.tax_id}
            error={errors.tax_id}
            touched={touched.tax_id}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="CC/NIT"
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
            placeholder="Cliente principal"
            required
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="email"
            label="Correo"
            type="email"
            value={values.email}
            error={errors.email}
            touched={touched.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="cliente@example.com"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="phone"
            label="Telefono"
            value={values.phone}
            error={errors.phone}
            touched={touched.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="3000000000"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormField
            name="address"
            label="Direccion"
            value={values.address}
            error={errors.address}
            touched={touched.address}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Calle 123"
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <FormField
            select
            name="status"
            label="Estado"
            value={values.status}
            error={errors.status}
            touched={touched.status}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <MenuItem value="active">Activo</MenuItem>
            <MenuItem value="inactive">Inactivo</MenuItem>
          </FormField>
        </Grid>

        <Grid item xs={12} md={2}>
          <FormField
            name="credit_limit"
            label="Credito"
            type="number"
            value={values.credit_limit}
            error={errors.credit_limit}
            touched={touched.credit_limit}
            onChange={handleChange}
            onBlur={handleBlur}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>

        <Grid item xs={12}>
          <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando cliente...">
            Crear cliente
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default NuevoClientePage;
