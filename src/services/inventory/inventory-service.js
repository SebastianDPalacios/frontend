import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class InventoryService {
  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.inventory.baseData, { params });
  }

  async getMovements(params = {}) {
    return GetEndpoint(endpoints.inventory.movements, { params });
  }

  async applyMovement(payload) {
    return PostEndpoint(endpoints.inventory.movements, payload);
  }
}

const inventoryService = new InventoryService();

export default inventoryService;
