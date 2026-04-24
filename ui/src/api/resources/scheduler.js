import { get, post, put, del } from '../client';

export const listScheduledJobs = (slug, params) => 
  get(`/workspaces/${slug}/scheduled-jobs`, { params });

export const getScheduledJob = (slug, id) => 
  get(`/workspaces/${slug}/scheduled-jobs/${id}`);

export const createScheduledJob = (slug, data) => 
  post(`/workspaces/${slug}/scheduled-jobs`, data);

export const updateScheduledJob = (slug, id, data) => 
  put(`/workspaces/${slug}/scheduled-jobs/${id}`, data);

export const deleteScheduledJob = (slug, id) => 
  del(`/workspaces/${slug}/scheduled-jobs/${id}`);

export const toggleScheduledJob = (slug, id) => 
  post(`/workspaces/${slug}/scheduled-jobs/${id}/toggle`, {});

export const runScheduledJobNow = (slug, id) => 
  post(`/workspaces/${slug}/scheduled-jobs/${id}/run-now`, {});

export const getScheduledJobHistory = (slug, id, params) => 
  get(`/workspaces/${slug}/scheduled-jobs/${id}/history`, { params });