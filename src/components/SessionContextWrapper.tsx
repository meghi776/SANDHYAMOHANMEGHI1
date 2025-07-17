import React from 'react';
// Removed useLocation, useNavigate imports as they are now passed as props
import { SessionContextProvider } from '@/contexts/SessionContext';

interface SessionContextWrapperProps {
  children: React.ReactNode;
  navigate: (path: string) => void; // Accept navigate as prop
  location: { pathname: string }; // Accept location as prop
}

const SessionContextWrapper: React.FC<SessionContextWrapperProps> = ({ children, navigate, location }) => {
  // Removed internal calls to useNavigate and useLocation

  return (
    <SessionContextProvider navigate={navigate} location={location}>
      {children}
    </SessionContextProvider>
  );
};

export default SessionContextWrapper;