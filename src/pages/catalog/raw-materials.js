import { useEffect, useState } from "react";
import catalogService from "services/catalog/catalog-service";
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

const RawMaterialsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getRawMaterials({ page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de materias primas");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError("Error de red al cargar materias primas");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <CatalogListView
      title="Materias primas"
      subtitle="Listado operativo de materias primas"
      loading={loading}
      error={error}
      items={items}
      nameField="description"
    />
  );
};

export default RawMaterialsPage;
