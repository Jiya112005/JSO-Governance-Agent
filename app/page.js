'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase client
// These variables must be set in your .env.local file or Antigravity environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LicensingDashboard() {
    const [transcript, setTranscript] = useState('');
    const [consultantName, setConsultantName] = useState('Jane Doe'); // Mock name for testing
    const [alerts, setAlerts] = useState([]);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState(null);

    // 2. Fetch data from Supabase (The Data Grid Component Logic)
    const fetchAlerts = async () => {
        const { data, error } = await supabase
            .from('governance_alerts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching alerts:', error);
        } else {
            setAlerts(data || []);
        }
    };

    // Load alerts when the page first loads
    useEffect(() => {
        fetchAlerts();
    }, []);

    // 3. Send Transcript to Python Backend (The Audit Button Logic)
    const handleRunAudit = async () => {
        if (!transcript.trim()) {
            alert('Please enter a mock transcript to analyze.');
            return;
        }

        setIsAuditing(true);
        setAuditResult(null);

        try {
            // Points to your FastAPI backend URL
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const response = await fetch(`${apiUrl}/api/audit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consultant_name: consultantName,
                    transcript: transcript,
                }),
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const result = await response.json();
            setAuditResult(result);

            // If the AI flagged it, refresh the Supabase grid immediately to show the new row
            if (result.status === 'FLAGGED') {
                fetchAlerts();
            }
        } catch (error) {
            console.error('Audit failed:', error);
            alert('Failed to run audit. Check the console and your backend connection.');
        } finally {
            setIsAuditing(false);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px', fontFamily: 'sans-serif' }}>
            <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                Licensing Governance Dashboard
            </h1>

            {/* COMPONENT 1: Compliance Audit Input */}
            <section style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
                <h2>Run Compliance Audit</h2>

                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Consultant Name:</label>
                    <input
                        type="text"
                        value={consultantName}
                        onChange={(e) => setConsultantName(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>HR Consultation Transcript:</label>
                    <textarea
                        placeholder="Paste the mock consultation log here..."
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        style={{ width: '100%', height: '120px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>

                <button
                    onClick={handleRunAudit}
                    disabled={isAuditing}
                    style={{
                        backgroundColor: isAuditing ? '#ccc' : '#0070f3',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isAuditing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isAuditing ? 'Analyzing Transcript...' : 'Run Compliance Audit'}
                </button>

                {/* Display immediate result below the button */}
                {auditResult && (
                    <div style={{ marginTop: '15px', padding: '10px', borderLeft: `4px solid ${auditResult.status === 'FLAGGED' ? 'red' : 'green'}` }}>
                        <strong>Status:</strong> {auditResult.status} <br />
                        <strong>AI Analysis:</strong> {auditResult.analysis}
                    </div>
                )}
            </section>

            {/* COMPONENT 2: Supabase Data Grid */}
            <section style={{ marginTop: '40px' }}>
                <h2>Flagged Consultants Grid</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>Fetching directly from Supabase <code>governance_alerts</code> table.</p>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>ID</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Consultant Name</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Reason Flagged</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date Added</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alerts.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    No flagged alerts found.
                                </td>
                            </tr>
                        ) : (
                            alerts.map((alert) => (
                                <tr key={alert.id}>
                                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{alert.id}</td>
                                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>{alert.consultant_name}</td>
                                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{alert.reason}</td>
                                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                        {new Date(alert.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}