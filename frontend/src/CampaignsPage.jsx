// CampaignsPage.jsx
import React from 'react';
import './CampaignsPage.css';
import { FaEnvelope, FaUserFriends, FaEye, FaTrash, FaCalendarAlt, FaEdit } from 'react-icons/fa';

export default function CampaignsPage({ campaigns = [], onViewCampaign, onDeleteCampaign, onEditCampaign }) {
    return (
        <div className="campaigns-page">
            <div className="campaigns-top">
                <h3>Your Campaigns</h3>
                <p className="campaigns-count">{campaigns.length} total</p>
            </div>

            {campaigns.length === 0 ? (
                <div className="empty-state">
                    <p>No campaigns yet — create one using the <strong>New Campaign</strong> button.</p>
                </div>
            ) : (
                <div className="campaigns-grid">
                    {campaigns.map(c => (
                        <div className="campaign-card" key={c.id}>
                            <div className="card-left">
                                <h4 className="campaign-name">{c.name}</h4>
                                <p className="campaign-topic">{c.topic}</p>
                                <div className="campaign-meta">
                                    <span className="meta-item"><FaEnvelope /> {c.senderEmails?.length || 0}</span>
                                    <span className="meta-item"><FaUserFriends /> {c.recipientEmails?.length || 0}</span>
                                    <span className="meta-item"><FaCalendarAlt /> {c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</span>
                                </div>
                            </div>

                            <div className="card-actions">
                                <button className="btn-view" onClick={() => onViewCampaign(c)}><FaEye /> View</button>
                                <button className="btn-edit" onClick={() => onEditCampaign(c)}><FaEdit /> Edit</button>
                                <button className="btn-delete" onClick={() => onDeleteCampaign(c.id)}><FaTrash /> Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
