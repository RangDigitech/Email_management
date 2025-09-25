// CampaignModal.jsx
import React, { useState, useEffect } from 'react';
import './CampaignModal.css';
import { FaTimes, FaEnvelope, FaUserFriends, FaArrowLeft, FaSignature } from 'react-icons/fa';

export default function CampaignModal({ isOpen, onClose, onCampaignCreate, editCampaign, onCampaignUpdate, username }) {
    // Step control
    const [currentStep, setCurrentStep] = useState(1);

    // Form state
    const [topic, setTopic] = useState('');
    const [subtopic, setSubtopic] = useState('');
    const [numMyEmails, setNumMyEmails] = useState(1);
    const [myEmails, setMyEmails] = useState(['']);
    const [numClientEmails, setNumClientEmails] = useState(1);
    const [clientEmails, setClientEmails] = useState(['']);
    const [campaignName, setCampaignName] = useState('');

    // Named lists
    const [senderLists, setSenderLists] = useState([]); // [{listName, emails}]
    const [receiverLists, setReceiverLists] = useState([]);
    const [selectedSenderList, setSelectedSenderList] = useState('');
    const [selectedReceiverList, setSelectedReceiverList] = useState('');
    const API_BASE = 'http://127.0.0.1:5000';

    // Reset when modal opens so each new create starts fresh
    useEffect(() => {
        if (isOpen) {
            if (editCampaign) {
                // Prefill fields for editing
                setTopic(editCampaign.topic || '');
                setSubtopic(editCampaign.subtopic || '');
                const senders = Array.isArray(editCampaign.senderEmails) ? editCampaign.senderEmails : [];
                const recipients = Array.isArray(editCampaign.recipientEmails) ? editCampaign.recipientEmails : [];
                setNumMyEmails(Math.max(1, senders.length || 1));
                setMyEmails(senders.length > 0 ? senders : ['']);
                setNumClientEmails(Math.max(1, recipients.length || 1));
                setClientEmails(recipients.length > 0 ? recipients : ['']);
                setCampaignName(editCampaign.name || '');
                setCurrentStep(1);
            } else {
                setCurrentStep(1);
                setTopic('');
                setSubtopic('');
                setNumMyEmails(1);
                setMyEmails(['']);
                setNumClientEmails(1);
                setClientEmails(['']);
                setCampaignName('');
            }
            // clear list selections on open
            setSelectedSenderList('');
            setSelectedReceiverList('');
        }
    }, [isOpen, editCampaign]);

    // Load user lists when opening
    useEffect(() => {
        const loadLists = async () => {
            if (!isOpen || !username) return;
            try {
                const res = await fetch(`${API_BASE}/api/lists?username=${encodeURIComponent(username)}`);
                if (!res.ok) return;
                const data = await res.json();
                setSenderLists(Array.isArray(data.senders) ? data.senders : []);
                setReceiverLists(Array.isArray(data.receivers) ? data.receivers : []);
            } catch {}
        };
        loadLists();
    }, [isOpen, username]);

    // Keep arrays in-sync with count fields
    useEffect(() => {
        setMyEmails(prev => {
            const desired = Number(numMyEmails);
            const next = Array(desired).fill('').map((v, i) => prev[i] ?? '');
            return next;
        });
    }, [numMyEmails]);

    useEffect(() => {
        setClientEmails(prev => {
            const desired = Number(numClientEmails);
            const next = Array(desired).fill('').map((v, i) => prev[i] ?? '');
            return next;
        });
    }, [numClientEmails]);

    const handleMyEmailChange = (index, value) => {
        const newEmails = [...myEmails];
        newEmails[index] = value;
        setMyEmails(newEmails);
    };
    const handleClientEmailChange = (index, value) => {
        const newEmails = [...clientEmails];
        newEmails[index] = value;
        setClientEmails(newEmails);
    };

    const loadFromSenderList = (name) => {
        setSelectedSenderList(name);
        const found = senderLists.find(l => l.listName === name);
        const emails = (found && Array.isArray(found.emails)) ? found.emails : [];
        setNumMyEmails(Math.max(1, emails.length || 1));
        setMyEmails(emails.length > 0 ? emails : ['']);
    };

    const loadFromReceiverList = (name) => {
        setSelectedReceiverList(name);
        const found = receiverLists.find(l => l.listName === name);
        const emails = (found && Array.isArray(found.emails)) ? found.emails : [];
        setNumClientEmails(Math.max(1, emails.length || 1));
        setClientEmails(emails.length > 0 ? emails : ['']);
    };

    const goToNextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
    const goToPrevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleFinalSubmit = (e) => {
        e.preventDefault();
        const base = {
            name: campaignName || `${topic} - ${subtopic}`.slice(0, 60),
            topic,
            subtopic,
            senderEmails: myEmails.filter(Boolean),
            recipientEmails: clientEmails.filter(Boolean),
        };

        if (editCampaign && typeof onCampaignUpdate === 'function') {
            const updatedCampaign = { ...editCampaign, ...base };
            onCampaignUpdate(updatedCampaign);
        } else if (typeof onCampaignCreate === 'function') {
            const newCampaign = { id: Date.now(), ...base };
            onCampaignCreate(newCampaign);
        }

        // Close modal
        onClose();

        // Reset state after closing animation (keeps UI predictable)
        setTimeout(() => {
            setCurrentStep(1);
            setTopic('');
            setSubtopic('');
            setNumMyEmails(1);
            setMyEmails(['']);
            setNumClientEmails(1);
            setClientEmails(['']);
            setCampaignName('');
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {currentStep > 1 && (
                    <button className="modal-back-button" onClick={goToPrevStep}>
                        <FaArrowLeft /> Back
                    </button>
                )}
                <button className="modal-close-button" onClick={onClose}><FaTimes /></button>

                <div className="modal-header">
                    <h2 className="modal-main-title">{editCampaign ? 'Edit Campaign' : 'Create a New Campaign'}</h2>
                    <div className="step-indicator">
                        <div className={`step ${currentStep === 1 ? 'active' : 'complete'}`}>
                            <div className="step-icon"><FaEnvelope /></div>
                            <span className="step-label">Details</span>
                        </div>
                        <div className="step-connector"></div>
                        <div className={`step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'complete' : ''}`}>
                            <div className="step-icon"><FaUserFriends /></div>
                            <span className="step-label">Recipients</span>
                        </div>
                        <div className="step-connector"></div>
                        <div className={`step ${currentStep === 3 ? 'active' : ''}`}>
                            <div className="step-icon"><FaSignature /></div>
                            <span className="step-label">Finalize</span>
                        </div>
                    </div>
                </div>

                {currentStep === 1 && (
                    <form onSubmit={(e) => { e.preventDefault(); goToNextStep(); }} className="modal-form">
                        {senderLists.length > 0 && (
                            <div className="form-group">
                                <label htmlFor="sender-list">Load from Senders List</label>
                                <select id="sender-list" value={selectedSenderList} onChange={e => loadFromSenderList(e.target.value)}>
                                    <option value="">-- Select a list --</option>
                                    {senderLists.map(l => (
                                        <option key={l.listName} value={l.listName}>{l.listName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="topic">Campaign Topic</label>
                            <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Q4 Product Launch" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="subtopic">Subtopic / Tagline</label>
                            <input type="text" id="subtopic" value={subtopic} onChange={e => setSubtopic(e.target.value)} placeholder="e.g., Announcing the new feature" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="num-my-emails">How many of your email accounts will send?</label>
                            <select id="num-my-emails" value={numMyEmails} onChange={e => setNumMyEmails(Number(e.target.value))}>
                                {[...Array(10).keys()].map(n => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
                            </select>
                        </div>
                        <div className="dynamic-fields-container scrollable">
                            {myEmails.map((email, index) => (
                                <div className="input-with-icon" key={index}>
                                    <FaEnvelope className="input-icon" />
                                    <input type="email" placeholder={`Your Sending Email #${index + 1}`} value={email} onChange={e => handleMyEmailChange(index, e.target.value)} required />
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="modal-primary-button">Next: Add Recipients</button>
                    </form>
                )}

                {currentStep === 2 && (
                    <form onSubmit={(e) => { e.preventDefault(); goToNextStep(); }} className="modal-form">
                        {receiverLists.length > 0 && (
                            <div className="form-group">
                                <label htmlFor="receiver-list">Load from Receiver List</label>
                                <select id="receiver-list" value={selectedReceiverList} onChange={e => loadFromReceiverList(e.target.value)}>
                                    <option value="">-- Select a list --</option>
                                    {receiverLists.map(l => (
                                        <option key={l.listName} value={l.listName}>{l.listName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="num-client-emails">How many clients are you emailing?</label>
                            <select id="num-client-emails" value={numClientEmails} onChange={e => setNumClientEmails(Number(e.target.value))}>
                                {[...Array(20).keys()].map(n => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
                            </select>
                        </div>
                        <div className="dynamic-fields-container scrollable">
                            {clientEmails.map((email, index) => (
                                <div className="input-with-icon" key={index}>
                                    <FaUserFriends className="input-icon" />
                                    <input type="email" placeholder={`Client Email #${index + 1}`} value={email} onChange={e => handleClientEmailChange(index, e.target.value)} required />
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="modal-primary-button">Next: Finalize</button>
                    </form>
                )}

                {currentStep === 3 && (
                    <form onSubmit={handleFinalSubmit} className="modal-form">
                        <div className="form-group">
                            <label htmlFor="campaignName">Name Your Campaign</label>
                            <p className="form-hint">This name is for your reference on the dashboard.</p>
                            <div className="input-with-icon">
                                <FaSignature className="input-icon" />
                                <input type="text" id="campaignName" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Q4 Outreach to New Leads" required />
                            </div>
                        </div>
                        <button type="submit" className="modal-primary-button">{editCampaign ? 'Save Changes' : 'Finish & Save Campaign'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}
