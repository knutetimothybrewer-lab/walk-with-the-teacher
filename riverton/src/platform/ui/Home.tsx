import { Link } from 'react-router-dom';
export default function Home() {
  return (
    <main className="page">
      <h1>Welcome to Riverton</h1>
      <p>Hub and module cards arrive in Phase 1b. For now, see the <Link to="/styleguide">style guide</Link>.</p>
    </main>
  );
}
