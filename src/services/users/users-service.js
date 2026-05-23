import { GetEndpoint, PostEndpoint } from "services/api/api-base";
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
}

const usersService = new UsersService();

export default usersService;
