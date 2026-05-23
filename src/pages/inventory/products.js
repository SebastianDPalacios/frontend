import { useEffect, useMemo, useState } from "react";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";

const InventoryProductsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar inventario de productos");
          return;
        }

        setRows(normalizeRows(response.data?.products));
      } catch (requestError) {
        setError("Error de red al cargar inventario de productos");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const flowLinks = useMemo(
    () => [
      { label: "Resumen", href: "/inventory/overview" },
      { label: "Ordenes compra", href: "/inventory/purchase-orders" },
      { label: "Materia prima", href: "/inventory/raw-materials" },
      { label: "Productos", href: "/inventory/products", active: true },
      { label: "Movimientos", href: "/inventory/movements" },
    ],
    []
  );

  return (
    <FlowPageLayout title="Inventario - Productos" subtitle="Stock base de productos terminados" links={flowLinks}>
      <FlowTableCard
        title="Productos"
        loading={loading}
        error={error}
        columns={[{ key: "name", label: "Producto", render: (row) => getDisplayName(row) }]}
        rows={rows}
      />
    </FlowPageLayout>
  );
};

export default InventoryProductsPage;
