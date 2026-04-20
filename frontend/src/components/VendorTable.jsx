import { useState, useEffect, useRef } from 'react'
import './VendorTable.css'
import { FaRegEdit, FaRegListAlt, FaRegTrashAlt, FaLocationArrow } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";

import { BsPersonFillCheck, BsPersonFillX } from "react-icons/bs";


export function VendorTable({ data, onEdit, onDelete, onManageMaterials, onToggleStatus }) {
    const [activePopoverId, setActivePopoverId] = useState(null)
    const tableRef = useRef(null)

    // Handle click outside to close popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tableRef.current && !tableRef.current.contains(event.target)) {
                setActivePopoverId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!data?.length) {
        return <div className="empty-state">No vendors found.</div>
    }

    return (
        <div className="table-wrapper" ref={tableRef}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Vendor ID</th>
                        <th>Vendor Name</th>
                        <th>Category</th>
                        <th>Email</th>
                        <th>Phone Number</th>
                        <th>Location<span className='info-icon w-6 h-6' title="Click/hover the location to reveal full address"><CiCircleInfo /></span></th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((vendor) => (
                        <tr key={vendor.id} className={!vendor.is_active ? 'row-inactive' : ''}>
                            <td className="font-mono">{vendor.vendor_id}</td>
                            <td className="font-semibold">{vendor.vendor_name}</td>
                            <td>{vendor.category || '—'}</td>
                            <td>{vendor.email}</td>
                            <td>{vendor.mobile_number}</td>
                            <td className="location-cell"
                                onMouseEnter={() => setActivePopoverId(vendor.id)}
                                onMouseLeave={() => setActivePopoverId(null)}
                            >
                                <div className="location-wrapper" onClick={() => setActivePopoverId(activePopoverId === vendor.id ? null : vendor.id)}>
                                    <span>{vendor.city + "," + vendor.state}</span>
                                </div>
                                {activePopoverId === vendor.id && (
                                    <div className="address-popover" onClick={(e) => e.stopPropagation()}>
                                        <div className="popover-arrow"></div>
                                        <div className="popover-inner">
                                            <span className="popover-label">Full Address</span>
                                            <p className="popover-text">{vendor.address + ", " + vendor.city + ", " + vendor.state + ", " + vendor.country || "Address not provided"}</p>
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td>
                                <span className={`status-badge ${vendor.is_active ? 'active' : 'inactive'}`}>
                                    {vendor.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="actions-cell">
                                <button
                                    className={`btn-icon ${vendor.is_active ? 'btn-status-active' : 'btn-status-inactive'}`}
                                    title={vendor.is_active ? "Deactivate Vendor" : "Activate Vendor"}
                                    onClick={() => onToggleStatus(vendor)}
                                >
                                    {vendor.is_active ? <BsPersonFillCheck /> : <BsPersonFillX />}
                                </button>
                                <button
                                    className="btn-icon"
                                    title="Manage Materials"
                                    onClick={() => onManageMaterials(vendor)}
                                >
                                    <FaRegListAlt />
                                </button>
                                <button
                                    className="btn-icon"
                                    title="Edit"
                                    onClick={() => onEdit(vendor)}
                                >
                                    <FaRegEdit />
                                </button>
                                <button
                                    className="btn-icon btn-delete"
                                    title="Delete"
                                    onClick={() => onDelete(vendor.id)}
                                >
                                    <FaRegTrashAlt />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
