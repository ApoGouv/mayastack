import { Toaster } from 'react-hot-toast';
import Logo from '@components/icons/Logo';
import { ThemeSelector } from '@components/ThemeSelector';
import HomeView from '@views/HomeView';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center space-x-3">
            <Logo className="w-10 h-10 text-ms-sand-500 dark:text-ms-sand-500" />
            <span className="font-bold text-xl tracking-tight">
              <span className="">Maya</span>
              <span className="text-ms-brand-500">Stack</span>
            </span>
          </div>

          {/* Right: Links */}
          <div className="space-x-6">
            <ThemeSelector />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-3 mb-4 flex-grow">
        <HomeView />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} MayaStack by Apostolos Gouvalas — All rights reserved.
        </div>
      </footer>

      <Toaster position="bottom-right" reverseOrder={false} />
    </div>
  );
}
