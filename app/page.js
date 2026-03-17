'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase client with safety checks
// This prevents the "supabaseUrl is required" crash during Vercel's build step
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only initialize if keys exist; otherwise, provide a dummy to avoid build-time crashes
const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export default function LicensingDashboard() {
    const [transcript, setTranscript] = useState('');
    const [consultantName, setConsultantName] = useState('Jane Doe');
    const [alerts, setAlerts] = useState([]);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState(null);

    // 2. Fetch data from Supabase
    const fetchAlerts = async () => {
        if (!supabase) return; // Exit if supabase isn't initialized

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

    useEffect(() => {
        fetchAlerts();
    }, []);

    // 3. Send Transcript to Backend
    const handleRunAudit = async () => {
        if (!transcript.trim()) {
            alert('Please enter a mock transcript to analyze.');
            return;
        }

        setIsAuditing(true);
        setAuditResult(null);

        try {
            // DYNAMIC API URL: Uses Vercel's environment variable or falls back to localhost
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

            if (result.status === 'FLAGGED') {
                fetchAlerts();
            }
        } catch (error) {
            console.error('Audit failed:', error);
            alert('Failed to run audit. Ensure your backend is deployed and NEXT_PUBLIC_API_URL is set in Vercel.');
        } finally {
            setIsAuditing(false);
        }
    };

    // UI remains largely the same, but added a warning if Supabase is missing
    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px', fontFamily: 'sans-serif' }}>
            {!supabase && (
                <div style={{ background: '#ffeded', color: '#d00', padding: '10px', marginBottom: '20px', borderRadius: '5px' }}>
                    <strong>Setup Required:</strong> Please add your Supabase keys to Vercel Environment Variables.
                </div>
            )}

            <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                JSO Licensing Governance Agent
            </h1>

            <section style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
                <h2>Run Compliance Audit</h2>
                <p style={{ fontSize: '14px', color: '#666' }}>Pillar: <strong>Governance & Transparency</strong> [cite: 37, 214]</p>

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
                        placeholder="Paste transcript here..."
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        style={{ width: '100%', height: '120px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>

                <button
                    onClick={handleRunAudit}
                    disabled={isAuditing || !supabase}
                    style={{
                        backgroundColor: (isAuditing || !supabase) ? '#ccc' : '#0070f3',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (isAuditing || !supabase) ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isAuditing ? 'Analyzing Compliance...' : 'Run Compliance Audit'}
                </button>

                {auditResult && (
                    <div style={{ marginTop: '15px', padding: '10px', borderLeft: `4px solid ${auditResult.status === 'FLAGGED' ? '#d00' : '#00a82d'}`, background: '#fff' }}>
                        <strong>Audit Status:</strong> {auditResult.status} <br />
                        <strong>Governance Analysis:</strong> {auditResult.analysis}
                    </div>
                )}
            </section>

            <section style={{ marginTop: '40px' }}>
                <h2>Flagged Partners Grid</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>Requirement: <strong>Monitor license usage & quality</strong> [cite: 208, 209, 210]</p>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Consultant</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Reason Flagged</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alerts.length === 0 ? (
                            <tr><td colSpan="3" style={{ padding: '12px', textAlign: 'center' }}>No violations detected.</td></tr>
                        ) : (
                            alerts.map((alert) => (
                                <tr key={alert.id}>
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