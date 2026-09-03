import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import './App.css';

/**
 * Ω∞v Oceanicos Web Dashboard
 * Visualizes the verification loop in real-time
 * Integrates with VerificationRuntime API endpoints
 */
export function App(): JSX.Element {
  const [observation, setObservation] = useState<string>('');
  const [claim, setClaim] = useState<string>('Service X is healthy');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]);
  const [integrity, setIntegrity] = useState<any>(null);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);

  // Load metrics on mount and periodically
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        const data = (await response.json()) as { data: object };
        setMetrics(data.data);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Load observations history
  useEffect(() => {
    const loadObservations = async () => {
      try {
        const response = await fetch('/api/query/observations?limit=10&offset=0');
        const data = (await response.json()) as { data: { events: any[] } };
        setObservations(data.data.events);
      } catch (error) {
        console.error('Failed to load observations:', error);
      }
    };

    loadObservations();
  }, [results]); // Reload when new results come in

  // Check integrity
  useEffect(() => {
    const checkIntegrity = async () => {
      try {
        const response = await fetch('/api/integrity');
        const data = (await response.json()) as { data: object };
        setIntegrity(data.data);
      } catch (error) {
        console.error('Failed to check integrity:', error);
      }
    };

    checkIntegrity();
    const interval = setInterval(checkIntegrity, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const executeVerificationLoop = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/complete-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          category: 'health-check',
          source: {
            system: 'web-dashboard',
            version: '0.1.0',
            environment: 'production',
          },
          observedBy: 'user',
          metadata: {
            responseTime: Math.random() * 200,
            statusCode: 200,
          },
          confidence: 0.95,
          confidenceReason: 'Manual verification from dashboard',
        }),
      });

      const data = (await response.json()) as { data: object };
      setResults(data.data);
      setObservation('Verification complete ✓');
    } catch (error) {
      setObservation(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTrace = async (obsId: string) => {
    try {
      const response = await fetch(`/api/query/trace/${obsId}`);
      const data = (await response.json()) as { data: object };
      setSelectedTrace(data.data);
    } catch (error) {
      console.error('Failed to load trace:', error);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Ω∞v Oceanicos</h1>
        <p>Verification-First Full-Stack Ecosystem</p>
      </header>

      <main className="main">
        {/* Metrics Dashboard */}
        {metrics && (
          <section className="metrics-section">
            <h2>System Metrics</h2>
            <div className="metrics-grid">
              <div className="metric">
                <div className="metric-value">{metrics.totalObservations}</div>
                <div className="metric-label">Observations</div>
              </div>
              <div className="metric">
                <div className="metric-value">{metrics.totalVerifications}</div>
                <div className="metric-label">Verifications</div>
              </div>
              <div className="metric">
                <div className="metric-value">{(metrics.successRate * 100).toFixed(0)}%</div>
                <div className="metric-label">Success Rate</div>
              </div>
              <div className="metric">
                <div className="metric-value">{(metrics.systemConfidence * 100).toFixed(0)}%</div>
                <div className="metric-label">System Confidence</div>
              </div>
              <div className="metric">
                <div className="metric-value">{metrics.totalAttestations}</div>
                <div className="metric-label">Attestations</div>
              </div>
              {integrity && (
                <div className="metric">
                  <div className="metric-value">{integrity.valid ? '✓ Valid' : '✗ Broken'}</div>
                  <div className="metric-label">Event Log Integrity</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Verification Executor */}
        <section className="input-section">
          <h2>Execute Verification Loop</h2>
          <div className="form-group">
            <label htmlFor="claim">Claim:</label>
            <input
              id="claim"
              type="text"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="Enter a claim to verify"
            />
          </div>
          <button onClick={executeVerificationLoop} disabled={loading} className="btn-primary">
            {loading ? 'Verifying...' : 'Run Verification'}
          </button>
        </section>

        {/* Verification Results */}
        {results && (
          <section className="results-section">
            <h2>Verification Results</h2>

            <div className="step observation">
              <h3>✓ Observation</h3>
              <div className="details">
                <p>
                  <strong>ID:</strong> {results.observation.id}
                </p>
                <p>
                  <strong>Claim:</strong> {results.observation.claim.statement}
                </p>
                <p>
                  <strong>Confidence:</strong> {(results.observation.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="step verification">
              <h3>✓ Verification</h3>
              <div className="details">
                <p>
                  <strong>Status:</strong>{' '}
                  {results.verification.summary.passed ? '✓ PASSED' : '✗ FAILED'}
                </p>
                <p>
                  <strong>Rules Applied:</strong> {results.verification.summary.rulesApplied}
                </p>
                <p>
                  <strong>Rules Passed:</strong> {results.verification.summary.rulesPassed}
                </p>
                <div className="evidence">
                  <h4>Evidence Path:</h4>
                  <ul>
                    {results.verification.evidencePath.map((step: any, idx: number) => (
                      <li key={idx}>
                        {step.passed ? '✓' : '✗'} {step.rule}: {step.reasoning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="step attestation">
              <h3>✓ Attestation</h3>
              <div className="details">
                <p>
                  <strong>ID:</strong> {results.attestation.id}
                </p>
                <p>
                  <strong>Verified:</strong> {results.attestation.verified ? '✓ Yes' : '✗ No'}
                </p>
                <p>
                  <strong>Signed At:</strong>{' '}
                  {new Date(results.attestation.attestedAt).toLocaleString()}
                </p>
                <p>
                  <strong>Signature:</strong>{' '}
                  <code>{results.attestation.signature.substring(0, 32)}...</code>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Event History */}
        {observations.length > 0 && (
          <section className="history-section">
            <h2>Event History</h2>
            <div className="events-list">
              {observations.map((event, idx) => (
                <div key={idx} className="event-item">
                  <div className="event-header">
                    <span className="event-type">{event.type}</span>
                    <span className="event-time">
                      {new Date(event.recordedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.type === 'OBSERVATION' && (
                    <p className="event-data">
                      Claim: {(event.data as any).claim?.statement || 'N/A'}
                    </p>
                  )}
                  {event.type === 'VERIFICATION' && (
                    <p className="event-data">
                      Status: {(event.data as any).summary?.passed ? '✓ Passed' : '✗ Failed'}
                    </p>
                  )}
                  {event.type === 'ATTESTATION' && (
                    <p className="event-data">
                      Verified: {(event.data as any).verified ? '✓ Yes' : '✗ No'}
                    </p>
                  )}
                  <button
                    className="btn-trace"
                    onClick={() =>
                      loadTrace((event.data as any).observationId || (event.data as any).id)
                    }
                  >
                    View Trace
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trace Details */}
        {selectedTrace && (
          <section className="trace-section">
            <h2>Event Trace</h2>
            <button className="btn-close" onClick={() => setSelectedTrace(null)}>
              ✕ Close
            </button>

            {selectedTrace.observation && (
              <div className="trace-event">
                <h4>Observation</h4>
                <p>ID: {(selectedTrace.observation.data as any).id}</p>
                <p>Claim: {(selectedTrace.observation.data as any).claim?.statement}</p>
              </div>
            )}

            {selectedTrace.verifications?.map((ver: any, idx: number) => (
              <div key={idx} className="trace-event">
                <h4>Verification {idx + 1}</h4>
                <p>Status: {(ver.data as any).summary?.passed ? '✓ Passed' : '✗ Failed'}</p>
              </div>
            ))}

            {selectedTrace.attestations?.map((att: any, idx: number) => (
              <div key={idx} className="trace-event">
                <h4>Attestation {idx + 1}</h4>
                <p>Verified: {(att.data as any).verified ? '✓ Yes' : '✗ No'}</p>
              </div>
            ))}
          </section>
        )}

        {observation && (
          <section className="status-section">
            <p className="status">{observation}</p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Attest, don't assert. Evidence before trust. Verification before evolution.</p>
      </footer>
    </div>
  );
}

export default App;
