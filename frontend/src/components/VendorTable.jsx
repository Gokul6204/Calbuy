import './VendorTable.css'
import { FaRegEdit, FaRegListAlt, FaRegTrashAlt } from "react-icons/fa";


export function VendorTable({ data, onEdit, onDelete, onManageMaterials }) {
    if (!data?.length) {
        return <div className="empty-state">No vendors found.</div>
    }

    return (
        <div className="table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Vendor ID</th>
                        <th>Vendor Name</th>
                        <th>Email</th>
                        <th>Phone Number</th>
                        <th>Location</th>
                        <th>Address</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((vendor) => (
                        <tr key={vendor.id}>
                            <td className="font-mono">{vendor.vendor_id}</td>
                            <td className="font-semibold">{vendor.vendor_name}</td>
                            <td>{vendor.email}</td>
                            <td>{vendor.mobile_number}</td>
                            <td>{vendor.location}</td>
                            <td className="cell-address">{vendor.address}</td>
                            <td className="actions-cell">
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
