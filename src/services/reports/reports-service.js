import { GetEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class ReportsService {
  async getAuditLogs(params = {}) {
    return GetEndpoint(endpoints.reports.audit, { params });
  }
}

const reportsService = new ReportsService();

export default reportsService;
