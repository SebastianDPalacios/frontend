import { useEffect, useMemo, useState } from "react";
import { Alert } from "@mui/material";
import toast from "react-hot-toast";
import InventoryMovementHistory from "components/organisms/inventory/InventoryMovementHistory";
import ManualAdjustmentPanel from "components/organisms/inventory/ManualAdjustmentPanel";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, isIntegerUnit, normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const itemTypeLabels = {
  all: "Todos",
  product: "Productos",
  raw_material: "Materia prima",
};

const movementTypeLabels = {
  all: "Todos",
  purchase_in: "Entrada por factura",
  production_in: "Entrada por producción",
  production_out: "Salida por receta",
  sale_out: "Salida por venta",
  adjustment_in: "Ajuste: suma",
  adjustment_out: "Ajuste: resta",
  waste_out: "Merma o daño",
};

const movementTypeColors = {
  purchase_in: "success",
  production_in: "success",
  adjustment_in: "success",
  production_out: "warning",
  sale_out: "warning",
  adjustment_out: "warning",
  waste_out: "error",
};

const movementTypeOptions = [
  {
    value: "adjustment_in",
    title: "Entrada de stock",
    helper: "Suma existencias por compra, inventario inicial o ajuste.",
    color: "success",
  },
  {
    value: "adjustment_out",
    title: "Salida de stock",
    helper: "Resta existencias por merma, ajuste o salida manual.",
    color: "warning",
  },
];

const MAX_INVENTORY_QUANTITY = 99999999999.999;
const HISTORY_PAGE_SIZE = 12;
const ITEMS_PAGE_SIZE = 9;

const formatNumber = (value, unit) => formatInventoryQuantity(value, unit);

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "COP",
});

const formatUnits = (value) => numberFormatter.format(Number(value || 0));
const formatMoney = (value) => moneyFormatter.format(Number(value || 0));
const onlyPesos = (value) => String(value || "").replace(/\D/g, "");
const formatDate = (value) => (value ? String(value).slice(0, 10) : "Sin fecha");

const purchaseUnitOptions = [
  { value: "kg", label: "Kilos", factor: 1000, baseUnit: "g" },
  { value: "g", label: "Gramos", factor: 1, baseUnit: "g" },
  { value: "l", label: "Litros", factor: 1000, baseUnit: "ml" },
  { value: "ml", label: "Mililitros", factor: 1, baseUnit: "ml" },
  { value: "unit", label: "Unidades", factor: 1, baseUnit: "unit" },
  { value: "package", label: "Paquetes", factor: 1, baseUnit: "package" },
  { value: "roll", label: "Rollos", factor: 1, baseUnit: "roll" },
  { value: "bag", label: "Bolsas", factor: 1, baseUnit: "bag" },
  { value: "box", label: "Cajas", factor: 1, baseUnit: "box" },
];

const formatPackageQuantity = (quantity, unit) => {
  const amount = Number(quantity || 0);
  if (amount <= 0) return "";
  if (unit === "ml") {
    return amount >= 1000 ? `${Number((amount / 1000).toFixed(3)).toLocaleString("es-CO")} litros` : `${amount.toLocaleString("es-CO")} ml`;
  }
  if (unit === "g") {
    return amount >= 1000 ? `${Number((amount / 1000).toFixed(3)).toLocaleString("es-CO")} kg` : `${amount.toLocaleString("es-CO")} g`;
  }
  const option = purchaseUnitOptions.find((item) => item.baseUnit === unit);
  const label = option?.label?.toLowerCase() || unit;
  return `${amount.toLocaleString("es-CO")} ${label}`;
};

const getPurchaseUnitOptions = (item) => {
  const baseOptions = purchaseUnitOptions.filter((option) => option.baseUnit === item.unit);
  const packageQuantity = Number(item.purchase_package_quantity || 0);
  const packageName = String(item.purchase_package_name || "").trim();

  if (item.item_type !== "raw_material" || packageQuantity <= 0 || !packageName) {
    return baseOptions;
  }

  return [
    {
      value: "package",
      label: `${packageName} (${formatPackageQuantity(packageQuantity, item.unit)})`,
      factor: packageQuantity,
      baseUnit: item.unit,
    },
    ...baseOptions,
  ];
};

