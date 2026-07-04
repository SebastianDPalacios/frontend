export const SALES_ONLY_HOME = "/sales/dashboard";

export const salesOnlyPaths = [
  "/sales/dashboard",
  "/orders/day",
  "/orders/count",
  "/orders/returns",
];

const administrativeRoles = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATIVO", "ADMINISTRATIVE"];

const normalizeRoleCodes = (roles = []) => {
  return roles
    .map((role) => (typeof role === "string" ? role : role?.code))
    .filter(Boolean)
    .map((role) => String(role).trim().toUpperCase());
};

export const isAdministrativeUser = (user) => {
  return normalizeRoleCodes(Array.isArray(user?.roles) ? user.roles : []).some((role) =>
    administrativeRoles.includes(role)
  );
};

export const isSalesOnlyUser = (user) => {
  const roles = normalizeRoleCodes(Array.isArray(user?.roles) ? user.roles : []);
  return roles.includes("VENTAS") && !roles.some((role) => administrativeRoles.includes(role));
};

export const getHomePathForUser = (user) => {
  return isSalesOnlyUser(user) ? SALES_ONLY_HOME : "/dashboards/analytics";
};

export const canAccessPath = (user, pathname) => {
  if (!isSalesOnlyUser(user)) {
    return true;
  }

  return salesOnlyPaths.some((allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`));
};
