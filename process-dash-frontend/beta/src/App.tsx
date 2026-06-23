import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Today from "./pages/Today";
import DayView from "./pages/DayView";
import WeekView from "./pages/WeekView";
import Todos from "./pages/Todos";
import WeekendSummary from "./pages/WeekendSummary";
import SprintSummaries from "./pages/SprintSummaries";
import ProjectConfig from "./pages/ProjectConfig";
import ProjectsDashboard from "./pages/ProjectsDashboard";
import ProjectDataView from "./pages/ProjectDataView";
import Activity from "./pages/Activity";
import { CopilotBlade } from "./components/CopilotBlade";

function App() {
  const [bladeOpen, setBladeOpen] = useState(false);

  // ⌘K / Ctrl+K toggles the blade
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setBladeOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <nav className="border-b p-4 mb-4">
          <ul className="flex gap-6 max-w-5xl mx-auto items-center">
            <li><Link to="/" className="font-bold hover:text-blue-600">Today</Link></li>
            <li><Link to="/todos" className="hover:text-blue-600">Todos</Link></li>
            <li><Link to="/day" className="hover:text-blue-600">Day Report</Link></li>
            <li><Link to="/week" className="hover:text-blue-600">Week Report</Link></li>
            <li><Link to="/activity" className="hover:text-blue-600 font-semibold text-blue-700">Activity</Link></li>
            <li><Link to="/weekend" className="hover:text-blue-600 text-gray-400">Weekend</Link></li>
            <li><Link to="/sprints" className="hover:text-blue-600">Sprints</Link></li>
            <li><Link to="/projects/dashboard" className="text-blue-600 font-bold hover:underline">Projects</Link></li>
            <li><Link to="/project" className="hover:text-blue-600">Config</Link></li>
            {/* Copilot toggle — right-aligned */}
            <li className="ml-auto">
              <button
                onClick={() => setBladeOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                title="Open Copilot (⌘K)"
              >
                <span className="text-xs">✦</span>
                Copilot
                <kbd className="hidden sm:inline text-[10px] opacity-60 bg-indigo-500 px-1 rounded">⌘K</kbd>
              </button>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/day" element={<DayView />} />
          <Route path="/week" element={<WeekView />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/weekend" element={<WeekendSummary />} />
          <Route path="/sprints" element={<SprintSummaries />} />
          <Route path="/projects/dashboard" element={<ProjectsDashboard />} />
          <Route path="/projects/:id/data" element={<ProjectDataView />} />
          <Route path="/project" element={<ProjectConfig />} />
        </Routes>

        {/* Copilot blade — mounted once at app level, available on every page */}
        <CopilotBlade open={bladeOpen} onClose={() => setBladeOpen(false)} />
      </div>
    </BrowserRouter>
  );
}

export default App;
