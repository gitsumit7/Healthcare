import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="center empty">
      <h1>404</h1>
      <p>We couldn&apos;t find that page.</p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </div>
  );
}
