import { useEffect, useState } from "react";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import CatalogListView from "views/modules/CatalogListView";

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

const ProductsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getProducts({ page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de productos");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Error de red al cargar productos"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <CatalogListView
      title="Productos"
      subtitle="Productos disponibles para venta, produccion e inventario."
      loading={loading}
      error={error}
      items={items}
      nameField="name"
      createHref="/catalogo/nuevo-producto"
      createLabel="Nuevo producto"
      searchPlaceholder="Buscar producto por nombre, SKU o codigo"
      typeLabel="Producto"
    />
  );
};

export default ProductsPage;
