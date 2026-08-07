import { initClient } from '@ts-rest/core';
import { apiContract } from '@ghcp-dash/contracts';

export const apiClient = initClient(apiContract, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? '', baseHeaders: {} });
