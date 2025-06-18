import { createContext } from 'react';

export const AuthContext = createContext({
  isAuthenticated: false,
  onLogin: () => {},
  onLogout: () => {}
});

export default AuthContext;
