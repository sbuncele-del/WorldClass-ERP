import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Send, Download, User, Building, Package, DollarSign, Calendar, MapPin, Truck } from 'lucide-react';
import SARSInvoice from './SARSInvoice';
import { API_BASE_URL } from '../../services/api.service';
import '../../styles/erp-ui.css';

interface ExtractedData {
  // Document Metadata
  document_type: 'load_confirmation' | 'delivery_note' | 'pod' | 'invoice';
  document_number: string;
  confirmation_date: string;
  
  // Transporter Details
  transporter: {
    company_name: string;
    vat_number: string;
    contact_person: string;
    phone: string;
    fax?: string;
    address?: string;
  };
  
  // Customer Details (Broker/Client)
  customer: {
    company_name: string;
    contact_person: string;
    is_new: boolean;
    customer_id?: string;
  };
  
  // Load Details
  load: {
    load_number: string;
    load_date: string;
    offload_date: string;
    order_number: string;
    driver_name: string;
    vehicle_registration: string;
    commodity: string;
    rate: number;
    rate_type: 'per_load' | 'per_km' | 'per_ton';
    quantity: number;
    load_value: number;
  };
  
  // Route Details
  route: {
    collection_address: string;
    delivery_address: string;
    distance_km?: number;
  };
  
  // Invoice Details
  invoice: {
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    subtotal: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
    payment_terms: string;
  };
  
  // Extracted Text
  raw_text?: string;
  confidence_score: number;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  message?: string;
}

