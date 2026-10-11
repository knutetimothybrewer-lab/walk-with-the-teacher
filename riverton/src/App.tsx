import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { applySettings, useSettings } from './platform/settings';
import { Shell } from './platform/ui/Shell';
import Home from './platform/ui/Home';
import StyleGuide from './platform/styleguide/StyleGuide';
import LessonPlayer from './platform/learn/LessonPlayer';
import Notebook from './platform/ui/Notebook';
import TeacherPage from './platform/teacher/TeacherPage';

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
          <Route path="/teacher" element={<TeacherPage />} />
          <Route path="/styleguide" element={<StyleGuide />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