const getMovementExplanation = (movement) => {
  if (movement.reference_type === "purchase_order") {
    return `Factura ${movement.invoice_number || `#${movement.reference_id}`} de ${movement.supplier_name || "proveedor"}`;
  }

  if (movement.reference_type === "production_batch") {
    return `Moje ${movement.production_recipe_name || `#${movement.reference_id}`}`;
  }

  if (movement.reference_type === "production_output_material") {
    return `Ingrediente posterior para ${movement.output_product_name || "producto final"}`;
  }

  if (movement.reference_type === "manual") {
    return movement.notes || "Ajuste manual de inventario";
  }

  return movement.notes || "Movimiento de inventario";
};

const InventoryMovementsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [movementType, setMovementType] = useState("adjustment_in");
  const [itemTypeFilter, setItemTypeFilter] = useState("raw_material");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState({});
  const [purchaseRows, setPurchaseRows] = useState({});
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [movementHistory, setMovementHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historyItemType, setHistoryItemType] = useState("all");
  const [historyMovementType, setHistoryMovementType] = useState("all");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [showManualAdjustment, setShowManualAdjustment] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);

  const totalHistoryPages = Math.max(Math.ceil(historyTotal / HISTORY_PAGE_SIZE), 1);
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 50,
          branchId: selectedBranch || undefined,
        });

        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar movimientos de inventario");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        const products = normalizeRows(response.data?.products);
        const materials = normalizeRows(response.data?.raw_materials);

        const productItems = products.map((product) => ({
          id: `product-${product.id}`,
          item_type: "product",
          item_id: Number(product.id),
          name: getDisplayName(product),
          unit: product.unit || "unit",
          quantity_on_hand: product.quantity_on_hand || 0,
          sku: product.sku || product.code || "",
        }));

        const materialItems = materials.map((material) => ({
          id: `raw_material-${material.id}`,
          item_type: "raw_material",
          item_id: Number(material.id),
          name: getDisplayName(material),
          unit: material.unit || "unit",
          quantity_on_hand: material.quantity_on_hand || 0,
          purchase_package_name: material.purchase_package_name || null,
          purchase_package_quantity: material.purchase_package_quantity || null,
          inventory_usage_type: material.inventory_usage_type || "production",
          sku: material.sku || material.code || "",
        }));

        setBranches(branchRows);
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
        setItems([...materialItems, ...productItems]);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar movimientos de inventario"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [reloadKey, selectedBranch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyDateFrom, historyDateTo, historyItemType, historyMovementType, historySearch, selectedBranch]);

  useEffect(() => {
    setItemsPage(1);
  }, [itemTypeFilter, movementType, search, selectedBranch]);

  useEffect(() => {
    const run = async () => {
      if (!selectedBranch) {
        setMovementHistory([]);
        setHistoryTotal(0);
        return;
      }

      setHistoryLoading(true);
      try {
        const response = await inventoryService.getMovements({
          branchId: selectedBranch,
          itemType: historyItemType,
          movementType: historyMovementType,
          search: historySearch || undefined,
          dateFrom: historyDateFrom || undefined,
          dateTo: historyDateTo || undefined,
          page: currentHistoryPage,
          pageSize: HISTORY_PAGE_SIZE,
        });

        if (response?.code !== 1) {
          setMovementHistory([]);
          setHistoryTotal(0);
          setError(response?.message || "No se pudo cargar el historial de movimientos");
          return;
        }

        setMovementHistory(normalizeRows(response.data));
        setHistoryTotal(Number(response.data?.total || 0));
      } catch (requestError) {
        setMovementHistory([]);
        setHistoryTotal(0);
        setError(getErrorMessage(requestError, "Error de red al cargar el historial de movimientos"));
      } finally {
        setHistoryLoading(false);
      }
    };

    run();
  }, [
    currentHistoryPage,
    historyDateFrom,
    historyDateTo,
    historyItemType,
    historyMovementType,
    historySearch,
    reloadKey,
    selectedBranch,
  ]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = itemTypeFilter === "all" || item.item_type === itemTypeFilter;
      const searchable = `${item.name} ${item.sku || ""}`.toLocaleLowerCase("es");
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      return matchesType && matchesSearch;
    });
  }, [itemTypeFilter, items, search]);

  const totalItemsPages = Math.max(Math.ceil(filteredItems.length / ITEMS_PAGE_SIZE), 1);
  const currentItemsPage = Math.min(itemsPage, totalItemsPages);
  const visibleItems = filteredItems.slice((currentItemsPage - 1) * ITEMS_PAGE_SIZE, currentItemsPage * ITEMS_PAGE_SIZE);
  const selectedMovement = movementTypeOptions.find((option) => option.value === movementType) || movementTypeOptions[0];
  const isPurchaseInput = movementType === "adjustment_in" && itemTypeFilter === "raw_material";

  const getPurchaseRow = (item) => {
    const row = purchaseRows[item.id] || {};
    const options = getPurchaseUnitOptions(item);
    const unitOption = options.find((option) => option.value === row.unit) || options[0] || purchaseUnitOptions[0];
    const packageQty = Number(row.packageQty || 0);
    const totalCost = Number(onlyPesos(row.totalCost) || 0);
    const baseQuantity = unitOption.baseUnit === item.unit ? packageQty * unitOption.factor : 0;
    const unitCost = baseQuantity > 0 && totalCost > 0 ? totalCost / baseQuantity : null;

    return {
      ...row,
      unit: unitOption.value,
      unitLabel: unitOption.label,
      baseQuantity,
      unitCost,
    };
  };

  const updatePurchaseRow = (itemId, values) => {
    setPurchaseRows((current) => ({
      ...current,
      [itemId]: { ...(current[itemId] || {}), ...values },
    }));
  };

  const clearFieldError = (field) => {
    setFieldErrors((current) => ({ ...current, [field]: null }));
  };

  const selectedCount = isPurchaseInput
    ? items.filter((item) => item.item_type === "raw_material" && getPurchaseRow(item).baseQuantity > 0).length
    : Object.values(quantities).filter((value) => Number(value || 0) > 0).length;

  const onSubmitMovements = async () => {
    if (saving) return;

    setError(null);
    setFieldErrors({});

    const nextErrors = {};
    if (!selectedBranch) {
      nextErrors.selectedBranch = "Selecciona una sucursal";
    }

    if (movementType.startsWith("adjustment") && notes.trim().length < 5) {
      nextErrors.notes = "Para ajustes indica una nota de al menos 5 caracteres";
    }

    if (notes.length > 250) {
      nextErrors.notes = "Máximo 250 caracteres";
    }

    const invalidQuantity = items.some((item) => {
      const raw = quantities[item.id];
      if (raw === "" || raw === undefined || raw === null) return false;
      const value = Number(raw);
      return !Number.isFinite(value) || value < 0 || (isIntegerUnit(item.unit) && !Number.isInteger(value));
    });

    if (invalidQuantity) {
      nextErrors.quantities = "Revisa las cantidades: usa valores positivos y solo enteros cuando la unidad sea unidades";
    }

    const tooLargeQuantity = items.some((item) => {
      const raw = quantities[item.id];
      if (raw === "" || raw === undefined || raw === null) return false;
      return Number(raw) > MAX_INVENTORY_QUANTITY;
    });

    if (tooLargeQuantity) {
      nextErrors.quantities = `La cantidad máxima permitida por item es ${formatNumber(MAX_INVENTORY_QUANTITY)}`;
    }

    const insufficientStock = movementType === "adjustment_out"
      ? items.find((item) => Number(quantities[item.id] || 0) > Number(item.quantity_on_hand || 0))
      : null;

    if (insufficientStock) {
      nextErrors.quantities = `No puedes restar ${formatNumber(quantities[insufficientStock.id], insufficientStock.unit)} ${insufficientStock.unit} de ${insufficientStock.name}; disponible: ${formatNumber(insufficientStock.quantity_on_hand, insufficientStock.unit)} ${insufficientStock.unit}`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Corrige los campos marcados");
      return;
    }

    const pending = items
      .map((item) => ({
        ...item,
        quantity: isPurchaseInput && item.item_type === "raw_material" ? getPurchaseRow(item).baseQuantity : Number(quantities[item.id] || 0),
        unitCost: isPurchaseInput && item.item_type === "raw_material" ? getPurchaseRow(item).unitCost : null,
      }))
      .filter((item) => item.item_id > 0 && item.quantity > 0);

    if (pending.length === 0) {
      setError("Ingresa al menos una cantidad para aplicar movimientos");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        pending.map((item) =>
          inventoryService.applyMovement({
            p_branch_id: Number(selectedBranch),
            p_item_type: item.item_type,
            p_item_id: item.item_id,
            p_movement_type: movementType,
            p_quantity: item.quantity,
            p_unit_cost: item.unitCost,
            p_reference_type: "manual",
            p_reference_id: null,
            p_notes: notes || null,
          })
        )
      );

      const failed = results.find((result) => result?.code !== 1);
      if (failed) {
        setError(failed?.message || "No se pudieron aplicar todos los movimientos");
        return;
      }

      toast.success(`Movimientos aplicados: ${pending.length}`);
      setQuantities({});
      setPurchaseRows({});
      setNotes("");
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al aplicar movimientos"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Inventario - Movimientos" subtitle="Entradas y salidas manuales de stock">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <ManualAdjustmentPanel
        show={showManualAdjustment}
        onToggle={() => setShowManualAdjustment((current) => !current)}
        movementTypeOptions={movementTypeOptions}
        movementType={movementType}
        onMovementTypeChange={setMovementType}
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        fieldErrors={fieldErrors}
        onClearFieldError={clearFieldError}
        itemTypeFilter={itemTypeFilter}
        onItemTypeFilterChange={setItemTypeFilter}
        search={search}
        onSearchChange={setSearch}
        notes={notes}
        onNotesChange={setNotes}
        selectedMovement={selectedMovement}
        selectedCount={selectedCount}
        onSubmitMovements={onSubmitMovements}
        saving={saving}
        loading={loading}
        filteredItems={filteredItems}
        visibleItems={visibleItems}
        itemsPageSize={ITEMS_PAGE_SIZE}
        currentItemsPage={currentItemsPage}
        totalItemsPages={totalItemsPages}
        onPreviousItemsPage={() => setItemsPage((current) => Math.max(current - 1, 1))}
        onNextItemsPage={() => setItemsPage((current) => Math.min(current + 1, totalItemsPages))}
        getDisplayName={getDisplayName}
        formatNumber={formatNumber}
        formatUnits={formatUnits}
        formatMoney={formatMoney}
        isIntegerUnit={isIntegerUnit}
        movementTypeLabel={movementType === "adjustment_in" ? "sumar" : "restar"}
        quantities={quantities}
        onQuantityChange={(itemId, value) => setQuantities((current) => ({ ...current, [itemId]: value }))}
        getPurchaseRow={getPurchaseRow}
        getPurchaseUnitOptions={getPurchaseUnitOptions}
        updatePurchaseRow={updatePurchaseRow}
        isPurchaseInput={isPurchaseInput}
        maxInventoryQuantity={MAX_INVENTORY_QUANTITY}
      />

      {!showManualAdjustment ? (
        <InventoryMovementHistory
          historyTotal={historyTotal}
          historySearch={historySearch}
          onHistorySearchChange={setHistorySearch}
          historyItemType={historyItemType}
          onHistoryItemTypeChange={setHistoryItemType}
          historyMovementType={historyMovementType}
          onHistoryMovementTypeChange={setHistoryMovementType}
          historyDateFrom={historyDateFrom}
          onHistoryDateFromChange={setHistoryDateFrom}
          historyDateTo={historyDateTo}
          onHistoryDateToChange={setHistoryDateTo}
          itemTypeLabels={itemTypeLabels}
          movementTypeLabels={movementTypeLabels}
          movementTypeColors={movementTypeColors}
          historyLoading={historyLoading}
          movementHistory={movementHistory}
          formatNumber={formatNumber}
          formatDate={formatDate}
          getMovementExplanation={getMovementExplanation}
          pageSize={HISTORY_PAGE_SIZE}
          currentPage={currentHistoryPage}
          totalPages={totalHistoryPages}
          onPreviousPage={() => setHistoryPage((current) => Math.max(current - 1, 1))}
          onNextPage={() => setHistoryPage((current) => Math.min(current + 1, totalHistoryPages))}
        />
      ) : null}
    </FlowPageLayout>
  );
};

export default InventoryMovementsPage;
