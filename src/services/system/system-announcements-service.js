import endpoints from "services/api";
import { GetEndpoint, PatchEndpoint, PostEndpoint } from "services/api/api-base";

const systemAnnouncementsService = {
  getCurrent: () => GetEndpoint(endpoints.systemAnnouncements.current),
  list: () => GetEndpoint(endpoints.systemAnnouncements.list),
  create: (data) => PostEndpoint(endpoints.systemAnnouncements.list, data),
  end: (id) => PatchEndpoint(endpoints.systemAnnouncements.end(id), {}),
};

export default systemAnnouncementsService;
