import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Home, ArrowLeft } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  const { isAuthenticated, isStaff } = useAuth();
  const homePath = isAuthenticated ? (isStaff ? '/staff' : '/patient') : '/login';

  return (
    <div className="not-found-page animate-fade-in">
      <div className="not-found-card card">
        <div className="not-found-icon">
          <Heart size={36} />
        </div>
        <h1 className="not-found-code">404</h1>
        <h2>Page not found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to={homePath} className="btn btn-primary">
            <Home size={16} /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
