import { GetEndpoint, PatchEndpoint, PostEndpoint, PutEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class UsersService {
  async getUsers(params = {}) {
    return GetEndpoint(endpoints.users.list, { params });
  }

  async getUserById(id) {
    return GetEndpoint(endpoints.users.byId(id));
  }

  async createUser(payload) {
    return PostEndpoint(endpoints.adminAuth.users, payload);
  }

  async updateUserProfile(id, payload) {
    return PutEndpoint(endpoints.adminAuth.userProfile(id), payload);
  }

  async assignUserRoles(id, roleCodes) {
    return PutEndpoint(endpoints.adminAuth.userRoles(id), {
      p_role_codes_json: roleCodes,
    });
  }

  async setUserStatus(id, status) {
    return PatchEndpoint(endpoints.adminAuth.userStatus(id), {
      p_status: status,
    });
  }

  async forcePasswordReset(id) {
    return PostEndpoint(endpoints.adminAuth.userForcePasswordReset(id), {});
  }

  async logoutAllSessions(id) {
    return PostEndpoint(endpoints.adminAuth.userLogoutAll(id), {});
  }

  async resetPassword(id, payload) {
    return PostEndpoint(endpoints.adminAuth.userResetPassword(id), payload);
  }
}

const usersService = new UsersService();

export default usersService;
