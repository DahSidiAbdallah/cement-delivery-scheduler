import { createContext } from 'react';

// role: 'admin' | 'viewer'
export const AuthContext = createContext({
  isAuthenticated: false,
  role: 'viewer',
  onLogin: () => {},
  onLogout: () => {}
});

export default AuthContext;
