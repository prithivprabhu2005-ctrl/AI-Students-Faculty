import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { defaultRoute } = useAuth();

  return (
    <div className="centered-state">
      <div className="dashboard-section-card unauthorized-card">
        <h2>Unauthorized Access</h2>
        <p>You do not have permission to open this page.</p>
        <Link className="btn btn-primary" to={defaultRoute}>
          Go Back
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
