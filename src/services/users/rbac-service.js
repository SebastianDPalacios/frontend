import { GetEndpoint, PostEndpoint, PutEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class RbacService {
  async getRoles() {
    return GetEndpoint(endpoints.rbac.roles);
  }

  async getPermissions() {
    return GetEndpoint(endpoints.rbac.permissions);
  }

  async createRole(payload) {
    return PostEndpoint(endpoints.rbac.roles, payload);
  }

  async updateRole(id, payload) {
    return PutEndpoint(endpoints.rbac.roleById(id), payload);
  }

  async setRolePermissions(id, permissionCodes) {
    return PutEndpoint(endpoints.rbac.rolePermissions(id), {
      p_permission_codes_json: permissionCodes,
    });
  }

  async createPermission(payload) {
    return PostEndpoint(endpoints.rbac.permissions, payload);
  }

  async getViewAccessUsers() {
    return GetEndpoint(endpoints.rbac.viewAccessUsers);
  }

  async setUserPermissions(id, permissionMode, permissionCodes) {
    return PutEndpoint(endpoints.rbac.userPermissions(id), {
      p_permission_mode: permissionMode,
      p_permission_codes_json: permissionCodes,
    });
  }
}

const rbacService = new RbacService();

export default rbacService;

