import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import RawMaterialEditDialog from "components/organisms/catalog/RawMaterialEditDialog";
import RawMaterialsTable from "components/organisms/catalog/RawMaterialsTable";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import FlowPageLayout from "views/modules/FlowPageLayout";

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

const fromBaseQuantity = (quantity, packageUnit) => {
  const numericQuantity = Number(quantity || 0);
  if (numericQuantity <= 0) return "";
  if (packageUnit === "kg" || packageUnit === "l") return Number((numericQuantity / 1000).toFixed(3)).toString();
  return numericQuantity.toString();
};

const calculateUnitCost = ({ packageQuantity, packageUnit, packageCost }) => {
  const baseQuantity = toBaseQuantity(packageQuantity, packageUnit);
  const numericCost = Number(packageCost || 0);
  if (baseQuantity <= 0 || numericCost <= 0) return "";
  return Number((numericCost / baseQuantity).toFixed(6)).toString();
};

const getUnitCostLabel = (unit) => (unit === "ml" ? "Costo por ml" : "Costo por gramo");

const formatPackageQuantity = (quantity, unit) => {
  const amount = Number(quantity || 0);
  if (amount <= 0) return "";
  if (unit === "ml") {
    return amount >= 1000 ? `${Number((amount / 1000).toFixed(3)).toLocaleString("es-CO")} litros` : `${amount.toLocaleString("es-CO")} ml`;
  }
  return amount >= 1000 ? `${Number((amount / 1000).toFixed(3)).toLocaleString("es-CO")} kg` : `${amount.toLocaleString("es-CO")} g`;
};

const formatPackageSummary = (item) => {
  const name = item.purchase_package_name;
  const quantity = Number(item.purchase_package_quantity || 0);
  if (!name || quantity <= 0) return "Sin presentacion";
  return `${name} de ${formatPackageQuantity(quantity, item.unit)}`;
};

const normalizeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
  style: "currency",
  currency: "COP",
});

const PAGE_SIZE = 10;

const getOptionName = (items, id, fallback = "Sin asignar") => {
  const match = items.find((item) => Number(item.id) === Number(id));
  return match?.name || fallback;
};

const emptyForm = {
  sku: "",
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
  is_active: 1,
};

const RawMaterialsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingStatusId, setPendingStatusId] = useState(null);

  const loadRawMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [materialsResponse, categoriesResponse, suppliersResponse] = await Promise.all([
        catalogService.getRawMaterials({ page: 1, pageSize: 200 }),
        catalogService.getRawMaterialCategories({}),
        catalogService.getSuppliers({ page: 1, pageSize: 200 }),
      ]);

      if (materialsResponse?.code !== 1) {
        setError(materialsResponse?.message || "No se pudo cargar el catÃ¡logo de materias primas");
        return;
      }

      setItems(normalizeList(materialsResponse.data));
      setCategories(normalizeList(categoriesResponse?.data));
      setSuppliers(normalizeList(suppliersResponse?.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Error de red al cargar materias primas"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRawMaterials();
  }, [loadRawMaterials]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.sku, getOptionName(categories, item.category_id, ""), getOptionName(suppliers, item.supplier_id, "")]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [categories, items, search, suppliers]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const openEditDialog = (item) => {
    const unit = item.unit === "ml" ? "ml" : "g";
    const packageUnit = unit === "ml" ? "l" : "kg";
    setEditingItem(item);
    setForm({
      sku: item.sku || "",
      name: item.name || "",
      description: item.description || "",
      category_id: item.category_id ? String(item.category_id) : "",
      supplier_id: item.supplier_id ? String(item.supplier_id) : "",
      unit,
      purchase_package_name: item.purchase_package_name || getDefaultPackageName(unit),
      package_quantity: fromBaseQuantity(item.purchase_package_quantity, packageUnit),
      package_unit: packageUnit,
      package_cost: "",
      unit_cost: item.unit_cost ?? "",
      min_stock: item.min_stock ?? "",
      is_active: Number(item.is_active ?? 1),
    });
  };

  const closeEditDialog = () => {
    if (saving) {
      return;
    }
    setEditingItem(null);
    setForm(emptyForm);
  };

  const updateField = (field) => (event) => {
    const value = field === "is_active" ? Number(event.target.checked) : event.target.value;
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "unit") {
        next.package_unit = value === "ml" ? "l" : "kg";
        if (!current.purchase_package_name || current.purchase_package_name === getDefaultPackageName(current.unit)) {
          next.purchase_package_name = getDefaultPackageName(value);
        }
      }
      if (["unit", "package_quantity", "package_unit", "package_cost"].includes(field)) {
        const nextUnitCost = calculateUnitCost({
          packageQuantity: next.package_quantity,
          packageUnit: next.package_unit,
          packageCost: next.package_cost,
        });
        if (nextUnitCost) {
          next.unit_cost = nextUnitCost;
        }
      }
      return next;
    });
  };

  const saveRawMaterial = async () => {
    if (!editingItem) {
      return;
    }
    if (!form.name.trim()) {
      toast.error("Escribe el nombre de la materia prima");
      return;
    }
    if (!form.category_id) {
      toast.error("Selecciona una categorÃ­a");
      return;
    }

    setSaving(true);
    try {
      const response = await catalogService.updateRawMaterial(editingItem.id, {
        p_name: form.name.trim(),
        p_description: form.description.trim() || null,
        p_category_id: Number(form.category_id),
        p_supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        p_unit: form.unit || null,
        p_purchase_package_name: form.purchase_package_name.trim() || getDefaultPackageName(form.unit),
        p_purchase_package_quantity: toBaseQuantity(form.package_quantity, form.package_unit),
        p_unit_cost: form.unit_cost === "" ? null : Number(form.unit_cost),
        p_min_stock: form.min_stock === "" ? null : Number(form.min_stock),
        p_is_active: Number(form.is_active),
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo actualizar la materia prima");
        return;
      }

      toast.success(response?.message || "Materia prima actualizada");
      closeEditDialog();
      await loadRawMaterials();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Error de red al actualizar la materia prima"));
    } finally {
      setSaving(false);
    }
  };

  const toggleRawMaterialStatus = async (item) => {
    const nextStatus = Number(item.is_active) === 1 ? 0 : 1;
    setPendingStatusId(item.id);
    try {
      const response = await catalogService.setRawMaterialStatus(item.id, {
        p_is_active: nextStatus,
      });

      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo cambiar el estado");
        return;
      }

      toast.success(nextStatus === 1 ? "Materia prima activada" : "Materia prima desactivada");
      await loadRawMaterials();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Error de red al cambiar el estado"));
    } finally {
      setPendingStatusId(null);
    }
  };

  return (
    <FlowPageLayout title="Materias primas" subtitle="Crea, edita y depura los insumos usados en recetas e inventario.">
      <RawMaterialsTable
        loading={loading}
        error={error}
        items={items}
        filteredItems={filteredItems}
        visibleItems={visibleItems}
        categories={categories}
        suppliers={suppliers}
        search={search}
        pendingStatusId={pendingStatusId}
        unitOptions={unitOptions}
        moneyFormatter={moneyFormatter}
        onSearchChange={setSearch}
        onEdit={openEditDialog}
        onToggleStatus={toggleRawMaterialStatus}
        getOptionName={getOptionName}
        formatPackageSummary={formatPackageSummary}
        currentPage={currentPage}
        totalPages={totalPages}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
      />

      <RawMaterialEditDialog
        open={Boolean(editingItem)}
        saving={saving}
        form={form}
        categories={categories}
        suppliers={suppliers}
        unitOptions={unitOptions}
        purchaseUnitOptions={purchaseUnitOptions}
        unitHelperText={unitHelperText}
        onClose={closeEditDialog}
        onUpdateField={updateField}
        onSave={saveRawMaterial}
        getDefaultPackageName={getDefaultPackageName}
        getUnitCostLabel={getUnitCostLabel}
      />
    </FlowPageLayout>
  );
};

export default RawMaterialsPage;
