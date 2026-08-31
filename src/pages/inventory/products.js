import { useEffect, useState } from "react";
import InventoryProductFilters from "components/organisms/inventory/InventoryProductFilters";
import ProductStockGrid from "components/organisms/inventory/ProductStockGrid";
import ProductStockSummary from "components/organisms/inventory/ProductStockSummary";
import ProductStockEntryDialog from "components/organisms/inventory/ProductStockEntryDialog";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";
import toast from "react-hot-toast";

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
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(undefined);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [reloadKey, selectedBranch]);

  const normalizedSearch = search.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filteredRows = normalizedSearch
    ? rows.filter((row) => `${getDisplayName(row)} ${row.sku || ""} ${row.code || ""}`.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearch))
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
    <FlowPageLayout title="Inventario - Productos" subtitle="Existencias actuales por sucursal">
      <InventoryProductFilters
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        search={search}
        onSearchChange={setSearch}
        getDisplayName={getDisplayName}
      />

      <ProductStockSummary emptyCount={emptyCount} lowCount={lowCount} onLoadStock={setSelectedProduct} />

      <ProductStockGrid
        loading={loading}
        error={error}
        rows={rows}
        sortedRows={sortedRows}
        getDisplayName={getDisplayName}
        formatInventoryQuantity={formatInventoryQuantity}
        onLoadStock={setSelectedProduct}
      />

      <ProductStockEntryDialog
        products={rows}
        product={selectedProduct || null}
        branchId={selectedBranch}
        open={selectedProduct !== undefined}
        onClose={() => setSelectedProduct(undefined)}
        onSaved={() => {
          toast.success("Entrada de producto registrada");
          setSelectedProduct(undefined);
          setReloadKey((current) => current + 1);
        }}
      />
    </FlowPageLayout>
  );
};

export default InventoryProductsPage;
