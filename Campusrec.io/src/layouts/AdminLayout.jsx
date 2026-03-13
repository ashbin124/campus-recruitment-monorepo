import AdminNav from '../nav/AdminNav.jsx';
import Footer from '../components/Footer.jsx';

export default function AdminLayout({ children }) {
  return (
    <div className="app-shell">
      <AdminNav />
      <main className="role-main">
        <div className="role-content">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
