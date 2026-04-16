import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://YOUR_IP_HERE:5000/api', // ⚠️ PALITAN ITO NG IYONG IP ADDRESS,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Connection timed out. Check if the backend server is running.';
    } else if (!error.response) {
      error.message = 'Cannot connect to server. Check your IP address and WiFi connection.';
    }
    return Promise.reject(error);
  }
);

export default api;