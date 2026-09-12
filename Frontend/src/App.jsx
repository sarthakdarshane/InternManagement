import React from "react";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoutesConfig from "./routes.jsx";
import "./dashboard.css";

const App = () => {
  const { user } = useAuth();
  return (
    <div className="App">
      <Navbar />
      <div className="container">
        <RoutesConfig user={user} />
      </div>
    </div>
  );
};

export default App;
