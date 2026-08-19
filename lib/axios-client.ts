import axios from "axios";

const AxiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export {AxiosInstance};