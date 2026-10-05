import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Ambient, ScrollProgress } from './components/fx.jsx';
import { Footer, Nav, Toasts } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import LoadBoard from './pages/LoadBoard.jsx';
import { CarrierProfile, Carriers } from './pages/Carriers.jsx';
import PostLoad from './pages/PostLoad.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Track from './pages/Track.jsx';
import Join from './pages/Join.jsx';
import LoadDetail from './pages/LoadDetail.jsx';
import Guide from './pages/Guide.jsx';
import Login from './pages/Login.jsx';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <Ambient />
      <ScrollProgress />
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/loads" element={<LoadBoard />} />
          <Route path="/loads/:id" element={<LoadDetail />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/carriers" element={<Carriers />} />
          <Route path="/carriers/:id" element={<CarrierProfile />} />
          <Route path="/post" element={<PostLoad />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/track" element={<Track />} />
          <Route path="/join" element={<Join />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <Toasts />
    </>
  );
}
