import { Outlet, Link } from 'react-router-dom';
import '@/App.css'

export default function App() {
  return (
    <div style={{ padding: '1rem' }}>
      <nav>
        <Link to="/">🏠 Convert</Link> | <Link to="/learn">📘 Learn</Link>
      </nav>
      <hr />
      <Outlet />
    </div>
  );
}
