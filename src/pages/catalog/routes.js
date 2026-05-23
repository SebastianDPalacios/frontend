import { useEffect, useState } from "react";
import { Alert } from "@mui/material";
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

const RoutesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setInfo(null);
      try {
        const response = await catalogService.getRoutes({ onlyActive: 1 });
        if (response?.code !== 1) {
          if (response?.code === 0) {
            setInfo(response?.message || "Catalogo de repartidores no disponible en esta version");
            setItems([]);
            return;
          }

          setError(response?.message || "No se pudo cargar el catalogo de repartidores");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError("Error de red al cargar repartidores");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <>
      {info ? <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert> : null}
      <CatalogListView
        title="Repartidores"
        subtitle="Rutas y repartidores operativos"
        loading={loading}
        error={error}
        items={items}
        nameField="description"
      />
    </>
  );
};

export default RoutesPage;
