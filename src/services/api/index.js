const endpoints = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  users: {
    list: "/users",
    byId: (id) => `/users/${id}`,
  },
  catalog: {
    branches: "/catalog/branches",
    customers: "/catalog/customers",
    routes: "/catalog/routes",
    products: "/catalog/products",
    rawMaterials: "/catalog/raw-materials",
  },
  orders: {
    baseData: "/orders/base-data",
    create: "/orders",
    upsertItem: (id) => `/orders/${id}/items`,
    confirm: (id) => `/orders/${id}/confirm`,
    cancel: (id) => `/orders/${id}/cancel`,
    dispatch: (id) => `/orders/${id}/dispatch`,
    receivePurchaseOrder: (id) => `/orders/purchase-orders/${id}/receive`,
  },
  production: {
    baseData: "/production/base-data",
    results: "/production/results",
    closeOrder: (id) => `/production/orders/${id}/close`,
  },
  inventory: {
    baseData: "/inventory/base-data",
    movements: "/inventory/movements",
  },
  adminAuth: {
    users: "/admin-auth/users",
    userProfile: (id) => `/admin-auth/users/${id}/profile`,
    userRoles: (id) => `/admin-auth/users/${id}/roles`,
    userStatus: (id) => `/admin-auth/users/${id}/status`,
    userForcePasswordReset: (id) => `/admin-auth/users/${id}/force-password-reset`,
    userLogoutAll: (id) => `/admin-auth/users/${id}/logout-all`,
    userResetPassword: (id) => `/admin-auth/users/${id}/reset-password`,
    changePassword: "/admin-auth/change-password",
  },
};

export default endpoints;
