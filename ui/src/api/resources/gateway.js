import { get, post, put, del } from '../client';

export const listGatewayRoutes = (slug, params) => 
  get(`/workspaces/${slug}/gateway/routes`, { params });

export const getGatewayRoute = (slug, id) => 
  get(`/workspaces/${slug}/gateway/routes/${id}`);

export const createGatewayRoute = (slug, data) => 
  post(`/workspaces/${slug}/gateway/routes`, data);

export const updateGatewayRoute = (slug, id, data) => 
  put(`/workspaces/${slug}/gateway/routes/${id}`, data);

export const deleteGatewayRoute = (slug, id) => 
  del(`/workspaces/${slug}/gateway/routes/${id}`);

export const getGatewayLogs = (slug, params) => 
  get(`/workspaces/${slug}/gateway/logs`, { params });

export const getGatewayStats = (slug, params) => 
  get(`/workspaces/${slug}/gateway/stats`, { params });

export const listConsumers = (slug, params) => 
  get(`/workspaces/${slug}/gateway/consumers`, { params });

export const getConsumer = (slug, id) => 
  get(`/workspaces/${slug}/gateway/consumers/${id}`);

export const createConsumer = (slug, data) => 
  post(`/workspaces/${slug}/gateway/consumers`, data);

export const updateConsumer = (slug, id, data) => 
  put(`/workspaces/${slug}/gateway/consumers/${id}`, data);

export const deleteConsumer = (slug, id) => 
  del(`/workspaces/${slug}/gateway/consumers/${id}`);

export const toggleConsumer = (slug, id) => 
  post(`/workspaces/${slug}/gateway/consumers/${id}/toggle`, {});

export const getConsumerUsage = (slug, id, params) => 
  get(`/workspaces/${slug}/gateway/consumers/${id}/usage`, { params });