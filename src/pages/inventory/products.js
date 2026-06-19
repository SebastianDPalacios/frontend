import { useEffect, useState } from "react";
import InventoryProductFilters from "components/organisms/inventory/InventoryProductFilters";
import ProductStockGrid from "components/organisms/inventory/ProductStockGrid";
import ProductStockSummary from "components/organisms/inventory/ProductStockSummary";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
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

const InventoryProductsPage = () => {
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
        const response = await inventoryService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 40,
          branchId: selectedBranch || undefined,
        });

        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar inventario de productos");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        setBranches(branchRows);
        setRows(normalizeRows(response.data?.products));
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar inventario de productos"));
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
    <FlowPageLayout title="Inventario - Productos" subtitle="Existencias actuales por sucursal">
      <InventoryProductFilters
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        getDisplayName={getDisplayName}
      />

      <ProductStockSummary emptyCount={emptyCount} lowCount={lowCount} />

      <ProductStockGrid
        loading={loading}
        error={error}
        rows={rows}
        sortedRows={sortedRows}
        getDisplayName={getDisplayName}
        formatInventoryQuantity={formatInventoryQuantity}
      />
    </FlowPageLayout>
  );
};

export default InventoryProductsPage;
