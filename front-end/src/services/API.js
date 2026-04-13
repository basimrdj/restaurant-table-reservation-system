import axios from "axios";

const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export default (url = defaultBaseUrl) => {
  return axios.create({
    baseURL: url,
  });
};
