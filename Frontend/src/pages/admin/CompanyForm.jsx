import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CompanyForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchCompany = async () => {
        try {
          const response = await api.get(`/companies/${id}`);
          setFormData(response.data.company);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching company:', error);
          setError('Failed to load company data');
          setLoading(false);
        }
      };
      fetchCompany();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/companies/${id}`, formData);
        navigate('/admin/companies');
      } else {
        await api.post('/companies', formData);
        navigate('/admin/companies');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save company');
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading company...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{isEditing ? 'Edit Company' : 'Add Company'}</h1>
        <button onClick={() => navigate('/admin/companies')} className="btn btn-secondary">Cancel</button>
      </header>

      <form onSubmit={handleSubmit} className="form-container">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Company Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-control"
            required
            placeholder="Enter company name"
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-control"
            required
            placeholder="Enter company email"
          />
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="form-control"
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group">
          <label>Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="form-control"
            rows="3"
            placeholder="Enter company address"
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="form-control"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <button type="submit" className="btn btn-success" disabled={submitting}>
          {submitting ? 'Saving...' : (isEditing ? 'Update Company' : 'Create Company')}
        </button>
      </form>
    </div>
  );
};

export default CompanyForm;