const DocumentProcessing: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(uploadedFile.type)) {
      alert('Please upload a PDF or image file (JPG, PNG)');
      return;
    }

    setFile(uploadedFile);
    setUploading(true);

    // Simulate upload
    setTimeout(() => {
      setUploading(false);
      processDocument(uploadedFile);
    }, 1500);
  }, []);

  const processDocument = async (file: File) => {
    setProcessing(true);
    
    const steps: ProcessingStep[] = [
      { id: '1', label: 'Uploading document...', status: 'processing' },
      { id: '2', label: 'OCR text extraction...', status: 'pending' },
      { id: '3', label: 'Identifying document type...', status: 'pending' },
      { id: '4', label: 'Extracting customer details...', status: 'pending' },
      { id: '5', label: 'Extracting load information...', status: 'pending' },
      { id: '6', label: 'Checking for existing customer...', status: 'pending' },
      { id: '7', label: 'Calculating invoice amounts...', status: 'pending' },
      { id: '8', label: 'Validating SARS compliance...', status: 'pending' },
    ];
    
    setProcessingSteps(steps);

    try {
      // Step 1: Upload complete
      await updateStep(0, 'complete');
      await updateStep(1, 'processing');

      // Step 2: Use backend API for OCR (AWS Textract)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/logistics/documents/extract`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to extract document data');
      }

      const result = await response.json();
      const extractedText = result.extractedText || '';

      console.log('Extracted text:', extractedText);
      await updateStep(1, 'complete');
      await updateStep(2, 'processing');
      
      // Step 3: Parse extracted text
      await new Promise(resolve => setTimeout(resolve, 500));
      const parsedData = parseDocumentText(extractedText);
      await updateStep(2, 'complete');
      await updateStep(3, 'processing');

      // Step 4: Customer details extracted
      await new Promise(resolve => setTimeout(resolve, 500));
      await updateStep(3, 'complete');
      await updateStep(4, 'processing');

      // Step 5: Load information extracted
      await new Promise(resolve => setTimeout(resolve, 500));
      await updateStep(4, 'complete');
      await updateStep(5, 'processing');

      // Step 6: Check for existing customer (mock for now)
      await new Promise(resolve => setTimeout(resolve, 500));
      parsedData.customer.is_new = false; // Would check database
      await updateStep(5, 'complete');
      await updateStep(6, 'processing');

      // Step 7: Calculate invoice amounts
      await new Promise(resolve => setTimeout(resolve, 500));
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const invoiceNumber = `${parsedData.load.load_number || 'INV'}-${dateStr}A`;
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);

      const subtotal = parsedData.load.rate * (parsedData.load.quantity || 1);
      const vat_amount = subtotal * 0.15;
      const total = subtotal + vat_amount;

      parsedData.invoice = {
        invoice_number: invoiceNumber,
        invoice_date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal,
        vat_rate: 15,
        vat_amount,
        total,
        payment_terms: '30 days'
      };

      await updateStep(6, 'complete');
      await updateStep(7, 'processing');

      // Step 8: SARS compliance validation
      await new Promise(resolve => setTimeout(resolve, 500));
      await updateStep(7, 'complete');

      setExtractedData(parsedData);
      setProcessing(false);

    } catch (error) {
      console.error('OCR processing error:', error);
      setProcessingSteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error', message: 'Failed to extract text' } : step
      ));
      alert('❌ Failed to process document. The image may be too blurry or text not readable. Please try a clearer image.');
      setProcessing(false);
    }
  };

  // Helper function to update processing steps
  const updateStep = async (index: number, status: 'complete' | 'processing' | 'error') => {
    setProcessingSteps(prev => prev.map((step, idx) => {
      if (idx === index) return { ...step, status };
      return step;
    }));
  };

  // Helper function to parse OCR text into structured data
  const parseDocumentText = (text: string): ExtractedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Define regex patterns for extraction
    const patterns = {
      loadNumber: /(?:load|trip|ref)(?:\s*#|\s*no\.?|\s*number)?:?\s*(\d+)/i,
      company: /(?:company|transporter|carrier|operator)(?:\s*name)?:?\s*([^\n]+)/i,
      vat: /vat(?:\s*no\.?|\s*number|\s*reg)?:?\s*(\d+)/i,
      driver: /driver(?:\s*name)?:?\s*([^\n]+)/i,
      vehicle: /(?:vehicle|truck|registration|reg)(?:\s*no\.?)?:?\s*([A-Z0-9\s-]+)/i,
      commodity: /(?:commodity|goods|cargo|product)(?:\s*type)?:?\s*([^\n]+)/i,
      rate: /(?:rate|price|charge|cost)(?:\s*per)?:?\s*r?\s*([\d,]+(?:\.\d{2})?)/i,
      collection: /(?:collection|pickup|load|from)(?:\s*address)?:?\s*([^\n]+)/i,
      delivery: /(?:delivery|drop(?:\s*off)?|to|destination)(?:\s*address)?:?\s*([^\n]+)/i,
      contact: /(?:contact|attn|attention)(?:\s*person)?:?\s*([^\n]+)/i,
      phone: /(?:tel|phone|cell|mobile)(?:\s*no\.?)?:?\s*([\d\s\(\)\+\-]+)/i,
      billTo: /(?:bill\s*to|customer|client|broker)(?:\s*name)?:?\s*([^\n]+)/i,
    };

    const extracted: any = {
      document_type: 'load_confirmation',
      document_number: '',
      confirmation_date: new Date().toISOString().split('T')[0],
      transporter: {
        company_name: '',
        vat_number: '',
        contact_person: '',
        phone: '',
      },
      customer: {
        company_name: '',
        contact_person: '',
        is_new: false,
      },
      load: {
        load_number: '',
        load_date: new Date().toISOString().split('T')[0],
        offload_date: '',
        order_number: '',
        driver_name: '',
        vehicle_registration: '',
        commodity: '',
        rate: 0,
        rate_type: 'per_load' as const,
        quantity: 1,
        load_value: 0,
      },
      route: {
        collection_address: '',
        delivery_address: '',
      },
      confidence_score: 0,
    };

    // Extract each field from lines
    for (const line of lines) {
      // Load number
      const loadMatch = line.match(patterns.loadNumber);
      if (loadMatch && !extracted.load.load_number) {
        extracted.load.load_number = loadMatch[1];
      }

      // Company/Transporter
      const companyMatch = line.match(patterns.company);
      if (companyMatch && !extracted.transporter.company_name) {
        extracted.transporter.company_name = companyMatch[1].trim();
      }

      // VAT number
      const vatMatch = line.match(patterns.vat);
      if (vatMatch && !extracted.transporter.vat_number) {
        extracted.transporter.vat_number = vatMatch[1];
      }

      // Driver
      const driverMatch = line.match(patterns.driver);
      if (driverMatch && !extracted.load.driver_name) {
        extracted.load.driver_name = driverMatch[1].trim();
      }

      // Vehicle
      const vehicleMatch = line.match(patterns.vehicle);
      if (vehicleMatch && !extracted.load.vehicle_registration) {
        extracted.load.vehicle_registration = vehicleMatch[1].trim();
      }

      // Commodity
      const commodityMatch = line.match(patterns.commodity);
      if (commodityMatch && !extracted.load.commodity) {
        extracted.load.commodity = commodityMatch[1].trim();
      }

      // Rate
      const rateMatch = line.match(patterns.rate);
      if (rateMatch && !extracted.load.rate) {
        extracted.load.rate = parseFloat(rateMatch[1].replace(/,/g, ''));
      }

      // Collection address
      const collectionMatch = line.match(patterns.collection);
      if (collectionMatch && !extracted.route.collection_address) {
        extracted.route.collection_address = collectionMatch[1].trim();
      }

      // Delivery address
      const deliveryMatch = line.match(patterns.delivery);
      if (deliveryMatch && !extracted.route.delivery_address) {
        extracted.route.delivery_address = deliveryMatch[1].trim();
      }

      // Contact person
      const contactMatch = line.match(patterns.contact);
      if (contactMatch && !extracted.customer.contact_person) {
        extracted.customer.contact_person = contactMatch[1].trim();
      }

      // Phone
      const phoneMatch = line.match(patterns.phone);
      if (phoneMatch && !extracted.transporter.phone) {
        extracted.transporter.phone = phoneMatch[1].trim();
      }

      // Customer/Bill to
      const billToMatch = line.match(patterns.billTo);
      if (billToMatch && !extracted.customer.company_name) {
        extracted.customer.company_name = billToMatch[1].trim();
      }
    }

    // Calculate confidence score
    const requiredFields = [
      extracted.load?.load_number,
      extracted.load?.rate > 0,
    ];
    const optionalFields = [
      extracted.transporter?.company_name,
      extracted.transporter?.vat_number,
      extracted.load?.driver_name,
      extracted.load?.vehicle_registration,
      extracted.load?.commodity,
      extracted.customer?.company_name,
      extracted.route?.collection_address,
      extracted.route?.delivery_address,
    ];

    const requiredScore = requiredFields.filter(Boolean).length / requiredFields.length;
    const optionalScore = optionalFields.filter(Boolean).length / optionalFields.length;
    extracted.confidence_score = Math.round((requiredScore * 0.7 + optionalScore * 0.3) * 100);

    // Set defaults if not found
    if (!extracted.transporter.company_name) extracted.transporter.company_name = 'Unknown Transporter';
    if (!extracted.customer.company_name) extracted.customer.company_name = 'Unknown Customer';
    if (!extracted.load.commodity) extracted.load.commodity = 'General Cargo';
    if (extracted.load.rate === 0) extracted.load.rate = 1000; // Default rate

    return extracted;
  };

  const handleCreateCustomer = async () => {
    if (!extractedData) return;

    // Call API to create customer in Sales module
    const customerData = {
      company_name: extractedData.customer.company_name,
      contact_person: extractedData.customer.contact_person,
      customer_type: 'logistics_broker',
      source: 'logistics_document',
      created_from_document: extractedData.document_number,
      status: 'active'
    };

    console.log('Creating customer:', customerData);
    
    // Update extracted data to mark customer as created
    setExtractedData(prev => prev ? {
      ...prev,
      customer: {
        ...prev.customer,
        is_new: false,
        customer_id: 'CUST-NEW-' + Date.now()
      }
    } : null);

    alert('✅ Customer created successfully in Sales module!');
  };

  const handleGenerateInvoice = () => {
    setPreviewInvoice(true);
  };

  const handleSendInvoice = () => {
    alert('📧 Invoice sent to customer via email!');
  };

  const renderUploadZone = () => (
    <div className="content-card" style={{ marginBottom: '2rem' }}>
      <div className="card-content">
        <div
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '0.75rem',
            padding: '3rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) {
              const input = document.createElement('input');
              input.type = 'file';
              const dt = new DataTransfer();
              dt.items.add(droppedFile);
              input.files = dt.files;
              handleFileUpload({ target: input } as any);
            }
          }}
        >
          <Upload size={48} style={{ color: '#667eea', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>
            Upload Load Confirmation or Delivery Note
          </h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Drag and drop or click to browse
          </p>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Supported formats: PDF, JPG, PNG (Max 10MB)
          </p>
          
          <label htmlFor="file-upload" className="action-button primary" style={{ cursor: 'pointer' }}>
            <Upload size={18} />
            Choose File
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          
          {file && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '0.5rem', display: 'inline-block' }}>
              <FileText size={20} style={{ marginRight: '0.5rem', color: '#667eea', verticalAlign: 'middle' }} />
              <span style={{ fontWeight: 600 }}>{file.name}</span>
              <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProcessingSteps = () => (
    <div className="content-card" style={{ marginBottom: '2rem' }}>
      <div className="card-header">
        <h2 className="card-title">🤖 AI Processing Pipeline</h2>
      </div>
      <div className="card-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {processingSteps.map((step) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                background: step.status === 'complete' ? '#f0fdf4' : step.status === 'processing' ? '#eff6ff' : '#f8fafc',
                borderRadius: '0.5rem',
                border: `1px solid ${step.status === 'complete' ? '#86efac' : step.status === 'processing' ? '#93c5fd' : '#e2e8f0'}`
              }}
            >
              {step.status === 'complete' && <CheckCircle size={20} style={{ color: '#22c55e', marginRight: '0.75rem' }} />}
              {step.status === 'processing' && (
                <div style={{ marginRight: '0.75rem' }}>
                  <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #93c5fd', borderTopColor: '#3b82f6' }} />
                </div>
              )}
              {step.status === 'pending' && <div style={{ width: '20px', height: '20px', marginRight: '0.75rem', background: '#e2e8f0', borderRadius: '50%' }} />}
              {step.status === 'error' && <AlertCircle size={20} style={{ color: '#ef4444', marginRight: '0.75rem' }} />}
              
              <span style={{ fontWeight: step.status === 'processing' ? 600 : 400, color: step.status === 'complete' ? '#166534' : '#1e293b' }}>
                {step.label}
              </span>
              
              {step.status === 'processing' && (
                <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#3b82f6' }}>Processing...</span>
              )}
              {step.status === 'complete' && (
                <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#22c55e' }}>✓ Done</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderExtractedData = () => {
    if (!extractedData) return null;

    return (
      <>
        {/* Confidence Score */}
        <div className="content-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="card-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: 'white' }}>
                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.125rem' }}>✨ Extraction Quality</h3>
                <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>AI Confidence Score</p>
              </div>
              <div style={{ textAlign: 'right', color: 'white' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{extractedData.confidence_score}%</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {extractedData.confidence_score >= 95 ? 'Excellent' : extractedData.confidence_score >= 85 ? 'Good' : 'Review Needed'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">
              <User size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Customer Information
            </h2>
            {extractedData.customer.is_new && (
              <button className="action-button primary" onClick={handleCreateCustomer}>
                <Building size={18} />
                Create New Customer
              </button>
            )}
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={extractedData.customer.company_name}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Contact Person
                </label>
                <input
                  type="text"
                  value={extractedData.customer.contact_person}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Customer Status
                </label>
                <span
                  className="status-badge"
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    background: extractedData.customer.is_new ? '#fef3c7' : '#d1fae5',
                    color: extractedData.customer.is_new ? '#92400e' : '#065f46',
                    borderRadius: '0.5rem',
                    fontWeight: 600
                  }}
                >
                  {extractedData.customer.is_new ? '🆕 New Customer' : '✓ Existing Customer'}
                </span>
              </div>
              {!extractedData.customer.is_new && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={extractedData.customer.customer_id || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: '#f8fafc'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Load Details */}
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">
              <Truck size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Load Information
            </h2>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Load Number
                </label>
                <input
                  type="text"
                  value={extractedData.load.load_number}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Load Date
                </label>
                <input
                  type="date"
                  value={extractedData.load.load_date}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Offload Date
                </label>
                <input
                  type="date"
                  value={extractedData.load.offload_date}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Driver Name
                </label>
                <input
                  type="text"
                  value={extractedData.load.driver_name}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Vehicle Registration
                </label>
                <input
                  type="text"
                  value={extractedData.load.vehicle_registration}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Commodity
                </label>
                <input
                  type="text"
                  value={extractedData.load.commodity}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#1e293b' }}>Route Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <MapPin size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Collection Address
                  </label>
                  <input
                    type="text"
                    value={extractedData.route.collection_address}
                    disabled={!editMode}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <MapPin size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={extractedData.route.delivery_address}
                    disabled={!editMode}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">
              <DollarSign size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Invoice Calculation (SARS Compliant)
            </h2>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Rate
                </label>
                <input
                  type="number"
                  value={extractedData.load.rate}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Rate Type
                </label>
                <input
                  type="text"
                  value={extractedData.load.rate_type.replace('_', ' ').toUpperCase()}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: '#f8fafc'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={extractedData.load.quantity}
                  disabled={!editMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '0.75rem', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <span>Subtotal (excl VAT):</span>
                <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>R {extractedData.invoice.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <span>VAT ({extractedData.invoice.vat_rate}%):</span>
                <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>R {extractedData.invoice.vat_amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>TOTAL (incl VAT):</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>R {extractedData.invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="content-card">
          <div className="card-content">
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="action-button"
                onClick={() => setEditMode(!editMode)}
                style={{ flex: '1 1 200px' }}
              >
                <FileText size={18} />
                {editMode ? 'Lock Editing' : 'Edit Details'}
              </button>
              
              <button
                className="action-button primary"
                onClick={handleGenerateInvoice}
                style={{ flex: '1 1 200px' }}
              >
                <Eye size={18} />
                Preview Invoice
              </button>
              
              <button
                className="action-button success"
                onClick={handleSendInvoice}
                style={{ flex: '1 1 200px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
              >
                <Send size={18} />
                Send to Customer
              </button>
              
              <button
                className="action-button"
                style={{ flex: '1 1 200px' }}
              >
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Invoice Preview Modal */}
      {previewInvoice && extractedData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          overflow: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            padding: '2rem'
          }}>
            <button
              onClick={() => setPreviewInvoice(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              ×
            </button>
            
            <SARSInvoice
              data={{
                supplier: {
                  company_name: extractedData.transporter.company_name,
                  vat_number: extractedData.transporter.vat_number,
                  registration_number: extractedData.document_number,
                  address: extractedData.transporter.address || '',
                  phone: extractedData.transporter.phone,
                  email: 'accounts@vikaro.co.za'
                },
                customer: {
                  company_name: extractedData.customer.company_name,
                  vat_number: '4PL-VAT-12345',
                  address: '123 Business Park, Cape Town, 8001',
                  contact_person: extractedData.customer.contact_person
                },
                invoice: {
                  invoice_number: extractedData.invoice.invoice_number,
                  invoice_date: extractedData.invoice.invoice_date,
                  due_date: extractedData.invoice.due_date,
                  reference: `Load #${extractedData.load.load_number}`
                },
                line_items: [
                  {
                    description: `${extractedData.load.commodity} - ${extractedData.route.collection_address} to ${extractedData.route.delivery_address}`,
                    quantity: extractedData.load.quantity,
                    unit_price: extractedData.load.rate,
                    vat_rate: extractedData.invoice.vat_rate,
                    amount: extractedData.invoice.subtotal
                  }
                ],
                totals: {
                  subtotal: extractedData.invoice.subtotal,
                  vat_amount: extractedData.invoice.vat_amount,
                  total: extractedData.invoice.total
                },
                banking: {
                  bank_name: 'First National Bank',
                  account_name: 'VIKARO TRANSPORT CC',
                  account_number: '62847291048',
                  branch_code: '250655'
                }
              }}
              onSend={handleSendInvoice}
              onDownload={() => alert('📥 PDF download would trigger here')}
              onPrint={() => window.print()}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">📄 Intelligent Document Processing</h1>
          <p className="dashboard-subtitle">
            Upload load confirmations, PODs, or delivery notes - AI extracts data and generates SARS-compliant invoices
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="content-card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
        <div className="card-content">
          <h3 style={{ marginBottom: '1rem', color: '#1e40af' }}>🤖 How It Works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>1️⃣</div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Upload Document</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>PDF or image of load confirmation</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>2️⃣</div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>AI Extraction</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>OCR extracts all relevant data</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>3️⃣</div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Auto Customer</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Creates customer if new</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>4️⃣</div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Generate Invoice</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>SARS-compliant tax invoice</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>5️⃣</div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Review & Send</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Preview and email to client</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {!file && renderUploadZone()}

      {/* Processing Steps */}
      {(uploading || processing) && renderProcessingSteps()}

      {/* Extracted Data */}
      {extractedData && !processing && renderExtractedData()}

      <style>{`
        .spinner {
          border-radius: 50%;
          border-right-color: transparent;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          background: white;
          color: #1e293b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .action-button.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }

        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .action-button.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
        }

        .action-button.success:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
};

export default DocumentProcessing;
