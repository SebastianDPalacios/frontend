export const getApiErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};
