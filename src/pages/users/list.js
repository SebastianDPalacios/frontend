import { useEffect, useMemo, useState } from "react";
import usersService from "services/users/users-service";
import CatalogListView from "views/modules/CatalogListView";
import FlowPageLayout from "views/modules/FlowPageLayout";

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

const UsersListPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const flowLinks = useMemo(
    () => [
      { label: "Listado", href: "/users/list", active: true },
      { label: "Nuevo", href: "/users/new" },
    ],
    []
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await usersService.getUsers({ page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el listado de usuarios");
          return;
        }

        const users = normalizeList(response.data).map((item) => ({
          ...item,
          display_name: item.full_name || item.username || item.email || "Usuario",
        }));

        setItems(users);
      } catch (requestError) {
        setError("Error de red al cargar usuarios");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <FlowPageLayout title="Usuarios - Listado" subtitle="Gestion de usuarios" links={flowLinks}>
      <CatalogListView
        title="Usuarios"
        subtitle="Listado operativo de usuarios"
        loading={loading}
        error={error}
        items={items}
        nameField="display_name"
      />
    </FlowPageLayout>
  );
};

export default UsersListPage;
