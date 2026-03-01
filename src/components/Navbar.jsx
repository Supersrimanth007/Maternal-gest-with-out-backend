import { NavLink } from "react-router-dom";
import { Home, Users, Activity } from "lucide-react";
import "../styles/navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">ANALYTIX-HUB.AI</div>
      <div className="navbar-links">
        <NavLink to="/" className="nav-item"><Home size={18} /> Home</NavLink>
        <NavLink to="/active" className="nav-item"><Activity size={18} /> Active Care</NavLink>
        <NavLink to="/delivered" className="nav-item"><Users size={18} /> Delivery Records</NavLink>
      </div>
    </nav>
  );
}
export default Navbar;