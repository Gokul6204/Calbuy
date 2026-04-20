import { createContext, useContext, useState, useEffect } from 'react';
import { ensureCsrfCookie, csrfHeaders } from '../api/http';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Try to load user from localStorage on init
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            await ensureCsrfCookie();
            await fetch('/api/accounts/logout/', {
                method: 'POST',
                credentials: 'include',
                headers: { ...csrfHeaders() },
            });
        } catch {
            // Ignore network/logout errors; still clear local session.
        } finally {
            setUser(null);
            localStorage.removeItem('user');
        }
    };

    const updateProfile = (updatedData) => {
        const newUser = { ...user, ...updatedData };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, updateProfile, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
