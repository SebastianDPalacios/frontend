import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";

class RecipesService {
  async getList(params = {}) {
    return GetEndpoint(endpoints.recipes.list, { params });
  }

  async getBaseData(params = {}) {
    return GetEndpoint(endpoints.recipes.baseData, { params });
  }

  async create(payload) {
    return PostEndpoint(endpoints.recipes.list, payload);
  }

  async addItem(recipeId, payload) {
    return PostEndpoint(`${endpoints.recipes.list}/${recipeId}/items`, payload);
  }

  async publish(recipeId) {
    return PostEndpoint(`${endpoints.recipes.list}/${recipeId}/publish`, {});
  }
}

const recipesService = new RecipesService();

export default recipesService;
