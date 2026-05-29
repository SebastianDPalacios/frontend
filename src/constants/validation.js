/**
 * Expresiones regulares para validaciones
 */
export const REGEX = {
  username: /^[a-zA-Z0-9._-]{4,32}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{10,}$/,
  phone: /^\d{7,15}$/,
  roleCode: /^[A-Z_]{2,30}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
};

/**
 * Mensajes de validación consistentes
 */
export const VALIDATION_MESSAGES = {
  required: (field) => `${field} es obligatorio`,
  minLength: (field, length) => `${field} debe tener al menos ${length} caracteres`,
  maxLength: (field, length) => `${field} no puede exceder ${length} caracteres`,
  email: "Ingresa un correo válido",
  username: "Usa 4-32 caracteres (letras, números, punto, guion o guion bajo)",
  password: "Usa 10+ caracteres (mayúscula, minúscula, número)",
  phone: "Ingresa un teléfono válido (7-15 dígitos)",
  roleCode: "Usa solo mayúsculas y guion bajo (ej: ADMIN, VENTAS)",
  alphanumeric: "Solo letras y números permitidos",
};

/**
 * Reglas de validación por campo
 */
export const FIELD_VALIDATORS = {
  username: (value) => {
    if (!value?.trim()) return VALIDATION_MESSAGES.required("Usuario");
    if (!REGEX.username.test(value.trim())) return VALIDATION_MESSAGES.username;
    return null;
  },

  email: (value) => {
    if (!value?.trim()) return VALIDATION_MESSAGES.required("Correo");
    if (!REGEX.email.test(value.trim())) return VALIDATION_MESSAGES.email;
    return null;
  },

  password: (value) => {
    if (!value) return VALIDATION_MESSAGES.required("Contraseña");
    if (value.length < 10) return VALIDATION_MESSAGES.minLength("Contraseña", 10);
    // Nota: para backend, aceptamos cualquier contraseña
    // Los requisitos de complejidad pueden variar por backend
    return null;
  },

  fullName: (value) => {
    if (!value?.trim()) return VALIDATION_MESSAGES.required("Nombre completo");
    if (value.trim().length < 3) return VALIDATION_MESSAGES.minLength("Nombre completo", 3);
    return null;
  },

  phone: (value) => {
    if (!value || value === null) return null; // Opcional
    if (value && !REGEX.phone.test(value)) return VALIDATION_MESSAGES.phone;
    return null;
  },

  roleCode: (value) => {
    if (!value?.trim()) return VALIDATION_MESSAGES.required("Rol");
    if (!REGEX.roleCode.test(value.trim())) return VALIDATION_MESSAGES.roleCode;
    return null;
  },

  identifier: (value) => {
    if (!value?.trim()) return VALIDATION_MESSAGES.required("Usuario o correo");
    return null;
  },

  orderId: (value) => {
    if (!value?.toString().trim()) return VALIDATION_MESSAGES.required("Id de orden");
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return "Ingresa un id de orden de producción válido";
    return null;
  },
};

/**
 * Estados comunes de la app
 */
export const APP_STATES = {
  active: "active",
  inactive: "inactive",
  pending: "pending",
  deleted: "deleted",
};

/**
 * Roles disponibles
 */
export const ROLES = {
  ADMIN: "ADMIN",
  VENTAS: "VENTAS",
  PRODUCCION: "PRODUCCION",
  INVENTARIO: "INVENTARIO",
};

export const ROLE_LABELS = {
  ADMIN: "Administrador",
  VENTAS: "Ventas",
  PRODUCCION: "Producción",
  INVENTARIO: "Inventario",
};

/**
 * Códigos de error del backend
 */
export const API_ERRORS = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
};

export const API_ERROR_MESSAGES = {
  VALIDATION_ERROR: "Los datos enviados no son válidos",
  UNAUTHORIZED: "No autorizado. Por favor, inicia sesión",
  FORBIDDEN: "No tienes permisos para realizar esta acción",
  NOT_FOUND: "El recurso no fue encontrado",
  CONFLICT: "Ya existe un registro con esos datos",
  SERVER_ERROR: "Error del servidor. Intenta más tarde",
  NETWORK_ERROR: "Error de red. Verifica tu conexión",
};
