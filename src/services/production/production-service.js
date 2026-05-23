import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class ProductionService {
  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.production.baseData, { params });
  }

  async registerResult(payload) {
    return PostEndpoint(endpoints.production.results, payload);
  }

  async closeOrder(productionOrderId) {
    return PostEndpoint(endpoints.production.closeOrder(productionOrderId), {});
  }
}

const productionService = new ProductionService();

export default productionService;
