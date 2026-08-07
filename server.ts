import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initialAgencies, initialHoardings, initialQuarterlyFees, initialStabilityCertificates } from './src/data/mockData';
import { Agency, Hoarding, QuarterlyFee, StabilityCertificate } from './src/types';
import { calculateAnnualFee, calculateQuarterlyBreakdown, checkStabilityStatus, detectFinancialYear, getFinancialYearsList, getHoardingCalculationsForFy, getHoardingRateForFy, isHoardingActiveInFy } from './src/utils/calculations';

// In-memory persistent state during server runtime
let agenciesStore: Agency[] = [...initialAgencies];
let hoardingsStore: Hoarding[] = [...initialHoardings];
let quarterlyFeesStore: QuarterlyFee[] = [...initialQuarterlyFees];
let stabilityCertificatesStore: StabilityCertificate[] = [...initialStabilityCertificates];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper to re-sync stability certificate alerts
  function refreshStabilityCertificates() {
    stabilityCertificatesStore = stabilityCertificatesStore.map((cert) => {
      const statusInfo = checkStabilityStatus(cert.validUntilDate);
      const hoarding = hoardingsStore.find((h) => h.id === cert.hoardingId);
      return {
        ...cert,
        location: cert.location || (hoarding ? hoarding.location : ''),
        daysRemaining: statusInfo.daysRemaining,
        isAlertActive: statusInfo.isAlertActive,
        status: statusInfo.status,
      };
    });
  }

  refreshStabilityCertificates();

  // --- API ROUTES ---

  // Financial Years Endpoint
  app.get('/api/financial-years', (req, res) => {
    const fyList = getFinancialYearsList(2024, 10);
    res.json(fyList);
  });

  // System Stats Endpoint
  app.get('/api/stats', (req, res) => {
    refreshStabilityCertificates();
    const fyFilter = req.query.financialYear as string;

    const filteredHoardings = fyFilter && fyFilter !== 'ALL'
      ? hoardingsStore.filter((h) => isHoardingActiveInFy(h, fyFilter))
      : hoardingsStore;

    const totalHoardings = filteredHoardings.length;
    const activeHoardings = filteredHoardings.filter((h) => h.status === 'Active').length;
    const cancelledHoardings = filteredHoardings.filter((h) => h.status === 'Cancelled').length;
    const computerizedCount = filteredHoardings.filter((h) => h.type === 'Computerized').length;

    const filteredQuarterly = fyFilter && fyFilter !== 'ALL'
      ? quarterlyFeesStore.filter((q) => q.financialYear === fyFilter)
      : quarterlyFeesStore;

    const totalRevenue = filteredQuarterly
      .filter((q) => q.paymentStatus === 'Paid')
      .reduce((sum, q) => sum + q.totalAmount, 0);

    const pendingFees = filteredQuarterly
      .filter((q) => q.paymentStatus === 'Pending' || q.paymentStatus === 'Overdue')
      .reduce((sum, q) => sum + q.totalAmount, 0);

    const stabilityAlertsCount = stabilityCertificatesStore.filter((s) => s.isAlertActive).length;

    res.json({
      totalAgencies: agenciesStore.length,
      totalHoardings,
      activeHoardings,
      cancelledHoardings,
      computerizedCount,
      totalRevenue,
      pendingFees,
      stabilityAlertsCount,
    });
  });

  // Reset Data Endpoint
  app.post('/api/reset-data', (req, res) => {
    agenciesStore = JSON.parse(JSON.stringify(initialAgencies));
    hoardingsStore = JSON.parse(JSON.stringify(initialHoardings));
    quarterlyFeesStore = JSON.parse(JSON.stringify(initialQuarterlyFees));
    stabilityCertificatesStore = JSON.parse(JSON.stringify(initialStabilityCertificates));
    refreshStabilityCertificates();
    res.json({ message: 'ડેટા સફળતાપૂર્વક રીસેટ થયો (Data reset successfully)' });
  });

  // --- AGENCIES CRUD ---
  app.get('/api/agencies', (req, res) => {
    res.json(agenciesStore);
  });

  app.post('/api/agencies', (req, res) => {
    const { name, gstNumber, contactPerson, phone, email, address } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'એજન્સીનું નામ જરૂરી છે (Agency Name is required)' });
    }

    const newAgency: Agency = {
      id: `ag-${Date.now()}`,
      agencyNo: `AG-${new Date().getFullYear()}-${String(agenciesStore.length + 1).padStart(3, '0')}`,
      name,
      gstNumber: gstNumber || '',
      contactPerson: contactPerson || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      createdDate: new Date().toISOString().split('T')[0],
    };

    agenciesStore.unshift(newAgency);
    res.status(201).json(newAgency);
  });

  app.put('/api/agencies/:id', (req, res) => {
    const { id } = req.params;
    const index = agenciesStore.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    agenciesStore[index] = { ...agenciesStore[index], ...req.body };
    
    // Also update agency name in hoardings if updated
    if (req.body.name) {
      hoardingsStore = hoardingsStore.map((h) =>
        h.agencyId === id ? { ...h, agencyName: req.body.name } : h
      );
    }

    res.json(agenciesStore[index]);
  });

  app.delete('/api/agencies/:id', (req, res) => {
    const { id } = req.params;
    agenciesStore = agenciesStore.filter((a) => a.id !== id);
    res.json({ success: true });
  });

  // --- HOARDINGS CRUD ---
  app.get('/api/hoardings', (req, res) => {
    const { financialYear, agencyId } = req.query;
    const fyStr = (financialYear as string) || 'ALL';
    let list = hoardingsStore;

    if (fyStr && fyStr !== 'ALL') {
      list = list.filter((h) => isHoardingActiveInFy(h, fyStr));
    }
    if (agencyId && agencyId !== 'ALL') {
      list = list.filter((h) => h.agencyId === agencyId);
    }

    // Map list to compute calculations for the requested financial year while keeping permissionDate intact
    const mappedList = list.map((h) => {
      const calc = getHoardingCalculationsForFy(h, fyStr);
      const currentRate = getHoardingRateForFy(h, fyStr);
      return {
        ...h,
        baseRatePerSqFt: currentRate,
        effectiveRate: calc.effectiveRate,
        calculatedAnnualFee: calc.annualFee,
        calculatedQuarterlyFee: calc.quarterlyFee,
      };
    });

    res.json(mappedList);
  });

  app.post('/api/hoardings', (req, res) => {
    const { agencyId, tpNumber, fpRsNumber, location, ownerName, remarks, type, ownershipType, width, length, baseRatePerSqFt, permissionDate } = req.body;

    const agency = agenciesStore.find((a) => a.id === agencyId);
    if (!agency) {
      return res.status(400).json({ error: 'કૃપા કરીને માન્ય એજન્સી પસંદ કરો (Please select a valid agency)' });
    }

    const w = Number(width) || 0;
    const l = Number(length) || 0;
    const rate = Number(baseRatePerSqFt) || 250;
    const permDate = permissionDate || new Date().toISOString().split('T')[0];

    // Auto calculation & roundup rule
    const calc = calculateAnnualFee(w, l, type || 'Single', rate);
    const autoFY = detectFinancialYear(permDate);

    const newHoarding: Hoarding = {
      id: `hrd-${Date.now()}`,
      hoardingNo: `HRD-${new Date().getFullYear()}-${String(hoardingsStore.length + 101).padStart(3, '0')}`,
      agencyId,
      agencyName: agency.name,
      tpNumber: tpNumber || 'TP-General',
      fpRsNumber: fpRsNumber || 'FP-01',
      location: location || '',
      ownerName: ownerName || '',
      remarks: remarks || '',
      type: type || 'Single',
      ownershipType: ownershipType || 'Private',
      width: w,
      length: l,
      rawArea: calc.rawArea,
      roundedArea: calc.roundedArea,
      baseRatePerSqFt: rate,
      fyRates: { [autoFY]: rate },
      effectiveRate: calc.effectiveRate,
      calculatedAnnualFee: calc.annualFee,
      calculatedQuarterlyFee: calc.quarterlyFee,
      permissionDate: permDate,
      financialYear: autoFY,
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    hoardingsStore.unshift(newHoarding);
    res.status(201).json(newHoarding);
  });

  // Edit Hoarding Endpoint WITH CANCELLATION LOCK RULE & YEAR-WISE RATE SUPPORT
  app.put('/api/hoardings/:id', (req, res) => {
    const { id } = req.params;
    const hoarding = hoardingsStore.find((h) => h.id === id);

    if (!hoarding) {
      return res.status(404).json({ error: 'Hoarding record not found' });
    }

    // MANDATORY CANCELLATION EDIT LOCK RULE!
    if (hoarding.status === 'Cancelled') {
      return res.status(400).json({
        error: 'રદ કરેલ હોર્ડિંગના રેકોર્ડમાં ફેરફાર (UPDATE) કરવાનો પ્રતિબંધ છે! (Cancelled hoarding record is locked against edits.)',
      });
    }

    const agency = agenciesStore.find((a) => a.id === (req.body.agencyId || hoarding.agencyId));
    const w = Number(req.body.width ?? hoarding.width);
    const l = Number(req.body.length ?? hoarding.length);
    const type = req.body.type || hoarding.type;
    const rate = Number(req.body.baseRatePerSqFt ?? hoarding.baseRatePerSqFt);
    const permDate = req.body.permissionDate || hoarding.permissionDate;
    const targetFy = req.body.targetFy || req.body.selectedFy || hoarding.financialYear;

    // Maintain year-wise rate dictionary
    const updatedFyRates = {
      ...(hoarding.fyRates || {}),
      [targetFy]: rate,
    };

    const calc = calculateAnnualFee(w, l, type, rate);
    // Keep initial registration financial year & permission date!

    const index = hoardingsStore.findIndex((h) => h.id === id);
    hoardingsStore[index] = {
      ...hoarding,
      ...req.body,
      agencyName: agency ? agency.name : hoarding.agencyName,
      width: w,
      length: l,
      rawArea: calc.rawArea,
      roundedArea: calc.roundedArea,
      baseRatePerSqFt: rate,
      fyRates: updatedFyRates,
      effectiveRate: calc.effectiveRate,
      calculatedAnnualFee: calc.annualFee,
      calculatedQuarterlyFee: calc.quarterlyFee,
      permissionDate: permDate, // PRESERVED INITIAL PERMISSION DATE
    };

    res.json(hoardingsStore[index]);
  });

  // Cancel Hoarding Endpoint
  app.post('/api/hoardings/:id/cancel', (req, res) => {
    const { id } = req.params;
    const { officerDesignation, reason, letterNo, cancellationDate, uploadedDocName, uploadedDocData } = req.body;

    const index = hoardingsStore.findIndex((h) => h.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Hoarding not found' });
    }

    if (!officerDesignation || !reason || !letterNo) {
      return res.status(400).json({ error: 'અધિકારીનો હોદ્દો, કારણ અને પત્ર નંબર ફરજિયાત છે (Officer designation, reason & letter no. are required)' });
    }

    hoardingsStore[index] = {
      ...hoardingsStore[index],
      status: 'Cancelled',
      cancellationDetails: {
        officerDesignation,
        reason,
        letterNo,
        cancellationDate: cancellationDate || new Date().toISOString().split('T')[0],
        uploadedDocName: uploadedDocName || 'cancellation_letter.pdf',
        uploadedDocData,
      },
    };

    res.json(hoardingsStore[index]);
  });

  // --- QUARTERLY FEES CRUD ---
  app.get('/api/quarterly-fees', (req, res) => {
    const { financialYear, hoardingId } = req.query;
    let list = quarterlyFeesStore;

    if (financialYear && financialYear !== 'ALL') {
      list = list.filter((q) => q.financialYear === financialYear);
    }
    if (hoardingId && hoardingId !== 'ALL') {
      list = list.filter((q) => q.hoardingId === hoardingId);
    }

    res.json(list);
  });

  app.post('/api/quarterly-fees', (req, res) => {
    const { hoardingId, quarter, interest, deductions, paymentStatus, paymentMode, remarks, receiptNo, receiptDate } = req.body;

    const hoarding = hoardingsStore.find((h) => h.id === hoardingId);
    if (!hoarding) {
      return res.status(400).json({ error: 'કૃપા કરીને માન્ય હોર્ડિંગ પસંદ કરો (Please select a valid hoarding)' });
    }

    const calc = calculateQuarterlyBreakdown(hoarding.calculatedAnnualFee, interest, deductions);

    const newFee: QuarterlyFee = {
      id: `qf-${Date.now()}`,
      hoardingId: hoarding.id,
      hoardingNo: hoarding.hoardingNo,
      agencyName: hoarding.agencyName,
      financialYear: hoarding.financialYear,
      quarter: quarter || 'Q1',
      quarterlyLicenseFee: calc.quarterlyLicenseFee,
      interest: calc.interest,
      deductions: calc.deductions,
      taxableAmount: calc.taxableAmount,
      sgst: calc.sgst,
      cgst: calc.cgst,
      totalAmount: calc.totalAmount,
      receiptNo: receiptNo || `RCP-${new Date().getFullYear()}-${String(quarterlyFeesStore.length + 101).padStart(4, '0')}`,
      receiptDate: receiptDate || new Date().toISOString().split('T')[0],
      paymentStatus: paymentStatus || 'Pending',
      paymentMode: paymentMode || 'Online',
      remarks: remarks || '',
    };

    quarterlyFeesStore.unshift(newFee);
    res.status(201).json(newFee);
  });

  app.put('/api/quarterly-fees/:id', (req, res) => {
    const { id } = req.params;
    const index = quarterlyFeesStore.findIndex((q) => q.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Quarterly fee record not found' });
    }

    const existing = quarterlyFeesStore[index];
    const hoarding = hoardingsStore.find((h) => h.id === existing.hoardingId);
    const annualFee = hoarding ? hoarding.calculatedAnnualFee : (existing.quarterlyLicenseFee * 4);

    const calc = calculateQuarterlyBreakdown(
      annualFee,
      req.body.interest !== undefined ? req.body.interest : existing.interest,
      req.body.deductions !== undefined ? req.body.deductions : existing.deductions
    );

    quarterlyFeesStore[index] = {
      ...existing,
      ...req.body,
      quarterlyLicenseFee: calc.quarterlyLicenseFee,
      interest: calc.interest,
      deductions: calc.deductions,
      taxableAmount: calc.taxableAmount,
      sgst: calc.sgst,
      cgst: calc.cgst,
      totalAmount: calc.totalAmount,
    };

    res.json(quarterlyFeesStore[index]);
  });

  app.delete('/api/quarterly-fees/:id', (req, res) => {
    const { id } = req.params;
    quarterlyFeesStore = quarterlyFeesStore.filter((q) => q.id !== id);
    res.json({ success: true });
  });

  // --- STABILITY CERTIFICATES CRUD ---
  app.get('/api/stability-certificates', (req, res) => {
    refreshStabilityCertificates();
    const { alertOnly } = req.query;
    if (alertOnly === 'true') {
      return res.json(stabilityCertificatesStore.filter((s) => s.isAlertActive));
    }
    res.json(stabilityCertificatesStore);
  });

  app.post('/api/stability-certificates', (req, res) => {
    const { hoardingId, certificateNo, engineerName, engineerLicenseNo, issueDate, validUntilDate } = req.body;

    const hoarding = hoardingsStore.find((h) => h.id === hoardingId);
    if (!hoarding) {
      return res.status(400).json({ error: 'કૃપા કરીને માન્ય હોર્ડિંગ પસંદ કરો (Please select a valid hoarding)' });
    }

    const statusInfo = checkStabilityStatus(validUntilDate);

    const newCert: StabilityCertificate = {
      id: `stb-${Date.now()}`,
      hoardingId: hoarding.id,
      hoardingNo: hoarding.hoardingNo,
      agencyName: hoarding.agencyName,
      location: hoarding.location || '',
      certificateNo: certificateNo || `STB-MNC-${new Date().getFullYear()}-${String(stabilityCertificatesStore.length + 101).padStart(3, '0')}`,
      engineerName: engineerName || 'Structural Engineer',
      engineerLicenseNo: engineerLicenseNo || '',
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      validUntilDate: validUntilDate || new Date().toISOString().split('T')[0],
      daysRemaining: statusInfo.daysRemaining,
      isAlertActive: statusInfo.isAlertActive,
      status: statusInfo.status,
    };

    stabilityCertificatesStore.unshift(newCert);
    res.status(201).json(newCert);
  });

  app.put('/api/stability-certificates/:id', (req, res) => {
    const { id } = req.params;
    const index = stabilityCertificatesStore.findIndex((s) => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const validUntilDate = req.body.validUntilDate || stabilityCertificatesStore[index].validUntilDate;
    const statusInfo = checkStabilityStatus(validUntilDate);

    stabilityCertificatesStore[index] = {
      ...stabilityCertificatesStore[index],
      ...req.body,
      daysRemaining: statusInfo.daysRemaining,
      isAlertActive: statusInfo.isAlertActive,
      status: statusInfo.status,
    };

    res.json(stabilityCertificatesStore[index]);
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
