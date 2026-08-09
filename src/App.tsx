import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import CaptureMethods from "./components/CaptureMethods";
import BimSlider from "./components/BimSlider";
import Solutions from "./components/Solutions";
import Testimonials from "./components/Testimonials";
import Footer from "./components/Footer";
import Login from "./components/Login";
import DashboardShell from "./components/DashboardShell";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  if (isLoggedIn) {
    return (
      <DashboardShell
        userEmail={userEmail}
        onSignOut={() => setIsLoggedIn(false)}
      />
    );
  }

  if (showLogin && !isLoggedIn) {
    return (
      <Login
        onLoginSuccess={(email) => {
          setUserEmail(email);
          setIsLoggedIn(true);
          setShowLogin(false);
        }}
        onBackToHome={() => setShowLogin(false)}
      />
    );
  }

  return (
    <div className="bg-[#140F23] text-[#E2DEFA] min-h-screen flex flex-col">
      {/* Sticky Header */}
      <Header
        isLoggedIn={isLoggedIn}
        onSignInClick={() => setShowLogin(true)}
        onSignOut={() => setIsLoggedIn(false)}
      />

      {/* Main Content Layout */}
      <main className="flex-grow">
        {/* Hero Section */}
        <Hero />

        {/* Products Section (Capture Workflows & Raw Footage vs AI Detection Slider) */}
        <div id="products">
          <CaptureMethods />
          <BimSlider />
        </div>

        {/* Sector Solutions */}
        <Solutions />

        {/* Pricing */}
        <Testimonials />
      </main>

      {/* Full Links Footer */}
      <Footer />
    </div>
  );
}
