// CampaignDetailModal.jsx
import React from 'react';
import './CampaignDetailModal.css';
import { FaTimes, FaEnvelope, FaUserFriends, FaCalendarAlt } from 'react-icons/fa';

export default function CampaignDetailModal({ isOpen, onClose, campaign, onDelete }) {
    if (!isOpen || !campaign) return null;

    return (
        <div className="detail-overlay">
            <div className="detail-content">
                <button className="detail-close" onClick={onClose}><FaTimes /></button>
                <h2 className="detail-title">{campaign.name}</h2>
                <p className="detail-sub"><strong>Topic:</strong> {campaign.topic}</p>
                <p className="detail-sub"><strong>Subtopic:</strong> {campaign.subtopic}</p>
                <p className="detail-sub"><strong>Created:</strong> {campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : '-'}</p>

                <div className="emails-row">
                    <div className="emails-column">
                        <h4><FaEnvelope /> Senders</h4>
                        <ul>
                            {campaign.senderEmails && campaign.senderEmails.length > 0 ? (
                                campaign.senderEmails.map((e, i) => <li key={i}>{e}</li>)
                            ) : <li className="muted">No senders</li>}
                        </ul>
                    </div>

                    <div className="emails-column">
                        <h4><FaUserFriends /> Recipients</h4>
                        <ul>
                            {campaign.recipientEmails && campaign.recipientEmails.length > 0 ? (
                                campaign.recipientEmails.map((e, i) => <li key={i}>{e}</li>)
                            ) : <li className="muted">No recipients</li>}
                        </ul>
                    </div>
                </div>

                <div className="detail-actions">
                    <button className="btn-delete" onClick={() => { onDelete && onDelete(); }}>Delete</button>
                    <button className="btn-close" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
