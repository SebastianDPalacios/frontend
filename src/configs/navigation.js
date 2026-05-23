const navigationItems = [
  {
    section: "General",
    items: [
      { title: "Dashboard", path: "/dashboards/analytics", icon: "dashboard" },
    ],
  },
  {
    section: "Catalogos",
    items: [
      {
        title: "Catalogos base",
        icon: "catalog",
        children: [
          { title: "Productos", path: "/catalog/products", icon: "products" },
          { title: "Materias primas", path: "/catalog/raw-materials", icon: "materials" },
          { title: "Clientes", path: "/catalog/customers", icon: "customers" },
          { title: "Repartidores", path: "/catalog/routes", icon: "routes" },
        ],
      },
    ],
  },
  {
    section: "Operacion",
    items: [
      {
        title: "Pedidos",
        icon: "orders",
        children: [
          { title: "Dia", path: "/orders/day" },
          { title: "Historico", path: "/orders/history" },
          { title: "Conteo", path: "/orders/count" },
        ],
      },
      {
        title: "Produccion",
        icon: "production",
        children: [
          { title: "Dia", path: "/production/day" },
          { title: "Registrar", path: "/production/register" },
          { title: "Ordenes", path: "/production/orders" },
        ],
      },
      {
        title: "Inventario",
        icon: "inventory",
        children: [
          { title: "Resumen", path: "/inventory/overview" },
          { title: "Ordenes de compra", path: "/inventory/purchase-orders" },
          { title: "Materia prima", path: "/inventory/raw-materials" },
          { title: "Productos", path: "/inventory/products" },
          { title: "Movimientos", path: "/inventory/movements" },
        ],
      },
      {
        title: "Usuarios",
        icon: "users",
        children: [
          { title: "Listado", path: "/users/list" },
          { title: "Nuevo", path: "/users/new" },
        ],
      },
    ],
  },
];

export default navigationItems;
