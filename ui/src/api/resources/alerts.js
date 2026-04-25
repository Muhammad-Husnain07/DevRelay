import { get, post, put, del } from '../client';

export const listAlertRules = (slug, params) => 
  get(`/workspaces/${slug}/alerts/rules`, { params });

export const getAlertRule = (slug, id) => 
  get(`/workspaces/${slug}/alerts/rules/${id}`);

export const createAlertRule = (slug, data) => 
  post(`/workspaces/${slug}/alerts/rules`, data);

export const updateAlertRule = (slug, id, data) => 
  put(`/workspaces/${slug}/alerts/rules/${id}`, data);

export const deleteAlertRule = (slug, id) => 
  del(`/workspaces/${slug}/alerts/rules/${id}`);

export const evaluateAlertRule = (slug, id) => 
  post(`/workspaces/${slug}/alerts/rules/${id}/evaluate`, {});

export const testAlertRule = (slug, id) => 
  post(`/workspaces/${slug}/alerts/rules/${id}/test`, {});

export const getAlerts = (slug, params) => 
  get(`/workspaces/${slug}/alerts`, { params });

export const deleteAlert = (slug, id) => 
  del(`/workspaces/${slug}/alerts/${id}`);