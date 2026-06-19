import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class EmployeesService {
  async getEmployees(params = {}) {
    return GetEndpoint(endpoints.employees.list, { params });
  }

  async createEmployee(payload) {
    return PostEndpoint(endpoints.employees.create, payload);
  }
}

const employeesService = new EmployeesService();

export default employeesService;
