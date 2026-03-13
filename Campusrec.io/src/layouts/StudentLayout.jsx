import StudentNav from '../nav/StudentNav.jsx';
import Footer from '../components/Footer.jsx';

export default function StudentLayout({ children }) {
  return (
    <div className="app-shell">
      <StudentNav />
      <main className="role-main pb-10 md:pb-12">{children}</main>
      <Footer />
    </div>
  );
}
