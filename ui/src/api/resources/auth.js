import { get, post, del } from './client';

export const login = (email, password) => 
  post('/auth/login', { email, password });

export const register = (name, email, password) => 
  post('/auth/register', { name, email, password });

export const getMe = () => 
  get('/auth/me');

export const generateApiKey = (name, scopes = []) => 
  post('/auth/keys', { name, scopes });

export const listApiKeys = () => 
  get('/auth/keys');

export const revokeApiKey = (prefix) => 
  del(`/auth/keys/${prefix}`);