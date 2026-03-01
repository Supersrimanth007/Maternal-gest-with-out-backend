import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import ActivePatients from "./components/ActivePatients";
import DeliveredPatients from "./components/DeliveredPatients";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/active" element={<ActivePatients />} />
        <Route path="/delivered" element={<DeliveredPatients />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;