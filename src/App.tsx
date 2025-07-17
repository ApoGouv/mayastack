import { Outlet, Link } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import Logo from "@components/icons/Logo";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center space-x-3">
              <Logo className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-xl tracking-tight">
                <span className="">Maya</span>
                <span className="text-ms-brand-500">Stack</span>
              </span>
          </div>

          {/* Right: Links */}
          <div className="space-x-6">
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
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <Toaster
        position="bottom-right"
        reverseOrder={false}
      />
    </div>
  );
}
