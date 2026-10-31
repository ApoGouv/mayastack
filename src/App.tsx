import { Toaster } from 'react-hot-toast';
import Logo from '@components/icons/Logo';
import { ThemeSelector } from '@components/ThemeSelector';
import HomeView from '@views/HomeView';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-fg">
      {/* Navbar */}
      <nav className="bg-surface shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center space-x-3">
            <Logo className="w-10 h-10 text-on-accent" />
            <span className="font-bold text-xl tracking-tight">
              <span className="">Maya</span>
              <span className="text-accent-fg">Stack</span>
            </span>
          </div>

          {/* Right: Links */}
          <div className="space-x-6">
            <ThemeSelector />
          </div>
        </div>
      </nav>

      {/* Main content. From sm, the floating Export trigger covers the bottom 104px of the screen
          (bottom-16, 40px tall): the extra bottom padding lets the last content scroll at least
          120px up, clear of it with a gap. Below sm, the last card's margin does the same */}
      <main className="container mx-auto px-4 py-3 sm:pb-13 mb-4 flex-grow">
        <HomeView />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-line">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-fg-muted">
          © {new Date().getFullYear()} MayaStack by Apostolos Gouvalas — All rights reserved.
        </div>
      </footer>

      {/* Toasts use the design-system tokens, so they follow the active theme: the raised surface
          with a decorative edge, jade for success and danger for errors (docs/DESIGN_SYSTEM.md).
          The edge is an inset outline rather than a border, so toasts keep the library's size.
          They appear at the top, below the navbar (64px), so they never cover the floating Export
          trigger or its dialog in the bottom-right corner */}
      <Toaster
        position="top-center"
        containerStyle={{ top: 80 }}
        reverseOrder={false}
        toastOptions={{
          style: {
            background: 'var(--color-surface-raised)',
            color: 'var(--color-fg)',
            outline: '1px solid var(--color-line)',
            outlineOffset: '-1px',
          },
          success: { iconTheme: { primary: 'var(--color-jade)', secondary: 'var(--color-surface-raised)' } },
          error: { iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--color-surface-raised)' } },
        }}
      />
    </div>
  );
}
