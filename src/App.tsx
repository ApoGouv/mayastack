import { Outlet, Link } from "react-router-dom";
import Logo from "@components/icons/Logo";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center space-x-2">
          <Logo className="w-20 h-20 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-lg">
            <span className="logo-part-left">Maya</span>
            <span className="logo-part-right">Stack</span>
          </span>
        </div>

        {/* Right: Links */}
        <div className="space-x-4">
          <Link
            to="/"
            className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition"
          >
            Convert
          </Link>
          <Link
            to="/learn"
            className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition"
          >
            Learn
          </Link>
        </div>
      </nav>

      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
