import { get, post, del } from '../client';

export const listJobs = (slug, params) => 
  get(`/workspaces/${slug}/jobs`, { params });

export const getJob = (slug, id) => 
  get(`/workspaces/${slug}/jobs/${id}`);

export const createJob = (slug, data) => 
  post(`/workspaces/${slug}/jobs`, data);

export const retryJob = (slug, id) => 
  post(`/workspaces/${slug}/jobs/${id}/retry`, {});

export const cancelJob = (slug, id) => 
  del(`/workspaces/${slug}/jobs/${id}`);

export const getJobStats = (slug) => 
  get(`/workspaces/${slug}/jobs/stats`);

export const retryAllFailedJobs = (slug) => 
  post(`/workspaces/${slug}/jobs/retry-all`, {});