import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Atendimentos, Reports, Team, Settings, Help, WhatsApp } from './pages/Pages';

// Verificar se token existe E não está expirado
const isTokenValid = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        // Decodificar JWT payload (parte 2, base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        // Token expirado?
        if (payload.exp && payload.exp < now) {
            localStorage.removeItem('token');
            return false;
        }
        return true;
    } catch {
        // Token malformado
        localStorage.removeItem('token');
        return false;
    }
};

const ProtectedRoute = ({ children }) => {
    if (!isTokenValid()) {
        return <Navigate to="/" replace />;
    }
    return children;
};

function App() {
    return (
        <Router>
            <Toaster position="top-right" richColors />
            <Routes>
                <Route path="/" element={<Login />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/atendimentos" element={<ProtectedRoute><Atendimentos /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
                <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
            </Routes>
        </Router>
    );
}

export default App;
