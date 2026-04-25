import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * @param {string[]} allowedRoles - List of roles that can access this route
 * @returns {JSX.Element} - Either the child routes (Outlet) or a redirect to login
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const token = localStorage.getItem('shahi_token');
  const userRole = localStorage.getItem('shahi_role');

  // 1. If no token exists, the user is not logged in.
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 2. If specific roles are required, check if the user has one of them.
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // If user is logged in but doesn't have permission, we can redirect to a "denied" page 
    // or just back to the main site/dashboard they DO have access to.
    return <Navigate to="/" replace />;
  }

  // 3. If everything is fine, render the children components.
  return <Outlet />;
};

export default ProtectedRoute;
