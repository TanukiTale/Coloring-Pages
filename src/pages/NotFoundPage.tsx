import { Link } from 'react-router-dom';

export const NotFoundPage = (): JSX.Element => (
  <section className="screen">
    <h1>Page not found</h1>
    <Link className="inline-link" to="/">
      Return Home
    </Link>
  </section>
);
