
import axios from 'axios';
import { ApiResponse } from '../types/telegram';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getTelegramMessages = async (cursor?: string): Promise<ApiResponse> => {
  const { data } = await api.get<ApiResponse>('/telegram/messages', {
    params: { cursor },
  });
  return data;
};
