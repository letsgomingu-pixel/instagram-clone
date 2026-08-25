import { Navigate } from 'react-router-dom';

/** Legacy explore route — mobile search tab includes the explore grid. */
export function ExplorePage() {
  return <Navigate to="/search" replace />;
}
