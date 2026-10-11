import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { applySettings, useSettings } from './platform/settings';
import { Shell } from './platform/ui/Shell';
import Home from './platform/ui/Home';
import StyleGuide from './platform/styleguide/StyleGuide';
import LessonPlayer from './platform/learn/LessonPlayer';
import Notebook from './platform/ui/Notebook';
import { lazy, Suspense } from 'react';
const TeacherPage = lazy(() => import('./platform/teacher/TeacherPage'));
const LabPage = lazy(() => import('./modules/lab/ui/LabPage'));
const CrossroadsHub = lazy(() => import('./modules/crossroads/ui/CrossroadsHub'));
const XrPlayer = lazy(() => import('./modules/crossroads/ui/Player'));

export default function App() {
  const s = useSettings();
  useEffect(() => applySettings(s), [s]);
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:id" element={<LessonPlayer />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/teacher" element={<Suspense fallback={<main className="page">Loading…</main>}><TeacherPage /></Suspense>} />
          <Route path="/lab" element={<Suspense fallback={<main className="page">Loading Sim Lab…</main>}><LabPage /></Suspense>} />
          <Route path="/crossroads" element={<Suspense fallback={<main className="page">Loading Crossroads…</main>}><CrossroadsHub /></Suspense>} />
          <Route path="/crossroads/:id" element={<Suspense fallback={<main className="page">Loading…</main>}><XrPlayer /></Suspense>} />
          <Route path="/styleguide" element={<StyleGuide />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
