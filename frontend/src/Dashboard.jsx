// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import {
    FaTachometerAlt,
    FaBullhorn,
    FaInbox,
    FaUsers,
    FaCog,
    FaStar,
    FaChevronDown,
    FaPlus,
    FaList,
    FaChevronRight,
    FaChevronDown as FaChevronDownSmall,
} from 'react-icons/fa';

// Modal + pages
import CampaignModal from './CampaignModal.jsx';
import CampaignsPage from './CampaignsPage.jsx';
import CampaignDetailModal from './CampaignDetailModal.jsx';
import ListsPage from './ListsPage.jsx';
import ListsManage from './ListsManage.jsx';

export default function Dashboard({ username, onLogout }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activePage, setActivePage] = useState('dashboard'); 
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [campaignBeingEdited, setCampaignBeingEdited] = useState(null);
    const [isListsOpen, setIsListsOpen] = useState(false);

    const API_BASE = 'http://127.0.0.1:5000';
    const FASTAPI_URL = 'http://127.0.0.1:8000/'; 
    // replace with your actual FastAPI endpoint

    // Load campaigns from backend
    useEffect(() => {
        if (!username) return;
        const controller = new AbortController();
        const load = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/campaigns?username=${encodeURIComponent(username)}`,
                    { method: 'GET', signal: controller.signal }
                );
                if (!res.ok) {
                    setCampaigns([]);
                    return;
                }
                const data = await res.json();
                setCampaigns(Array.isArray(data) ? data : []);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    setCampaigns([]);
                }
            }
        };
        load();
        return () => controller.abort();
    }, [username]);

    const handleCampaignCreate = async (campaign) => {
        try {
            const res = await fetch(`${API_BASE}/api/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    name: campaign.name,
                    topic: campaign.topic,
                    subtopic: campaign.subtopic,
                    senderEmails: campaign.senderEmails || [],
                    recipientEmails: campaign.recipientEmails || [],
                }),
            });
            if (!res.ok) return;
            const saved = await res.json();
            setCampaigns((prev) => [saved, ...prev]);
            setActivePage('campaigns');
        } catch (e) {}
    };

    const handleViewCampaign = (campaign) => {
        setSelectedCampaign(campaign);
    };

    const handleDeleteCampaign = async (id) => {
        try {
            const res = await fetch(
                `${API_BASE}/api/campaigns/${id}?username=${encodeURIComponent(username)}`,
                { method: 'DELETE' }
            );
            if (!res.ok) return;
            setCampaigns((prev) => prev.filter((c) => c.id !== id));
            if (selectedCampaign && selectedCampaign.id === id) {
                setSelectedCampaign(null);
            }
        } catch (e) {}
    };

    const handleEditCampaign = (campaign) => {
        setCampaignBeingEdited(campaign);
        setIsEditModalOpen(true);
    };

    const handleCampaignUpdate = async (updatedCampaign) => {
        try {
            const res = await fetch(
                `${API_BASE}/api/campaigns/${updatedCampaign.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        name: updatedCampaign.name,
                        topic: updatedCampaign.topic,
                        subtopic: updatedCampaign.subtopic,
                        senderEmails: updatedCampaign.senderEmails || [],
                        recipientEmails: updatedCampaign.recipientEmails || [],
                    }),
                }
            );
            if (!res.ok) return;
            setCampaigns((prev) =>
                prev.map((c) =>
                    c.id === updatedCampaign.id ? { ...c, ...updatedCampaign } : c
                )
            );
            setIsEditModalOpen(false);
            setCampaignBeingEdited(null);
        } catch (e) {}
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="logo">Email Management</h1>
                </div>

                <div className="profile-section">
                    <img
                        src={`https://api.dicebear.com/8.x/initials/svg?seed=${username}`}
                        alt="User Avatar"
                        className="avatar"
                    />
                    <span className="profile-name">{username}</span>
                    <FaChevronDown className="profile-arrow" />
                </div>

                <nav className="nav-menu">
                    <button
                        className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActivePage('dashboard')}
                    >
                        <FaTachometerAlt className="nav-icon" /> Dashboard
                    </button>

                    <div
                        className={`nav-item dropdown ${isListsOpen ? 'open' : ''}`}
                        onClick={() => setIsListsOpen((prev) => !prev)}
                    >
                        <div
                            className={`nav-item-row ${
                                activePage === 'lists' || activePage === 'listsManage' ? 'active' : ''
                            }`}
                        >
                            <FaList className="nav-icon" />
                            <span>Lists</span>
                            <span className="chev">
                                {isListsOpen ? <FaChevronDownSmall /> : <FaChevronRight />}
                            </span>
                        </div>
                    </div>
                    {isListsOpen && (
                        <div className="submenu">
                            <button
                                className={`nav-subitem ${activePage === 'lists' ? 'active' : ''}`}
                                onClick={() => setActivePage('lists')}
                            >
                                Add List
                            </button>
                            <button
                                className={`nav-subitem ${activePage === 'listsManage' ? 'active' : ''}`}
                                onClick={() => setActivePage('listsManage')}
                            >
                                Manage
                            </button>
                        </div>
                    )}

                    <button
                        className={`nav-item ${activePage === 'campaigns' ? 'active' : ''}`}
                        onClick={() => setActivePage('campaigns')}
                    >
                        <FaBullhorn className="nav-icon" /> Campaigns
                        <span className="badge">({campaigns.length})</span>
                    </button>

                    {/* ✅ Inbox directly opens FastAPI in new tab */}
                    <button
                        className="nav-item"
                        onClick={() => window.open(FASTAPI_URL, "_blank", "noopener,noreferrer")}
                    >
                        <FaInbox className="nav-icon" /> Email Validation
                    </button>

                    <button className="nav-item">
                        <FaStar className="nav-icon" /> Leads
                    </button>
                    <button className="nav-item">
                        <FaUsers className="nav-icon" /> Team
                    </button>
                    <button className="nav-item">
                        <FaCog className="nav-icon" /> Settings
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-button" onClick={onLogout}>
                        Log Out
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="main-header">
                    {activePage === 'dashboard' && (
                        <div className="tabs">
                            <button className="tab-item active">Add Leads</button>
                            <button className="tab-item">Create a Sequence</button>
                            <button className="tab-item">Settings</button>
                        </div>
                    )}
                    {activePage === 'campaigns' && (
                        <div className="campaigns-header-inline">
                            <h2>Campaigns</h2>
                            <div className="header-actions">
                                <button
                                    className="primary-button"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    <FaPlus /> New Campaign
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                <div className="content-body">
                    {activePage === 'dashboard' && (
                        <>
                            <h2 className="content-title">Lists of leads</h2>
                            <div className="cta-card">
                                <div className="cta-icon-container">
                                    <div className="document-stack">
                                        <div className="document"></div>
                                        <div className="document"></div>
                                        <div className="document main">
                                            <FaPlus className="plus-icon" />
                                        </div>
                                    </div>
                                </div>
                                <p className="cta-text">Add leads from LinkedIn to this campaign</p>
                                <button
                                    className="primary-button-cta"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    Add leads
                                </button>
                            </div>
                        </>
                    )}

                    {activePage === 'lists' && (
                        <ListsPage
                            username={username}
                            initialSenders={[]}
                            initialReceivers={[]}
                            onSave={({ senders, receivers }) => {
                                console.log('Saved lists', { senders, receivers });
                            }}
                        />
                    )}

                    {activePage === 'campaigns' && (
                        <CampaignsPage
                            campaigns={campaigns}
                            onViewCampaign={handleViewCampaign}
                            onDeleteCampaign={handleDeleteCampaign}
                            onEditCampaign={handleEditCampaign}
                        />
                    )}

                    {activePage === 'listsManage' && <ListsManage username={username} />}
                </div>
            </main>

            {/* Campaign creation modal */}
            <CampaignModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCampaignCreate={handleCampaignCreate}
                username={username}
            />

            {/* Campaign edit modal */}
            <CampaignModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setCampaignBeingEdited(null);
                }}
                editCampaign={campaignBeingEdited}
                onCampaignUpdate={handleCampaignUpdate}
                username={username}
            />

            {/* Campaign detail modal */}
            <CampaignDetailModal
                isOpen={!!selectedCampaign}
                onClose={() => setSelectedCampaign(null)}
                campaign={selectedCampaign}
                onDelete={() => {
                    if (!selectedCampaign) return;
                    handleDeleteCampaign(selectedCampaign.id);
                    setSelectedCampaign(null);
                }}
            />
        </div>
    );
}
