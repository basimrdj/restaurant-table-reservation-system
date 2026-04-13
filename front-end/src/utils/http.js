export const getApiErrorMessage = (
  error,
  fallback = "Something went wrong."
) => {
  return error?.response?.data?.message || fallback;
};

export const getApiErrors = (error) => {
  return error?.response?.data?.errors || null;
};
