import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationApi } from '../services/api';

export default function QuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadQuotations(); }, []);

  async function loadQuotations() {
    try {
      const { data } = await quotationApi.list();
      setQuotations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf(id, number) {
    try {
      const { data } = await quotationApi.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Preventivo_${number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Errore nella generazione del PDF');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo preventivo?')) return;
    try {
      await quotationApi.delete(id);
      setQuotations(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      alert('Errore nella eliminazione');
    }
  }

  if (loading) return <div className="card"><p>Caricamento...</p></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Preventivi</h1>
          <p>{quotations.length} preventiv{quotations.length === 1 ? 'o' : 'i'} totali</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new')}>+ Nuovo Preventivo</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {quotations.length === 0 ? (
          <p style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            Nessun preventivo. Clicca su "+ Nuovo Preventivo" per iniziare.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N. Preventivo</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Destinazione</th>
                    <th>Tipo</th>
                    <th>Modello</th>
                    <th>Stato</th>
                    <th style={{ width: '140px' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => (
                    <tr key={q.id}>
                      <td><strong>{q.quotation_number}</strong></td>
                      <td>{new Date(q.created_at).toLocaleDateString('it-IT')}</td>
                      <td><strong>{q.client_name || '-'}</strong></td>
                      <td>{q.destination_name}</td>
                      <td>{q.client_type === 'shipyard' ? 'Shipyard' : 'Ship Owner'}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {[q.hamann_model_name, q.dvz_model_name].filter(Boolean).join(' + ') || '-'}
                      </td>
                      <td>
                        <span className={`status-badge status-${q.status}`}>{q.status.toUpperCase()}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/edit/${q.id}`)}>Modifica</button>
                          <button className="btn btn-sm btn-primary" onClick={() => handleDownloadPdf(q.id, q.quotation_number)}>PDF</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q.id)}>Elimina</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-only">
              {quotations.map(q => (
                <div key={q.id} className="mobile-quotation-card">
                  <div className="mobile-quotation-header">
                    <div>
                      <div className="mobile-quotation-number">{q.quotation_number}</div>
                      <div className="mobile-quotation-date">{new Date(q.created_at).toLocaleDateString('it-IT')}</div>
                    </div>
                    <span className={`status-badge status-${q.status}`}>{q.status.toUpperCase()}</span>
                  </div>
                  <div className="mobile-quotation-details">
                    <div><span className="mq-label">Cliente</span><br /><span className="mq-value">{q.client_name || '-'}</span></div>
                    <div><span className="mq-label">Destinazione</span><br /><span className="mq-value">{q.destination_name}</span></div>
                    <div><span className="mq-label">Tipo</span><br /><span className="mq-value">{q.client_type === 'shipyard' ? 'Shipyard' : 'Ship Owner'}</span></div>
                    <div><span className="mq-label">Modello</span><br /><span className="mq-value">{[q.hamann_model_name, q.dvz_model_name].filter(Boolean).join(' + ') || '-'}</span></div>
                  </div>
                  <div className="mobile-quotation-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/edit/${q.id}`)}>Modifica</button>
                    <button className="btn btn-sm btn-primary" onClick={() => handleDownloadPdf(q.id, q.quotation_number)}>PDF</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q.id)}>Elimina</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
