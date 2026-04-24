import { get, post, put, del } from '../client';

export const listWebhooks = (slug, params) => 
  get(`/workspaces/${slug}/webhooks`, { params });

export const getWebhook = (slug, id) => 
  get(`/workspaces/${slug}/webhooks/${id}`);

export const createWebhook = (slug, data) => 
  post(`/workspaces/${slug}/webhooks`, data);

export const updateWebhook = (slug, id, data) => 
  put(`/workspaces/${slug}/webhooks/${id}`, data);

export const deleteWebhook = (slug, id) => 
  del(`/workspaces/${slug}/webhooks/${id}`);

export const rotateSecret = (slug, id) => 
  post(`/workspaces/${slug}/webhooks/${id}/rotate-secret`, {});

export const testWebhook = (slug, id, payload) => 
  post(`/workspaces/${slug}/webhooks/${id}/test`, { payload });

export const getWebhookStats = (slug, id) => 
  get(`/workspaces/${slug}/webhooks/${id}/stats`);

export const getDeliveries = (slug, id, params) => 
  get(`/workspaces/${slug}/webhooks/${id}/deliveries`, { params });