import { useEffect, useState } from "react";
import { Alert, Grid } from "@mui/material";
import InventoryCriticalList from "components/organisms/inventory/InventoryCriticalList";
import InventoryOverviewMetrics from "components/organisms/inventory/InventoryOverviewMetrics";
import InventoryQuickActions from "components/organisms/inventory/InventoryQuickActions";
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

const formatRemainder = (amount, unit) => {
  if (unit === "ml") {
    return amount >= 1000 ? `${formatUnits(amount / 1000)} litros` : `${formatUnits(amount)} ml`;
  }
  if (unit === "g") {
    return amount >= 1000 ? `${formatUnits(amount / 1000)} kg` : `${formatUnits(amount)} g`;
  }
  return `${formatInventoryQuantity(amount, unit)} ${unit}`;
};

const pluralizePackage = (value, name) => `${formatUnits(value)} ${Number(value) === 1 ? name : `${name}s`}`;

const formatStockEquivalent = (item, unit) => {
  const value = item?.quantity_on_hand;
  const amount = Number(value || 0);
  const packageName = String(item?.purchase_package_name || "").trim();
  const packageQuantity = Number(item?.purchase_package_quantity || 0);

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

  return `${formatInventoryQuantity(amount, unit)} ${unit}`;
};

const getStockState = (item) => {
  const stock = Number(item.quantity_on_hand || 0);
  const min = Number(item.min_stock || 0);

  if (stock <= 0) {
    return { label: "Sin stock", color: "error", priority: 0 };
  }

  if (stock < min) {
    return { label: "Bajo minimo", color: "warning", priority: 1 };
  }

  return { label: "Disponible", color: "success", priority: 2 };
};

const sortByCriticality = (rows) => {
  return [...rows].sort((a, b) => {
    const stateDiff = getStockState(a).priority - getStockState(b).priority;
    if (stateDiff !== 0) {
      return stateDiff;
    }

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
};

const InventoryOverviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 50 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar base de inventario");
          return;
        }

        setBranches(normalizeRows(response.data?.branches));
        setProducts(normalizeRows(response.data?.products));
        setRawMaterials(normalizeRows(response.data?.raw_materials));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar inventario"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const emptyProducts = products.filter((item) => Number(item.quantity_on_hand || 0) <= 0);
  const emptyMaterials = rawMaterials.filter((item) => Number(item.quantity_on_hand || 0) <= 0);
  const lowProducts = products.filter((item) => Number(item.quantity_on_hand || 0) > 0 && Number(item.quantity_on_hand || 0) < Number(item.min_stock || 0));
  const lowMaterials = rawMaterials.filter((item) => Number(item.quantity_on_hand || 0) > 0 && Number(item.quantity_on_hand || 0) < Number(item.min_stock || 0));
  const criticalMaterials = sortByCriticality([...emptyMaterials, ...lowMaterials]).slice(0, 5);
  const criticalProducts = sortByCriticality([...emptyProducts, ...lowProducts]).slice(0, 5);
  const totalAlerts = emptyProducts.length + emptyMaterials.length + lowProducts.length + lowMaterials.length;

  return (
    <FlowPageLayout title="Inventario - Resumen" subtitle="Estado general de stock por sucursal">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando resumen de inventario...</Alert> : null}

      <InventoryOverviewMetrics
        branchesCount={branches.length}
        rawMaterialsCount={rawMaterials.length}
        productsCount={products.length}
        emptyMaterialsCount={emptyMaterials.length}
        lowMaterialsCount={lowMaterials.length}
        emptyProductsCount={emptyProducts.length}
        lowProductsCount={lowProducts.length}
        totalAlerts={totalAlerts}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <InventoryCriticalList
            title="Materias criticas"
            subtitle="Insumos que pueden frenar produccion."
            rows={criticalMaterials}
            emptyMessage="No hay materias primas criticas en este momento."
            actionHref="/inventory/raw-materials"
            getDisplayName={getDisplayName}
            getStockState={getStockState}
            formatStockEquivalent={formatStockEquivalent}
          />
        </Grid>

        <Grid item xs={12} lg={6}>
          <InventoryCriticalList
            title="Productos criticos"
            subtitle="Producto terminado con stock bajo o agotado."
            rows={criticalProducts}
            emptyMessage="No hay productos criticos en este momento."
            actionHref="/inventory/products"
            getDisplayName={getDisplayName}
            getStockState={getStockState}
            formatStockEquivalent={formatStockEquivalent}
          />
        </Grid>

        <Grid item xs={12}>
          <InventoryQuickActions />
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default InventoryOverviewPage;
