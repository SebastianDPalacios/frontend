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
  const [search, setSearch] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageSize = 200;
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize, branchId: selectedBranch || undefined });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar inventario de materias");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        const resolvedBranchId = selectedBranch || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : "");
        const firstPageRows = normalizeRows(response.data?.raw_materials);
        const totalRows = Number(response.data?.raw_materials?.total || firstPageRows.length);
        const allRows = [...firstPageRows];

        for (let page = 2; allRows.length < totalRows; page += 1) {
          const pageResponse = await inventoryService.getBaseData({
            onlyActive: 1,
            page,
            pageSize,
            branchId: resolvedBranchId || undefined,
          });
          if (pageResponse?.code !== 1) {
            throw new Error(pageResponse?.message || "No se pudieron cargar todas las materias primas");
          }
          const pageRows = normalizeRows(pageResponse.data?.raw_materials);
          if (!pageRows.length) break;
          allRows.push(...pageRows);
        }

        setBranches(branchRows);
        setRows(allRows);
        setSelectedBranch((current) => current || resolvedBranchId);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar inventario de materias"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedBranch]);

  const normalizedSearch = search.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filteredRows = normalizedSearch
    ? rows.filter((row) => `${getDisplayName(row)} ${row.sku || ""}`.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearch))
    : rows;
  const sortedRows = [...filteredRows].sort((a, b) => {
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
        search={search}
        onSearchChange={setSearch}
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
