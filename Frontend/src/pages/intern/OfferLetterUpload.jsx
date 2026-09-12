import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOfferLetter, uploadOfferLetter, deleteOfferLetter } from '../../services/api';

const OfferLetterUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offerLetter, setOfferLetter] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadOfferLetter();
  }, [id]);

  const loadOfferLetter = async () => {
    try {
      const response = await getOfferLetter(id);
      if (response.data.success) {
        setOfferLetter(response.data.offer_letter);
        setError('');
        setSuccess('');
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        setError('Failed to load offer letter');
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
        setFile(null);
        return;
      }

      // Validate file size (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit.');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await uploadOfferLetter(id, file);
      if (response.data.success) {
        setOfferLetter(response.data.offer_letter);
        setSuccess('Offer letter uploaded successfully!');
        setFile(null);
        // Reset file input
        e.target.reset();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload offer letter');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this offer letter?')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await deleteOfferLetter(id);
      if (response.data.success) {
        setOfferLetter(null);
        setSuccess('Offer letter deleted successfully!');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete offer letter');
    } finally {
      setDeleting(false);
    }
  };

  const handleView = () => {
    if (offerLetter?.url) {
      window.open(offerLetter.url, '_blank');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Offer Letter</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
      </header>

      <div className="offer-letter-container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {offerLetter?.url ? (
          <div className="offer-letter-card">
            <div className="offer-letter-header">
              <h3>📄 Offer Letter</h3>
              <div className="offer-letter-info">
                <span className="file-name">{offerLetter.original_name}</span>
                <span className="upload-date">Uploaded: {formatDate(offerLetter.uploaded_at)}</span>
              </div>
            </div>
            <div className="offer-letter-actions">
              <button onClick={handleView} className="btn btn-primary">View</button>
              <button onClick={handleDelete} className="btn btn-danger" disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="upload-section">
            <h3>Upload Offer Letter</h3>
            <p className="upload-hint">
              Upload your internship offer letter in PDF, DOC, or DOCX format.
              Maximum file size: 5MB.
            </p>
            <form onSubmit={handleUpload} className="upload-form">
              <div className="form-group">
                <label>Select File</label>
                <input
                  type="file"
                  name="offer_letter"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="form-control file-input"
                />
                {file && <p className="selected-file">Selected: {file.name}</p>}
              </div>
              <button type="submit" className="btn btn-success" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Offer Letter'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferLetterUpload;