const navigationItems = [
  {
    section: "General",
    items: [
      { title: "Dashboard", path: "/dashboards/analytics", icon: "dashboard" },
      { title: "Dashboard ventas", path: "/sales/dashboard", icon: "dashboard", permission: "orders.manage", salesOnly: true },
      { title: "Auditoria", path: "/reports/audit", icon: "dashboard", permission: "roles.manage" },
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
          { title: "Obsequios", path: "/orders/gifts", icon: "orders", permission: "orders.manage" },
          { title: "Gestion", path: "/orders/history", icon: "orders", permission: "orders.manage" },
          { title: "Historial", path: "/orders/historical", icon: "orders", permission: "orders.manage" },
          { title: "Liquidacion diaria", path: "/orders/daily-settlement", icon: "orders", permission: "orders.manage" },
          { title: "Cambios y devoluciones", path: "/orders/returns", icon: "orders", permission: "orders.manage" },
        ],
      },
      {
        title: "Produccion",
        icon: "production",
        children: [
          { title: "Resumen", path: "/production/day", icon: "dashboard", permission: "production.manage" },
          { title: "Reporte mensual", path: "/production/month", icon: "dashboard", permission: "production.manage" },
          { title: "Materias primas usadas", path: "/production/material-usage", icon: "materials", permission: "production.manage" },
          {
            title: "Plan del panadero",
            path: "/production/planning",
            icon: "production",
            permission: ["production.manage", "production.baker"],
          },
          { title: "Produccion realizada", path: "/production/performed", icon: "production", permission: "production.baker" },
          { title: "Recetas", path: "/recipes", icon: "recipes", permission: "recipes.manage" },
          { title: "Conteo y empaque", path: "/production/packaging", icon: "production", permission: "production.packaging" },
          { title: "Faltantes", path: "/production/shortages", icon: "production", permission: "production.manage" },
        ],
      },
      {
        title: "Inventario",
        icon: "inventory",
        children: [
          { title: "Resumen", path: "/inventory/overview", icon: "dashboard", permission: "inventory.manage" },
          { title: "Entradas y salidas", path: "/inventory/movements", icon: "inventory", permission: "inventory.manage" },
          { title: "Salida a puerta", path: "/inventory/door-exit", icon: "inventory", permission: "inventory.manage" },
          { title: "Stock productos", path: "/inventory/products", icon: "products", permission: "inventory.manage" },
          { title: "Stock materia prima", path: "/inventory/raw-materials", icon: "materials", permission: "inventory.manage" },
          { title: "Compras", path: "/inventory/purchase-orders", icon: "suppliers", permission: "inventory.manage" },
          { title: "Crear materia prima", path: "/catalogo/nueva-materia-prima", icon: "materials", permission: "materials.manage" },
          { title: "Editar materias primas", path: "/catalogo/materias-primas", icon: "materials", permission: "materials.manage" },
        ],
      },
    ],
  },
  {
    section: "Catalogos",
    items: [
      {
        title: "Catalogo",
        icon: "products",
        children: [
          { title: "Productos", path: "/catalogo/productos", icon: "products", permission: "products.manage" },
          { title: "Nuevo producto", path: "/catalogo/nuevo-producto", icon: "products", permission: "products.manage" },
          { title: "Materias primas", path: "/catalogo/materias-primas", icon: "materials", permission: "materials.manage" },
          { title: "Nueva materia prima", path: "/catalogo/nueva-materia-prima", icon: "materials", permission: "materials.manage" },
        ],
      },
      {
        title: "Clientes y vendedores",
        icon: "customers",
        children: [
          { title: "Clientes", path: "/catalogo/clientes", icon: "customers", permission: "customers.manage" },
          { title: "Nuevo cliente", path: "/catalogo/nuevo-cliente", icon: "customers", permission: "customers.manage" },
          { title: "Asignar clientes", path: "/orders/customer-assignments", icon: "customers", permission: "roles.manage" },
        ],
      },
      {
        title: "Configuracion",
        icon: "catalog",
        children: [
          { title: "Proveedores", path: "/catalogo/proveedores", icon: "suppliers", permission: "materials.manage" },
          { title: "Reglas de venta", path: "/orders/settings", icon: "orders", permission: "roles.manage" },
          { title: "Ticket POS", path: "/settings/pos-ticket", icon: "orders", permission: "roles.manage" },
          { title: "Ticket liquidacion", path: "/settings/daily-settlement-ticket", icon: "orders", permission: "roles.manage" },
          { title: "Acceso a vistas", path: "/settings/view-access", icon: "users", permission: "roles.manage" },
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
      {
        title: "Empleados",
        icon: "users",
        children: [
          { title: "Listado", path: "/employees/list", icon: "users", permission: "employees.manage" },
          { title: "Nuevo empleado", path: "/employees/new", icon: "users", permission: "employees.manage" },
        ],
      },
    ],
  },
];

export default navigationItems;

