import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import RawMaterialCreateForm from "components/organisms/catalog/RawMaterialCreateForm";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FlowPageLayout from "views/modules/FlowPageLayout";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const unitOptions = [
  { value: "g", label: "Gramo" },
  { value: "ml", label: "Mililitro" },
];

const unitHelperText = "Usa gramos para harinas, azucar y secos; mililitros para aceites y liquidos.";

const purchaseUnitOptions = {
  g: [
    { value: "g", label: "Gramos" },
    { value: "kg", label: "Kilos" },
  ],
  ml: [
    { value: "ml", label: "Mililitros" },
    { value: "l", label: "Litros" },
  ],
};

const getDefaultPackageName = (unit) => (unit === "ml" ? "Garrafa" : "Bulto");

const toBaseQuantity = (quantity, unit) => {
  const numericQuantity = Number(quantity || 0);
  if (numericQuantity <= 0) return 0;
  if (unit === "kg" || unit === "l") return numericQuantity * 1000;
  return numericQuantity;
};

const calculateUnitCost = ({ packageQuantity, packageUnit, packageCost }) => {
  const baseQuantity = toBaseQuantity(packageQuantity, packageUnit);
  const numericCost = Number(packageCost || 0);
  if (baseQuantity <= 0 || numericCost <= 0) return "";
  return Number((numericCost / baseQuantity).toFixed(6)).toString();
};

const getUnitCostLabel = (unit) => (unit === "ml" ? "Costo por ml" : "Costo por gramo");

const getFriendlyRawMaterialError = (error) => {
  const message = getApiErrorMessage(error, "No se pudo crear la materia prima");
  if (!message || message === "Error interno del servidor" || message.includes("status code 500")) {
    return "No se pudo crear la materia prima. Revisa que la categoria, proveedor, costo y stock esten completos.";
  }
  return message;
};

const NuevaMateriaPrimaPage = () => {
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);

      try {
        const [categoriesResult, suppliersResult] = await Promise.all([
          catalogService.getRawMaterialCategories({ onlyActive: 1 }),
          catalogService.getSuppliers({ status: "active", page: 1, pageSize: 200 }),
        ]);

        setCategories(normalizeList(categoriesResult?.data ?? categoriesResult));
        setSuppliers(normalizeList(suppliersResult?.data ?? suppliersResult));
      } catch (error) {
        setCategories([]);
        setSuppliers([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit, resetForm, setFieldValue } =
    useForm(
      {
        name: "",
        description: "",
        category_id: "",
        supplier_id: "",
        unit: "g",
        purchase_package_name: "Bulto",
        package_quantity: "",
        package_unit: "kg",
        package_cost: "",
        unit_cost: "",
        min_stock: "",
        is_active: "1",
      },
      async (formValues, helpers) => {
        if (!formValues.name.trim()) {
          toast.error("Escribe el nombre de la materia prima.");
          return;
        }
        if (!formValues.category_id) {
          toast.error("Selecciona una categoria activa para la materia prima.");
          return;
        }
        if (!formValues.package_quantity || Number(formValues.package_quantity) <= 0) {
          toast.error("Escribe la cantidad del empaque para calcular el costo.");
          return;
        }
        if (!formValues.package_cost || Number(formValues.package_cost) <= 0) {
          toast.error("Escribe el costo total del empaque.");
          return;
        }
        if (!formValues.unit_cost || Number(formValues.unit_cost) <= 0) {
          toast.error("Calcula o escribe el costo por gramo/ml antes de guardar.");
          return;
        }

        try {
          const result = await catalogService.createRawMaterial({
            p_name: formValues.name.trim(),
            p_description: formValues.description.trim(),
            p_category_id: formValues.category_id ? Number(formValues.category_id) : null,
            p_supplier_id: formValues.supplier_id ? Number(formValues.supplier_id) : null,
            p_unit: formValues.unit.trim() || null,
            p_purchase_package_name: formValues.purchase_package_name.trim() || getDefaultPackageName(formValues.unit),
            p_purchase_package_quantity: toBaseQuantity(formValues.package_quantity, formValues.package_unit),
            p_unit_cost: formValues.unit_cost ? Number(formValues.unit_cost) : null,
            p_min_stock: formValues.min_stock ? Number(formValues.min_stock) : null,
            p_is_active: Number(formValues.is_active),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear la materia prima. Revisa los datos seleccionados.");
            return;
          }

          toast.success(result?.message || "Materia prima creada correctamente");
          helpers.resetForm();
        } catch (requestError) {
          toast.error(getFriendlyRawMaterialError(requestError));
        }
      }
    );

  const handleCostCalculatorChange = (event) => {
    const { name, value } = event.target;
    handleChange(event);

    const nextValues = { ...values, [name]: value };
    if (name === "unit") {
      const nextPackageUnit = value === "ml" ? "l" : "kg";
      nextValues.package_unit = nextPackageUnit;
      setFieldValue("package_unit", nextPackageUnit);
      if (!values.purchase_package_name || values.purchase_package_name === getDefaultPackageName(values.unit)) {
        nextValues.purchase_package_name = getDefaultPackageName(value);
        setFieldValue("purchase_package_name", nextValues.purchase_package_name);
      }
    }

    const nextUnitCost = calculateUnitCost({
      packageQuantity: nextValues.package_quantity,
      packageUnit: nextValues.package_unit,
      packageCost: nextValues.package_cost,
    });

    if (nextUnitCost) {
      setFieldValue("unit_cost", nextUnitCost);
    }
  };

  return (
    <FlowPageLayout title="Nueva materia prima" subtitle="Registra insumos para recetas, compras y control de inventario.">
      <RawMaterialCreateForm
        values={values}
        errors={errors}
        touched={touched}
        isSubmitting={isSubmitting}
        categories={categories}
        suppliers={suppliers}
        loadingOptions={loadingOptions}
        unitOptions={unitOptions}
        purchaseUnitOptions={purchaseUnitOptions}
        unitHelperText={unitHelperText}
        onSubmit={handleSubmit}
        onChange={handleChange}
        onBlur={handleBlur}
        onCostCalculatorChange={handleCostCalculatorChange}
        onReset={resetForm}
        getUnitCostLabel={getUnitCostLabel}
      />
    </FlowPageLayout>
  );
};

export default NuevaMateriaPrimaPage;
