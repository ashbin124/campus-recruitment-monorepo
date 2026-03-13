import CompanyNav from '../nav/CompanyNav.jsx';
import Footer from '../components/Footer.jsx';

export default function CompanyLayout({ children }) {
  return (
    <div className="app-shell">
      <CompanyNav />
      <main className="role-main">
        <div className="role-content">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
