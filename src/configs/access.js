export const SALES_ONLY_HOME = "/sales/dashboard";
export const BAKER_HOME = "/production/my-plan";
export const PACKAGING_HOME = "/production/packaging";

export const salesOnlyPaths = [
  "/sales/dashboard",
  "/orders/day",
  "/orders/count",
  "/orders/gifts",
  "/orders/returns",
];

export const bakerOnlyPaths = [
  "/dashboards/analytics",
  "/production/performed",
  "/production/my-plan",
  "/production/history",
];

export const packagingOnlyPaths = [
  "/dashboards/analytics",
  "/production/packaging",
];

const administrativeRoles = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATIVO", "ADMINISTRATIVE"];
const bakerRoles = ["PANADERO", "BAKER"];
const packagingRoles = ["EMPAQUETADOR", "PACKER", "PACKAGING", "CONTADOR", "CONTEO", "COUNTER"];

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

export const normalizeRoleCodes = (roles = []) => {
  return roles
    .map((role) => (typeof role === "string" ? role : role?.code || role?.name))
    .filter(Boolean)
    .map(normalizeCode);
};

export const normalizePermissionCodes = (permissions = []) => {
  return permissions
    .map((permission) => (typeof permission === "string" ? permission : permission?.code))
    .filter(Boolean)
    .map((permission) => String(permission).trim());
};

const getOperationalCodes = (user) => {
  const employee = user?.employee || {};
  return [
    ...normalizeRoleCodes(Array.isArray(user?.roles) ? user.roles : []),
    user?.job_type,
    user?.jobType,
    user?.employee_job_type,
    user?.employeeJobType,
    user?.operational_role,
    user?.operationalRole,
    employee.job_type,
    employee.jobType,
    employee.custom_job_title,
    employee.customJobTitle,
  ]
    .filter(Boolean)
    .map(normalizeCode);
};

export const isAdministrativeUser = (user) => {
  return normalizeRoleCodes(Array.isArray(user?.roles) ? user.roles : []).some((role) =>
    administrativeRoles.includes(role)
  );
};

export const hasPermission = (user, permission) => {
  if (!permission) {
    return true;
  }

  if (Array.isArray(permission)) {
    return permission.some((permissionCode) => hasPermission(user, permissionCode));
  }

  if (isAdministrativeUser(user)) {
    return true;
  }

  return normalizePermissionCodes(Array.isArray(user?.permissions) ? user.permissions : []).includes(permission);
};

export const isSalesOnlyUser = (user) => {
  const roles = normalizeRoleCodes(Array.isArray(user?.roles) ? user.roles : []);
  return roles.includes("VENTAS") && !roles.some((role) => administrativeRoles.includes(role));
};

export const hasBakerProfile = (user) => {
  return getOperationalCodes(user).some((code) => bakerRoles.includes(code));
};

export const hasPackagingProfile = (user) => {
  return getOperationalCodes(user).some((code) => packagingRoles.includes(code));
};

export const isBakerOnlyUser = (user) => {
  if (isAdministrativeUser(user) || isSalesOnlyUser(user)) {
    return false;
  }

  if (hasBakerProfile(user) && !hasPackagingProfile(user)) {
    return true;
  }

  return hasPermission(user, "production.baker")
    && !hasPermission(user, "production.packaging")
    && !hasPermission(user, "production.manage");
};

export const isPackagingOnlyUser = (user) => {
  if (isAdministrativeUser(user) || isSalesOnlyUser(user)) {
    return false;
  }

  if (hasPackagingProfile(user)) {
    return true;
  }

  return hasPermission(user, "production.packaging")
    && !hasPermission(user, "production.baker")
    && !hasPermission(user, "production.manage");
};

export const getHomePathForUser = (user) => {
  if (isSalesOnlyUser(user)) {
    return SALES_ONLY_HOME;
  }

  if (isBakerOnlyUser(user)) {
    return BAKER_HOME;
  }

  if (isPackagingOnlyUser(user)) {
    return PACKAGING_HOME;
  }

  return "/dashboards/analytics";
};

const pathIsAllowed = (pathname, allowedPaths) => {
  return allowedPaths.some((allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`));
};

export const canAccessPath = (user, pathname) => {
  if (isSalesOnlyUser(user)) {
    return pathIsAllowed(pathname, salesOnlyPaths);
  }

  if (isPackagingOnlyUser(user)) {
    return pathIsAllowed(pathname, packagingOnlyPaths);
  }

  if (isBakerOnlyUser(user)) {
    return pathIsAllowed(pathname, bakerOnlyPaths);
  }

  return true;
};
