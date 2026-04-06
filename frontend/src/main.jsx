import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { WebSocketProvider } from './context/WebSocketContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
