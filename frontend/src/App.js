import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }  from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster }       from "sonner";
import Landing   from "@/pages/Landing";
import Login     from "@/pages/Login";
import Signup    from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"          element={<Landing />}  />
            <Route path="/login"     element={<Login />}    />
            <Route path="/signup"    element={<Signup />}   />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
