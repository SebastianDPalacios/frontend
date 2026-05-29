const navigationItems = [
  {
    section: "General",
    items: [
      { title: "Dashboard", path: "/dashboards/analytics", icon: "dashboard", permission: "reports.view" },
      { title: "Auditoria", path: "/reports/audit", icon: "dashboard", permission: "reports.view" },
    ],
  },
  {
    section: "Operacion",
    items: [
      {
        title: "Pedidos",
        icon: "orders",
        children: [
          { title: "Resumen", path: "/orders/day", icon: "dashboard", permission: "orders.manage" },
          { title: "Captura", path: "/orders/count", icon: "orders", permission: "orders.manage" },
          { title: "Gestion", path: "/orders/history", icon: "orders", permission: "orders.manage" },
        ],
      },
      {
        title: "Produccion",
        icon: "production",
        children: [
          { title: "Resumen", path: "/production/day", icon: "dashboard", permission: "production.manage" },
          { title: "Ordenes", path: "/production/orders", icon: "production", permission: "production.manage" },
          { title: "Registrar", path: "/production/register", icon: "production", permission: "production.manage" },
          { title: "Recetas", path: "/recipes/new", icon: "recipes", permission: "recipes.manage" },
        ],
      },
      {
        title: "Inventario",
        icon: "inventory",
        children: [
          { title: "Resumen", path: "/inventory/overview", icon: "dashboard", permission: "inventory.manage" },
          { title: "Movimientos", path: "/inventory/movements", icon: "inventory", permission: "inventory.manage" },
          { title: "Productos", path: "/inventory/products", icon: "products", permission: "inventory.manage" },
          { title: "Materia prima", path: "/inventory/raw-materials", icon: "materials", permission: "inventory.manage" },
          { title: "Compras", path: "/inventory/purchase-orders", icon: "suppliers", permission: "inventory.manage" },
        ],
      },
    ],
  },
  {
    section: "Catalogos",
    items: [
      {
        title: "Productos e insumos",
        icon: "products",
        children: [
          { title: "Productos", path: "/catalogo/productos", icon: "products", permission: "products.manage" },
          { title: "Nuevo producto", path: "/catalogo/nuevo-producto", icon: "products", permission: "products.manage" },
          { title: "Materias primas", path: "/catalogo/materias-primas", icon: "materials", permission: "materials.manage" },
          { title: "Nueva materia prima", path: "/catalogo/nueva-materia-prima", icon: "materials", permission: "materials.manage" },
        ],
      },
      {
        title: "Clientes y rutas",
        icon: "customers",
        children: [
          { title: "Clientes", path: "/catalogo/clientes", icon: "customers", permission: "customers.manage" },
          { title: "Nuevo cliente", path: "/catalogo/nuevo-cliente", icon: "customers", permission: "customers.manage" },
          { title: "Rutas", path: "/catalogo/repartidores", icon: "routes", permission: "routes.manage" },
          { title: "Nueva ruta", path: "/catalogo/nueva-ruta", icon: "routes", permission: "routes.manage" },
          { title: "Asignar repartidor", path: "/catalogo/asignar-repartidor", icon: "routes", permission: "routes.manage" },
        ],
      },
      {
        title: "Configuracion",
        icon: "catalog",
        children: [
          { title: "Proveedores", path: "/catalogo/proveedores", icon: "suppliers", permission: "materials.manage" },
          { title: "Tasas de impuesto", path: "/catalogo/tasas-de-impuesto", icon: "tax", permission: "products.manage" },
          { title: "Categorias producto", path: "/catalogo/categorias-producto", icon: "category", permission: "products.manage" },
          { title: "Categorias materia prima", path: "/catalogo/categorias-materia-prima", icon: "materials", permission: "materials.manage" },
        ],
      },
    ],
  },
  {
    section: "Administracion",
    items: [
      {
        title: "Usuarios",
        icon: "users",
        children: [
          { title: "Listado", path: "/users/list", icon: "users", permission: "users.manage" },
          { title: "Nuevo usuario", path: "/users/new", icon: "users", permission: "users.manage" },
          { title: "Roles y permisos", path: "/users/roles", icon: "users", permission: "roles.manage" },
        ],
      },
    ],
  },
];

export default navigationItems;
