import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '@/App.tsx'
import HomeView from '@views/HomeView.tsx';
import LearnView from '@views/LearnView.tsx';
import { ColorProvider } from '@context/ColorContext';
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<HomeView />} />
            <Route path="learn" element={<LearnView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ColorProvider>
  </StrictMode>,
);
