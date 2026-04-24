import { get, post, del } from '../client';

export const dispatchEvent = (slug, data) => 
  post(`/workspaces/${slug}/events`, data);

export const listEvents = (slug, params) => 
  get(`/workspaces/${slug}/events`, { params });

export const getEvent = (slug, eventId) => 
  get(`/workspaces/${slug}/events/${eventId}`);

export const listInbound = (slug, params) => 
  get(`/workspaces/${slug}/inbound`, { params });

export const getInbound = (slug, id) => 
  get(`/workspaces/${slug}/inbound/${id}`);