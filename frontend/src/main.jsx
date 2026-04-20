import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { WebSocketProvider } from './context/WebSocketContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
