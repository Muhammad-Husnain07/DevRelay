import { get, post, put, del } from '../client';

export const listWorkspaces = () => 
  get('/workspaces');

export const getWorkspace = (slug) => 
  get(`/workspaces/${slug}`);

export const createWorkspace = (data) => 
  post('/workspaces', data);

export const updateWorkspace = (slug, data) => 
  put(`/workspaces/${slug}`, data);

export const deleteWorkspace = (slug) => 
  del(`/workspaces/${slug}`);

export const getMembers = (slug) => 
  get(`/workspaces/${slug}/members`);

export const inviteMember = (slug, email, role) => 
  post(`/workspaces/${slug}/members`, { email, role });

export const removeMember = (slug, userId) => 
  del(`/workspaces/${slug}/members/${userId}`);

export const updateMemberRole = (slug, userId, role) => 
  put(`/workspaces/${slug}/members/${userId}/role`, { role });

export const getWorkspaceStats = (slug) => 
  get(`/workspaces/${slug}/stats`);

export const listApiKeys = (slug) => 
  get(`/workspaces/${slug}/api-keys`);

export const createApiKey = (slug, data) => 
  post(`/workspaces/${slug}/api-keys`, data);

export const revokeApiKey = (slug, id) => 
  del(`/workspaces/${slug}/api-keys/${id}`);