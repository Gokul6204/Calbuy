import { createContext, useContext, useState, useCallback } from 'react'
import './NotificationModal.css'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
    const [alert, setAlert] = useState(null)
    const [confirmDialog, setConfirmDialog] = useState(null)

    const showAlert = useCallback((message, type = 'info', duration = 5000) => {
        setAlert({ message, type })
        if (duration) {
            setTimeout(() => {
                setAlert(null)
            }, duration)
        }
    }, [])

    const showConfirm = useCallback((message, onConfirm) => {
        setConfirmDialog({ message, onConfirm })
    }, [])

    const hideAlert = () => setAlert(null)
    const hideConfirm = () => setConfirmDialog(null)

    return (
        <NotificationContext.Provider value={{ showAlert, hideAlert, showConfirm, hideConfirm }}>
            {children}
            {alert && (
                <div className="notification-overlay" onClick={hideAlert}>
                    <div 
                        className={`notification-modal ${alert.type}`} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="notification-header">
                            <div className="notification-icon">
                                {alert.type === 'success' && <FaCheckCircle />}
                                {alert.type === 'error' && <FaExclamationCircle />}
                                {alert.type === 'info' && <FaInfoCircle />}
                            </div>
                            <div className="notification-content">
                                <p>{alert.message}</p>
                            </div>
                            <button className="notification-close" onClick={hideAlert}>
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="notification-footer">
                            <button className="btn-ok" onClick={hideAlert}>OK</button>
                        </div>
                    </div>
                </div>
            )}
            
            {confirmDialog && (
                <div className="notification-overlay" onClick={hideConfirm}>
                    <div 
                        className={`notification-modal confirm-type`} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="notification-header">
                            <div className="notification-icon">
                                <FaInfoCircle />
                            </div>
                            <div className="notification-content">
                                <p>{confirmDialog.message}</p>
                            </div>
                            <button className="notification-close" onClick={hideConfirm}>
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="notification-footer" style={{ gap: '10px' }}>
                            <button className="btn-secondary" onClick={hideConfirm}>Cancel</button>
                            <button className="btn-primary" onClick={() => {
                                if (confirmDialog.onConfirm) confirmDialog.onConfirm()
                                hideConfirm()
                            }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    )
}

export const useAlert = () => {
    const context = useContext(NotificationContext)
    if (!context) {
        throw new Error('useAlert must be used within a NotificationProvider')
    }
    return context
}

export const useNotification = useAlert
