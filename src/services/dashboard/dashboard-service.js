import { GetEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class DashboardService {
  async getMonthly(params = {}) {
    return GetEndpoint(endpoints.dashboard.monthly, { params });
  }
}

const dashboardService = new DashboardService();

export default dashboardService;
