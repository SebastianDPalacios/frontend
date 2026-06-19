import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class RecipesService {
  async getList(params = {}) {
    return GetEndpoint(endpoints.recipes.list, { params });
  }

  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.recipes.baseData, { params });
  }

  async getDetail(recipeId) {
    return GetEndpoint(endpoints.recipes.byId(recipeId));
  }

  async create(payload) {
    return PostEndpoint(endpoints.recipes.list, payload);
  }

  async createCosting(payload) {
    return PostEndpoint(endpoints.recipes.costing, payload);
  }

  async createVersion(recipeId, payload) {
    return PostEndpoint(endpoints.recipes.version(recipeId), payload);
  }

  async addItem(recipeId, payload) {
    return PostEndpoint(`${endpoints.recipes.list}/${recipeId}/items`, payload);
  }

  async getOutputs(recipeId) {
    return GetEndpoint(endpoints.recipes.outputs(recipeId));
  }

  async addOutput(recipeId, payload) {
    return PostEndpoint(endpoints.recipes.outputs(recipeId), payload);
  }

  async publish(recipeId) {
    return PostEndpoint(`${endpoints.recipes.list}/${recipeId}/publish`, {});
  }
}

const recipesService = new RecipesService();

export default recipesService;
