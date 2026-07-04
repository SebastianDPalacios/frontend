import { useEffect, useState } from "react";
import InventoryRawMaterialFilters from "components/organisms/inventory/InventoryRawMaterialFilters";
import InventoryStockSummary from "components/organisms/inventory/InventoryStockSummary";
import RawMaterialStockGrid from "components/organisms/inventory/RawMaterialStockGrid";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";
const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const formatUnits = (value) => numberFormatter.format(Number(value || 0));

const pluralize = (value, singular, plural) => `${formatUnits(value)} ${Number(value) === 1 ? singular : plural}`;

const unitLabels = {
  g: "g",
  ml: "ml",
  unit: "unidad",
  package: "paquete",
  roll: "rollo",
  bag: "bolsa",
  box: "caja",
};

const getUnitLabel = (unit, quantity = 1) => {
  const label = unitLabels[unit] || unit || "unidad";
  return Number(quantity) === 1 ? label : `${label}s`;
};

const formatRemainder = (amount, unit) => {
  if (unit === "ml") {
    return amount >= 1000 ? `${formatUnits(amount / 1000)} litros` : `${formatUnits(amount)} ml`;
  }
  if (unit === "g") {
    return amount >= 1000 ? `${formatUnits(amount / 1000)} kg` : `${formatUnits(amount)} g`;
  }
  return `${formatInventoryQuantity(amount, unit)} ${getUnitLabel(unit, amount)}`;
};

const pluralizePackage = (value, name) => `${formatUnits(value)} ${Number(value) === 1 ? name : `${name}s`}`;

const formatStockEquivalent = (row, unit) => {
  const value = row?.quantity_on_hand;
  const amount = Number(value || 0);
  const packageName = String(row?.purchase_package_name || "").trim();
  const packageQuantity = Number(row?.purchase_package_quantity || 0);

  if (packageName && packageQuantity > 0) {
    const packages = Math.floor(amount / packageQuantity);
    const remainder = amount - packages * packageQuantity;
    return `${pluralizePackage(packages, packageName)} + ${formatRemainder(remainder, unit)}`;
  }

  if (unit === "ml") {
    const liters = Math.floor(amount / 1000);
    const remainingMl = amount - liters * 1000;
    return `${pluralize(liters, "litro", "litros")} + ${formatUnits(remainingMl)} ml`;
  }

  if (unit === "g") {
    return formatRemainder(amount, unit);
  }

  return `${formatInventoryQuantity(amount, unit)} ${getUnitLabel(unit, amount)}`;
};

const getStockPriority = (row) => {
  const stock = Number(row.quantity_on_hand || 0);
  const minStock = Number(row.min_stock || 0);

  if (stock <= 0) {
    return 0;
  }

  if (stock < minStock) {
    return 1;
  }

  return 2;
};

const InventoryRawMaterialsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40, branchId: selectedBranch || undefined });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar inventario de materias");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        setBranches(branchRows);
        setRows(normalizeRows(response.data?.raw_materials));
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar inventario de materias"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedBranch]);

  const sortedRows = [...rows].sort((a, b) => {
    const priority = getStockPriority(a) - getStockPriority(b);
    if (priority !== 0) {
      return priority;
    }

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
  const emptyCount = rows.filter((row) => Number(row.quantity_on_hand || 0) <= 0).length;
  const lowCount = rows.filter((row) => Number(row.quantity_on_hand || 0) > 0 && Number(row.quantity_on_hand || 0) < Number(row.min_stock || 0)).length;

  return (
    <FlowPageLayout title="Inventario - Materia prima" subtitle="Existencias actuales por sucursal">
      <InventoryRawMaterialFilters
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        getDisplayName={getDisplayName}
      />

      <InventoryStockSummary emptyCount={emptyCount} lowCount={lowCount} />

      <RawMaterialStockGrid
        loading={loading}
        error={error}
        rows={rows}
        sortedRows={sortedRows}
        getDisplayName={getDisplayName}
        formatStockEquivalent={formatStockEquivalent}
        formatInventoryQuantity={formatInventoryQuantity}
        getUnitLabel={getUnitLabel}
      />
    </FlowPageLayout>
  );
};

export default InventoryRawMaterialsPage;
