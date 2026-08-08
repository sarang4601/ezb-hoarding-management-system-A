import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from "firebase/firestore"; // Firebase ફંક્શન્સ ઇમ્પોર્ટ કરેલ છે
import { db } from "../lib/firebase"; // ફાયરબેઝ ડેટાબેઝ ઇમ્પોર્ટ
import {
  Plus,
  Search,
  Tv,
  Lock,
  Edit2,
  XCircle,
  FileText,
  AlertTriangle,
  Calendar,
  Layers,
  MapPin,
  Building,
  Upload,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Agency, Hoarding, HoardingType, OwnershipType, TpScheme } from '../types';
import { calculateAnnualFee, detectFinancialYear, getHoardingCalculationsForFy, getHoardingRateForFy, isHoardingActiveInFy } from '../utils/calculations';

interface HoardingsTabProps {
  hoardings: Hoarding[];
  agencies: Agency[];
  tpSchemes?: TpScheme[];
  onAddHoarding: (hoardingData: any) => void;
  onEditHoarding: (id: string, hoardingData: any) => Promise<void> | void;
  onCancelHoarding: (id: string, cancellationData: any) => void;
  selectedFy: string;
  lang: 'gu' | 'en';
}

export const HoardingsTab: React.FC<HoardingsTabProps> = ({
  hoardings,
  agencies,
  tpSchemes = [],
  onAddHoarding,
  onEditHoarding,
  onCancelHoarding,
  selectedFy,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Cancelled'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Single' | 'Computerized'>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'Private' | 'SMC'>('ALL');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingHoarding, setEditingHoarding] = useState<Hoarding | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingHoarding, setCancellingHoarding] = useState<Hoarding | null>(null);

  const [isViewCancelModalOpen, setIsViewCancelModalOpen] = useState(false);
  const [viewingCancellationHoarding, setViewingCancellationHoarding] = useState<Hoarding | null>(null);

  // Form State
  const [agencyId, setAgencyId] = useState('');
  const [tpNumber, setTpNumber] = useState('');
  const [fpRsNumber, setFpRsNumber] = useState('');
  const [location, setLocation] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [type, setType] = useState<HoardingType>('Single');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('Private');
  const [width, setWidth] = useState<number>(20);
  const [length, setLength] = useState<number>(10);
  const [baseRatePerSqFt, setBaseRatePerSqFt] = useState<number>(250);
  const [permissionDate, setPermissionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Cancellation Form State
  const [officerDesignation, setOfficerDesignation] = useState('Deputy Estate Officer');
  const [cancellationReason, setCancellationReason] = useState('');
  const [letterNo, setLetterNo] = useState('');
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().split('T')[0]);
  const [docName, setDocName] = useState('');
  const [docData, setDocData] = useState('');

  // Live Auto Calculations inside Add/Edit Form
  const liveCalc = calculateAnnualFee(width, length, type, baseRatePerSqFt);
  const liveAutoFY = detectFinancialYear(permissionDate);

  const openAddModal = () => {
    setEditingHoarding(null);
    setAgencyId(agencies[0]?.id || '');
    setTpNumber('TP-14 (Bodakdev)');
    setFpRsNumber('FP-82/B');
    setLocation('S.G. Highway Junction');
    setOwnerName('Rameshchandra Patel');
    setRemarks('પ્રથમ તબક્કાની ચકાસણી પૂર્ણ થયેલ છે (Stage 1 Inspection Cleared)');
    setType('Single');
    setOwnershipType('Private');
    setWidth(20);
    setLength(10);
    setBaseRatePerSqFt(250);
    setPermissionDate(new Date().toISOString().split('T')[0]);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (hoarding: Hoarding) => {
    // LOCK RULE ENFORCEMENT
    if (hoarding.status === 'Cancelled') {
      alert(
        lang === 'gu'
          ? 'રદ કરેલ હોર્ડિંગના રેકોર્ડમાં ફેરફાર (UPDATE) કરવાનો પ્રતિબંધ છે!'
          : 'Cancelled hoarding record is locked against updates!'
      );
      return;
    }

    const currentFyRate = getHoardingRateForFy(hoarding, selectedFy);

    setEditingHoarding(hoarding);
    setAgencyId(hoarding.agencyId);
    setTpNumber(hoarding.tpNumber);
    setFpRsNumber(hoarding.fpRsNumber);
    setLocation(hoarding.location);
    setOwnerName(hoarding.ownerName || '');
    setRemarks(hoarding.remarks || '');
    setType(hoarding.type);
    setOwnershipType(hoarding.ownershipType || 'Private');
    setWidth(hoarding.width);
    setLength(hoarding.length);
    setBaseRatePerSqFt(currentFyRate);
    setPermissionDate(hoarding.permissionDate);
    setIsAddEditModalOpen(true);
  };

  const openCancelModal = (hoarding: Hoarding) => {
    setCancellingHoarding(hoarding);
    setOfficerDesignation('Deputy Estate Officer (Zone-1)');
    setCancellationReason('Structural hazard / Violation of municipal hoarding policy');
    setLetterNo(`MNC/EST/${new Date().getFullYear()}/CAN-${Math.floor(100 + Math.random() * 900)}`);
    setCancellationDate(new Date().toISOString().split('T')[0]);
    setDocName(`Cancellation_Order_${hoarding.hoardingNo}.pdf`);
    setDocData('');
    setIsCancelModalOpen(true);
  };

  const openViewCancelModal = (hoarding: Hoarding) => {
    setViewingCancellationHoarding(hoarding);
    setIsViewCancelModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setDocData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // સુધારેલું સબમિટ ફંક્શન (ડેટા સેવ અને ઓવરલેપ નિવારવા માટે)
  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId) {
      alert(lang === 'gu' ? 'કૃપા કરીને એજન્સી પસંદ કરો' : 'Please select an agency');
      return;
    }

    const payload = {
      agencyId,
      tpNumber,
      fpRsNumber,
      location,
      ownerName,
      remarks,
      type,
      ownershipType,
      width,
      length,
      baseRatePerSqFt,
      permissionDate,
      targetFy: selectedFy,
    };

    try {
      if (editingHoarding) {
        // જો એડિટ થતું હોય તો માત્ર તે જ આઈડીવાળો રેકોર્ડ અપડેટ કરો (ઓવરલેપ અટકાવવા)
        const docRef = doc(db, "hoardings", editingHoarding.id);
        await updateDoc(docRef, payload);
        await onEditHoarding(editingHoarding.id, payload);
        alert(lang === 'gu' ? 'ડેટા સફળતાપૂર્વક અપડેટ થઈ ગયો છે!' : 'Data updated successfully!');
      } else {
        // જો નવો ડેટા હોય તો addDoc વાપરો જેથી ફાયરબેઝ નવી યુનિક ID જનરેટ કરે અને ડેટા કાયમ સચવાય
        const docRef = await addDoc(collection(db, "hoardings"), {
          ...payload,
          createdAt: new Date(),
        });
        onAddHoarding({ id: docRef.id, ...payload });
        alert(lang === 'gu' ? 'ડેટા સફળતાપૂર્વક સેવ થઈ ગયો છે!' : 'Data saved successfully!');
      }
      setIsAddEditModalOpen(false);
    } catch (error) {
      console.error("Error saving hoarding data: ", error);
      alert(lang === 'gu' ? 'ડેટા સેવ કરવામાં ભૂલ આવી છે.' : 'Error saving data.');
    }
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingHoarding) return;
    if (!officerDesignation || !cancellationReason || !letterNo) {
      alert(lang === 'gu' ? 'કૃપા કરીને તમામ ફરજિયાત ફીલ્ડ્સ ભરો' : 'Please fill all required fields');
      return;
    }

    onCancelHoarding(cancellingHoarding.id, {
      officerDesignation,
      reason: cancellationReason,
      letterNo,
      cancellationDate,
      uploadedDocName: docName || 'Cancellation_Letter.pdf',
      uploadedDocData: docData,
    });

    setIsCancelModalOpen(false);
  };

  // Filtered List
  const filtered = hoardings.filter((h) => {
    const matchesSearch =
      h.hoardingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.tpNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.fpRsNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.ownerName && h.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.remarks && h.remarks.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || h.type === typeFilter;
    const matchesOwnership = ownershipFilter === 'ALL' || (h.ownershipType || 'Private') === ownershipFilter;
    const matchesFy = isHoardingActiveInFy(h, selectedFy);

    return matchesSearch && matchesStatus && matchesType && matchesOwnership && matchesFy;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'gu'
                  ? 'શોધો (નંબર, એજન્સી, TP નં, FP નં, લોકેશન)...'
                  : 'Search (Hoarding No, Agency, TP, FP, Location)...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs md:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">{lang === 'gu' ? 'તમામ સ્ટેટસ (All Status)' : 'All Status'}</option>
            <option value="Active">{lang === 'gu' ? 'એક્ટિવ (Active)' : 'Active'}</option>
            <option value="Cancelled">{lang === 'gu' ? 'રદ થયેલ (Cancelled)' : 'Cancelled'}</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">{lang === 'gu' ? 'તમામ પ્રકાર (All Types)' : 'All Types'}</option>
            <option value="Single">{lang === 'gu' ? 'સિંગલ (Single)' : 'Single'}</option>
            <option value="Computerized">{lang === 'gu' ? 'કોમ્પ્યુટરાઈઝ્ડ (Computerized)' : 'Computerized (LED)'}</option>
          </select>

          {/* Ownership Filter */}
          <select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">{lang === 'gu' ? 'તમામ માલિકી પ્રકાર' : 'All Ownerships'}</option>
            <option value="Private">{lang === 'gu' ? 'ખાનગી માલિકાના હોડીંગ્સ' : 'Private Ownership'}</option>
            <option value="SMC">{lang === 'gu' ? 'સુ.મ.પા.ની માલિકીના હોડીંગ્સ' : 'SMC Owned'}</option>
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs md:text-sm px-4 py-2 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'gu' ? 'નવું હોર્ડિંગ નોંધો' : 'Add New Hoarding'}</span>
        </button>
      </div>

      {/* Hoardings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{lang === 'gu' ? 'હોર્ડિંગ નં / નાણાકીય વર્ષ' : 'Hoarding No / FY'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'એજન્સીનું નામ' : 'Agency Name'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'TP / FP / લોકેશન & માલિકનું નામ' : 'TP / FP / Location & Owner'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'પ્રકાર & માલિકી' : 'Type & Ownership'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'પરિમાણ (કાચું ક્ષેત્રફળ)' : 'Size (Raw Area)'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'દર, વાર્ષિક & ત્રિમાસીક ફી' : 'Rate, Annual & Qtr Fee'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'સ્ટેટસ' : 'Status'}</th>
                <th className="px-4 py-3 text-right">{lang === 'gu' ? 'એક્શન' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    {lang === 'gu' ? 'કોઈ હોર્ડિંગ રેકોર્ડ મળ્યો નથી.' : 'No hoarding records found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((hoarding) => {
                  const fyCalc = getHoardingCalculationsForFy(hoarding, selectedFy);
                  const fyRate = getHoardingRateForFy(hoarding, selectedFy);

                  return (
                    <tr key={hoarding.id} className="hover:bg-slate-50 transition-colors">
                      {/* Hoarding No & FY */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <div>{hoarding.hoardingNo}</div>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                          FY {hoarding.financialYear}
                        </span>
                      </td>

                      {/* Agency */}
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{hoarding.agencyName}</span>
                        </div>
                      </td>

                      {/* Location & TP/FP & Owner Name & Remarks */}
                      <td className="px-4 py-3 text-xs space-y-0.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>{hoarding.tpNumber} | {hoarding.fpRsNumber}</span>
                        </div>
                        <div className="text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{hoarding.location}</span>
                        </div>
                        <div className="text-slate-500 font-medium text-[11px] pl-4">
                          <span className="text-slate-400">{lang === 'gu' ? 'માલિક:' : 'Owner:'}</span> {hoarding.ownerName || '-'}
                        </div>
                        {hoarding.remarks && (
                          <div className="text-amber-900 font-medium text-[11px] pl-4 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                            💬 <span className="font-bold">{lang === 'gu' ? 'રીમાર્ક્સ:' : 'Remarks:'}</span> {hoarding.remarks}
                          </div>
                        )}
                      </td>

                      {/* Type & Ownership */}
                      <td className="px-4 py-3 font-medium space-y-1">
                        <div>
                          {hoarding.type === 'Computerized' ? (
                            <span className="inline-flex items-center gap-1 text-purple-800 bg-purple-100 border border-purple-200 text-xs px-2 py-0.5 rounded-md font-bold">
                              <Tv className="w-3 h-3 text-purple-600" />
                              {lang === 'gu' ? 'કોમ્પ્યુટરાઈઝ્ડ (2x)' : 'Computerized (2x)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 border border-slate-200 text-xs px-2 py-0.5 rounded-md font-medium">
                              {lang === 'gu' ? 'સિંગલ' : 'Single'}
                            </span>
                          )}
                        </div>
                        <div>
                          {hoarding.ownershipType === 'SMC' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-900 bg-emerald-100 border border-emerald-300 text-[11px] px-2 py-0.5 rounded-md font-bold">
                              🏛️ {lang === 'gu' ? 'સુ.મ.પા.ની માલિકીના' : 'SMC Owned'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 border border-slate-300 text-[11px] px-2 py-0.5 rounded-md font-medium">
                              🏢 {lang === 'gu' ? 'ખાનગી માલિકાના' : 'Private Ownership'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Size & Raw Area in sq.m */}
                      <td className="px-4 py-3 font-mono text-xs">
                        <div className="text-slate-700">{hoarding.width}m × {hoarding.length}m</div>
                        <div className="font-extrabold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded inline-block my-0.5 border border-blue-200">
                          {lang === 'gu' ? 'કાચું ક્ષેત્રફળ:' : 'Raw Area:'} {Number(hoarding.rawArea || 0).toFixed(2)} sq.m
                        </div>
                      </td>

                      {/* Rate, Annual Fee & Quarterly Fee for selected FY */}
                      <td className="px-4 py-3 font-mono text-xs space-y-0.5">
                        <div className="text-slate-500">
                          {lang === 'gu' ? 'દર:' : 'Rate:'} ₹{fyCalc.effectiveRate}/sq.m <span className="text-[10px] text-slate-400">(Base: ₹{fyRate})</span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-xs">
                          {lang === 'gu' ? 'વાર્ષિક:' : 'Annual:'} ₹{fyCalc.annualFee.toLocaleString('en-IN')}
                        </div>
                        <div className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded inline-block border border-indigo-200 text-[11px]">
                          {lang === 'gu' ? 'ત્રિમાસીક:' : 'Qtr Fee:'} ₹{fyCalc.quarterlyFee.toLocaleString('en-IN')}
                        </div>
                      </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {hoarding.status === 'Cancelled' ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-300 text-xs px-2 py-1 rounded-md font-bold">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          {lang === 'gu' ? 'રદ થયેલ (Cancelled)' : 'Cancelled'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2 py-1 rounded-md font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {lang === 'gu' ? 'એક્ટિવ (Active)' : 'Active'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hoarding.status === 'Cancelled' ? (
                          <>
                            {/* LOCKED EDIT BUTTON */}
                            <button
                              disabled
                              className="p-1.5 bg-slate-100 text-slate-400 rounded cursor-not-allowed border border-slate-200 opacity-60 flex items-center gap-1 text-xs"
                              title={
                                lang === 'gu'
                                  ? 'રદ થયેલ હોર્ડિંગ એડિટ કરી શકાતું નથી (UPDATE Disabled)'
                                  : 'Cancelled hoarding cannot be edited (UPDATE Disabled)'
                              }
                            >
                              <Lock className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-[10px] text-red-600 font-bold">{lang === 'gu' ? 'લોક' : 'Locked'}</span>
                            </button>

                            {/* View Cancellation Details */}
                            <button
                              onClick={() => openViewCancelModal(hoarding)}
                              className="p-1.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors flex items-center gap-1 text-xs font-semibold"
                              title="રદ કર્યાની વિગતો જુઓ"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{lang === 'gu' ? 'રદ વિગત' : 'Reason'}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Normal Edit Button */}
                            <button
                              onClick={() => openEditModal(hoarding)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="એડિટ"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Cancel Button */}
                            <button
                              onClick={() => openCancelModal(hoarding)}
                              className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-semibold transition-colors flex items-center gap-1"
                              title="હોર્ડિંગ રદ કરો"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{lang === 'gu' ? 'રદ કરો' : 'Cancel'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Hoarding Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <Tv className="w-5 h-5 text-blue-600" />
              {editingHoarding
                ? lang === 'gu'
                  ? 'હોર્ડિંગ વિગતો એડિટ કરો'
                  : 'Edit Hoarding Details'
                : lang === 'gu'
                ? 'નવું હોર્ડિંગ નોંધો'
                : 'Register New Hoarding'}
            </h3>

            <form onSubmit={handleAddEditSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Agency Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'એજન્સી પસંદ કરો *' : 'Select Agency *'}
                </label>
                <select
                  required
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="">{lang === 'gu' ? '-- એજન્સી પસંદ કરો --' : '-- Select Agency --'}</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.agencyNo})
                    </option>
                  ))}
                </select>
              </div>

              {/* TP & FP/RS Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">
                      {lang === 'gu' ? 'TP સ્કીમ નંબર (Town Planning Scheme) *' : 'TP Scheme Number *'}
                    </label>
                    {tpSchemes.length > 0 && (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {tpSchemes.length} {lang === 'gu' ? 'સ્કીમો ઉપલબ્ધ' : 'schemes available'}
                      </span>
                    )}
                  </div>

                  {tpSchemes.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setTpNumber(e.target.value);
                        }
                      }}
                      className="w-full mb-1.5 px-2.5 py-1.5 bg-indigo-50/60 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="">{lang === 'gu' ? '-- સ્કીમ માંથી પસંદ કરો (માસ્ટર યાદી) --' : '-- Choose from Master TP List --'}</option>
                      {tpSchemes.map((tp) => (
                        <option key={tp.id} value={tp.nameGu}>
                          {tp.nameGu}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    required
                    value={tpNumber}
                    onChange={(e) => setTpNumber(e.target.value)}
                    placeholder="e.g. ટી.પી. સ્કીમ નં. ૨૭ (ઉત્રાણ-કોસાડ)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'FP / RS નંબર (Plot/Survey) *' : 'FP / RS Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fpRsNumber}
                    onChange={(e) => setFpRsNumber(e.target.value)}
                    placeholder="e.g. FP-82/B or RS-104"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Location & Owner Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'સ્થળ / લોકેશનની વિગત:' : 'Location Details:'}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. S.G. Highway Junction, Ward 4"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'લોકેશન માલિકનું નામ:' : 'Location / Land Owner Name:'}
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Rameshchandra Patel / Land Owner"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'રીમાર્ક્સ (Remarks / નોંધ):' : 'Remarks / Special Notes:'}
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    lang === 'gu'
                      ? 'હોર્ડિંગ સંબંધિત કોઈ ખાસ નોંધ અથવા રીમાર્ક્સ લખો (દા.ત. કોર્ટ કેસ સ્થિતિ, સાઇટ ઇન્સ્પેક્શન, ખાસ પરવાનગી, વિ.)'
                      : 'Enter any remarks or special notes (e.g. site inspection status, court case note, special conditions)'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ownership Type & Hoarding Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ownership Type Selector */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'માલિકીનો પ્રકાર (Ownership Type) *' : 'Ownership Type *'}
                  </label>
                  <select
                    required
                    value={ownershipType}
                    onChange={(e) => setOwnershipType(e.target.value as OwnershipType)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                  >
                    <option value="Private">
                      {lang === 'gu' ? 'ખાનગી માલિકાના હોડીંગ્સ' : 'Private Ownership'}
                    </option>
                    <option value="SMC">
                      {lang === 'gu' ? 'સુ.મ.પા.ની માલિકીના હોડીંગ્સ' : 'SMC Owned'}
                    </option>
                  </select>
                </div>

                {/* Type Selector */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'હોર્ડિંગનો પ્રકાર (Type) *' : 'Hoarding Type *'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        type === 'Single'
                          ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="radio"
                          name="hoardingType"
                          value="Single"
                          checked={type === 'Single'}
                          onChange={() => setType('Single')}
                        />
                        <span>{lang === 'gu' ? 'સિંગલ' : 'Single'}</span>
                      </div>
                    </label>

                    <label
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        type === 'Computerized'
                          ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="radio"
                          name="hoardingType"
                          value="Computerized"
                          checked={type === 'Computerized'}
                          onChange={() => setType('Computerized')}
                        />
                        <span>{lang === 'gu' ? 'LED (2x)' : 'LED (2x)'}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Dimensions (Width x Length) & Base Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'પહોળાઈ (Width m) *' : 'Width (meters) *'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'લંબાઈ (Length m) *' : 'Length (meters) *'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'બેઝ દર (₹/sq.m) *' : 'Base Rate (₹/sq.m) *'}
                  </label>
                  <input
                    type="number"
                    required
                    value={baseRatePerSqFt}
                    onChange={(e) => setBaseRatePerSqFt(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {lang === 'gu' ? `નાણાકીય વર્ષ ${selectedFy} માટે દર` : `Rate for FY ${selectedFy}`}
                  </span>
                </div>
              </div>

              {/* Permission Date */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'પરમિશન તારીખ (Permission Date) *' : 'Permission Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={permissionDate}
                  onChange={(e) => setPermissionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Dynamic Live Calculation Card */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 text-xs font-mono border border-slate-800">
                <div className="flex justify-between text-blue-300 font-bold">
                  <span>{lang === 'gu' ? 'કાચું ક્ષેત્રફળ (Raw Area - No roundup):' : 'Raw Area (No roundup):'}</span>
                  <span>{liveCalc.rawArea.toFixed(2)} sq.m</span>
                </div>
                <div className="flex justify-between text-purple-300">
                  <span>{lang === 'gu' ? 'લાગુ પડેલ દર (Effective Rate):' : 'Effective Rate:'}</span>
                  <span>₹{liveCalc.effectiveRate}/sq.m {type === 'Computerized' ? '(2x Auto Applied)' : ''}</span>
                </div>
                <div className="flex justify-between text-emerald-300 font-extrabold text-xs border-t border-slate-800 pt-1.5">
                  <span>{lang === 'gu' ? 'વાર્ષિક ફી (Math.ceil):' : 'Calculated Annual Fee:'}</span>
                  <span>₹{liveCalc.annualFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-extrabold text-sm border-t border-slate-700 pt-1">
                  <span>{lang === 'gu' ? 'ત્રિમાસીક ફી (Quarterly Fee):' : 'Quarterly License Fee:'}</span>
                  <span>₹{liveCalc.quarterlyFee.toLocaleString('en-IN')} / Qtr</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                  <span>{lang === 'gu' ? 'ઓટો-ડિટેક્ટ નાણાકીય વર્ષ:' : 'Auto-detected FY:'}</span>
                  <span className="font-bold text-slate-200">{liveAutoFY}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                >
                  {lang === 'gu' ? 'કેન્સલ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  {lang === 'gu' ? 'સેવ કરો' : 'Save Hoarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Hoarding Modal */}
      {isCancelModalOpen && cancellingHoarding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-red-200">
            <h3 className="text-lg font-bold text-red-700 mb-2 pb-2 border-b border-red-100 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              {lang === 'gu' ? 'હોર્ડિંગ રદ રજીસ્ટ્રેશન (Cancellation Log)' : 'Register Hoarding Cancellation'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {lang === 'gu'
                ? `હોર્ડિંગ નં: ${cancellingHoarding.hoardingNo} (${cancellingHoarding.agencyName}) ને રદ કરવા માટે નીચેની વિગતો ભરો. એકવાર રદ થયા પછી આ રેકોર્ડ લોક થઇ જશે.`
                : `Fill cancellation details for ${cancellingHoarding.hoardingNo}. Once cancelled, UPDATE will be blocked.`}
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3.5 text-xs md:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'અધિકારીનો હોદ્દો (Officer Designation) *' : 'Officer Designation *'}
                </label>
                <input
                  type="text"
                  required
                  value={officerDesignation}
                  onChange={(e) => setOfficerDesignation(e.target.value)}
                  placeholder="e.g. Deputy Estate Officer / Municipal Commissioner"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'પત્ર નંબર (Letter / Order No.) *' : 'Letter / Order Number *'}
                </label>
                <input
                  type="text"
                  required
                  value={letterNo}
                  onChange={(e) => setLetterNo(e.target.value)}
                  placeholder="e.g. MNC/EST/2025/CAN-402"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'રદ કરવાની તારીખ *' : 'Cancellation Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'રદ કરવાનું સ્પષ્ટ કારણ *' : 'Cancellation Reason *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Safety hazard, encroachment, non-payment of fees..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Upload Document */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'અધિકૃત પત્ર અપલોડ કરો (Doc Attachment)' : 'Upload Official Letter (Document)'}
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>{lang === 'gu' ? 'ફાઈલ પસંદ કરો' : 'Choose File'}</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc" />
                  </label>
                  <span className="text-xs text-slate-600 truncate font-mono">
                    {docName || (lang === 'gu' ? 'કોઈ ફાઈલ પસંદ કરી નથી' : 'No file selected')}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  {lang === 'gu'
                    ? 'ચેતવણી: રદ કર્યા પછી ડેટાબેઝ નિયમ મુજબ આ હોર્ડિંગ એડિટ (UPDATE) કરી શકાશે નહીં.'
                    : 'Warning: Post cancellation, editing (UPDATE) will be strictly blocked.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                >
                  {lang === 'gu' ? 'પાછા જાઓ' : 'Go Back'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {lang === 'gu' ? 'હોર્ડિંગ રદ કરો (Confirm Cancel)' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Cancellation Log Details Modal */}
      {isViewCancelModalOpen && viewingCancellationHoarding?.cancellationDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-red-800 mb-3 pb-2 border-b border-red-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              {lang === 'gu' ? 'રદ કરેલ હોર્ડિંગ ઓર્ડર વિગતો' : 'Cancellation Order Details'}
            </h3>

            <div className="space-y-3 text-xs md:text-sm">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'gu' ? 'હોર્ડિંગ નં:' : 'Hoarding No:'}</span>
                  <span className="font-bold text-slate-900">{viewingCancellationHoarding.hoardingNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'gu' ? 'એજન્સી:' : 'Agency:'}</span>
                  <span className="font-medium text-slate-800">{viewingCancellationHoarding.agencyName}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold">{lang === 'gu' ? 'અધિકારીનો હોદ્દો:' : 'Officer Designation:'}</label>
                <p className="font-bold text-slate-800">{viewingCancellationHoarding.cancellationDetails.officerDesignation}</p>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold">{lang === 'gu' ? 'પત્ર નંબર & તારીખ:' : 'Letter No & Date:'}</label>
                <p className="font-mono font-bold text-blue-800">
                  {viewingCancellationHoarding.cancellationDetails.letterNo} ({viewingCancellationHoarding.cancellationDetails.cancellationDate})
                </p>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold">{lang === 'gu' ? 'રદ કરવાનું કારણ:' : 'Reason for Cancellation:'}</label>
                <p className="bg-red-50 text-red-900 p-2.5 rounded border border-red-200">
                  {viewingCancellationHoarding.cancellationDetails.reason}
                </p>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold">{lang === 'gu' ? 'અપલોડ કરેલ દસ્તાવેજ:' : 'Uploaded Document:'}</label>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-mono text-xs text-slate-700 underline">
                    {viewingCancellationHoarding.cancellationDetails.uploadedDocName}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 text-amber-900 p-2.5 rounded border border-amber-200 text-xs flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{lang === 'gu' ? 'ડેટાબેઝ સિક્યોરિટી લોક એક્ટિવ છે.' : 'Database update block lock active.'}</span>
              </div>
            </div>

            <div className="mt-5 text-right border-t border-slate-200 pt-3">
              <button
                onClick={() => setIsViewCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-xs hover:bg-slate-800"
              >
                {lang === 'gu' ? 'બંધ કરો' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
