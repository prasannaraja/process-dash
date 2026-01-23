import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Today from "./pages/Today";
import DayView from "./pages/DayView";
import WeekView from "./pages/WeekView";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <nav className="border-b p-4 mb-4">
          <ul className="flex gap-6 max-w-4xl mx-auto">
            <li><Link to="/" className="font-bold hover:text-blue-600">Today</Link></li>
            <li><Link to="/day" className="hover:text-blue-600">Day Report</Link></li>
            <li><Link to="/week" className="hover:text-blue-600">Week Report</Link></li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/day" element={<DayView />} />
          <Route path="/week" element={<WeekView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
