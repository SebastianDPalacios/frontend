import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class InventoryService {
  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.inventory.baseData, { params });
  }

  async applyMovement(payload) {
    return PostEndpoint(endpoints.inventory.movements, payload);
  }
}

const inventoryService = new InventoryService();

export default inventoryService;
