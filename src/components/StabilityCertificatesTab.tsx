import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  UserCheck,
  FileCheck,
  RefreshCcw,
  MapPin,
} from 'lucide-react';
import { Hoarding, StabilityCertificate } from '../types';
import { checkStabilityStatus } from '../utils/calculations';

interface StabilityCertificatesTabProps {
  certificates: StabilityCertificate[];
  hoardings: Hoarding[];
  onAddCertificate: (certData: any) => void;
  onUpdateCertificate: (id: string, certData: any) => void;
  lang: 'gu' | 'en';
}

export const StabilityCertificatesTab: React.FC<StabilityCertificatesTabProps> = ({
  certificates,
  hoardings,
  onAddCertificate,
  onUpdateCertificate,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState('ALL');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<StabilityCertificate | null>(null);

  // Form State
  const [modalAgencyFilter, setModalAgencyFilter] = useState('ALL');
  const [hoardingId, setHoardingId] = useState('');
  const [certificateNo, setCertificateNo] = useState('');
  const [engineerName, setEngineerName] = useState('');
  const [engineerLicenseNo, setEngineerLicenseNo] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntilDate, setValidUntilDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Extract unique agency names for top filter
  const uniqueAgencies = Array.from(
    new Set(hoardings.map((h) => h.agencyName).filter(Boolean))
  ).sort();

  // Extract locations agency-wise
  const filteredLocations = Array.from(
    new Set(
      hoardings
        .filter((h) => selectedAgencyFilter === 'ALL' || h.agencyName === selectedAgencyFilter)
        .map((h) => h.location)
        .filter(Boolean)
    )
  ).sort();

  const openAddModal = () => {
    setEditingCert(null);
    setModalAgencyFilter('ALL');
    const active = hoardings.find((h) => h.status === 'Active') || hoardings[0];
    setHoardingId(active?.id || '');
    setCertificateNo(`STB-MNC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setEngineerName('Er. Suresh Patel (M.E. Structure)');
    setEngineerLicenseNo('AMC-SE-104');
    setIssueDate(new Date().toISOString().split('T')[0]);
    
    // Set 1 year valid by default
    const nextYr = new Date();
    nextYr.setFullYear(nextYr.getFullYear() + 1);
    setValidUntilDate(nextYr.toISOString().split('T')[0]);

    setIsModalOpen(true);
  };

  const openEditModal = (cert: StabilityCertificate) => {
    setEditingCert(cert);
    setHoardingId(cert.hoardingId);
    setModalAgencyFilter('ALL');
    setCertificateNo(cert.certificateNo);
    setEngineerName(cert.engineerName);
    setEngineerLicenseNo(cert.engineerLicenseNo);
    setIssueDate(cert.issueDate);
    setValidUntilDate(cert.validUntilDate);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hoardingId) return;

    if (editingCert) {
      onUpdateCertificate(editingCert.id, {
        certificateNo,
        engineerName,
        engineerLicenseNo,
        issueDate,
        validUntilDate,
      });
    } else {
      onAddCertificate({
        hoardingId,
        certificateNo,
        engineerName,
        engineerLicenseNo,
        issueDate,
        validUntilDate,
      });
    }

    setIsModalOpen(false);
  };

  const filtered = certificates.filter((c) => {
    const hoardingObj = hoardings.find((h) => h.id === c.hoardingId);
    const certLocation = c.location || (hoardingObj ? hoardingObj.location : '');

    const matchesSearch =
      c.certificateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.hoardingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.engineerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certLocation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAgency = selectedAgencyFilter === 'ALL' || c.agencyName === selectedAgencyFilter;
    const matchesLocation = selectedLocationFilter === 'ALL' || certLocation === selectedLocationFilter;
    const matchesAlert = !filterAlertsOnly || c.isAlertActive;

    return matchesSearch && matchesAgency && matchesLocation && matchesAlert;
  });

  const alertsCount = certificates.filter((c) => c.isAlertActive).length;

  return (
    <div className="space-y-4">
      {/* 45-Day Alert Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs">
            <ShieldAlert className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-red-900 text-sm md:text-base flex items-center gap-2">
              <span>
                {lang === 'gu'
                  ? 'સ્ટેબિલિટી સર્ટિફિકેટ ૪૫-દિવસ ચેતવણી ડેશબોર્ડ'
                  : 'Stability Certificate 45-Day Expiry Alert Dashboard'}
              </span>
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-black">
                {alertsCount}
              </span>
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              {lang === 'gu'
                ? 'દરેક હોર્ડિંગનું સ્ટેબિલિટી સર્ટિફિકેટ એક્સપાયર થવાના ૪૫ દિવસ પહેલાં સિસ્ટમ લાલ એલર્ટ ફ્લેશ કરશે.'
                : 'System triggers red alert badges for certificates expiring within 45 days or past expiry.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setFilterAlertsOnly(!filterAlertsOnly)}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors border shrink-0 ${
            filterAlertsOnly
              ? 'bg-red-600 text-white border-red-700 shadow-xs'
              : 'bg-white text-red-800 border-red-300 hover:bg-red-100'
          }`}
        >
          {filterAlertsOnly
            ? lang === 'gu'
              ? 'તમામ સર્ટિફિકેટ્સ બતાવો'
              : 'Show All Certificates'
            : lang === 'gu'
            ? 'માત્ર ૪૫-દિવસ એલર્ટ્સ બતાવો'
            : 'Filter <=45 Days Alerts Only'}
        </button>
      </div>

      {/* Search & Action Bar with Agency & Location Dropdowns */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'gu'
                  ? 'સર્ટિફિકેટ નં, હોર્ડિંગ કે ઇજનેરનું નામ શોધો...'
                  : 'Search certificate, hoarding, engineer...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs md:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Agency Dropdown Filter */}
          <select
            value={selectedAgencyFilter}
            onChange={(e) => {
              setSelectedAgencyFilter(e.target.value);
              setSelectedLocationFilter('ALL'); // Reset location when agency changes
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-700 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">
              {lang === 'gu' ? 'તમામ એજન્સીઓ (All Agencies)' : 'All Agencies'}
            </option>
            {uniqueAgencies.map((agency) => (
              <option key={agency} value={agency}>
                {agency}
              </option>
            ))}
          </select>

          {/* Agency-Wise Hoarding Location Dropdown Filter */}
          <select
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-700 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">
              {lang === 'gu' ? 'તમામ લોકેશન / સ્થળ (All Locations)' : 'All Locations'}
            </option>
            {filteredLocations.map((loc) => (
              <option key={loc} value={loc}>
                📍 {loc}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs md:text-sm px-4 py-2 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'gu' ? 'નવું સર્ટિફિકેટ ઉમેરો' : 'Add Stability Certificate'}</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{lang === 'gu' ? 'સર્ટિફિકેટ નંબર' : 'Certificate No'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'હોર્ડિંગ & એજન્સી' : 'Hoarding & Agency'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'લોકેશન (સ્થળ)' : 'Hoarding Location'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'સ્ટ્રક્ચરલ ઇજનેર' : 'Structural Engineer'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'ઇશ્યુ તારીખ' : 'Issue Date'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'વેલિડ તારીખ (Expiry)' : 'Valid Until Date'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? '૪૫-દિવસ એલર્ટ સ્ટેટસ' : '45-Day Alert Status'}</th>
                <th className="px-4 py-3 text-right">{lang === 'gu' ? 'નવીનીકરણ' : 'Renew / Edit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    {lang === 'gu' ? 'કોઈ સ્ટેબિલિટી સર્ટિફિકેટ મળ્યું નથી.' : 'No stability certificates found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((cert) => {
                  const hoardingObj = hoardings.find((h) => h.id === cert.hoardingId);
                  const displayLocation = cert.location || (hoardingObj ? hoardingObj.location : '');

                  return (
                    <tr
                      key={cert.id}
                      className={`transition-colors ${
                        cert.isAlertActive ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Cert No */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{cert.certificateNo}</span>
                        </div>
                      </td>

                      {/* Hoarding & Agency */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 font-mono">{cert.hoardingNo}</div>
                        <div className="text-xs text-slate-500">{cert.agencyName}</div>
                      </td>

                      {/* Location Column */}
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-start gap-1 font-medium text-slate-800 max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{displayLocation || '-'}</span>
                        </div>
                      </td>

                    {/* Engineer */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-slate-800">{cert.engineerName}</div>
                      <div className="text-slate-500 font-mono">Lic: {cert.engineerLicenseNo || 'N/A'}</div>
                    </td>

                    {/* Issue Date */}
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                      {cert.issueDate}
                    </td>

                    {/* Valid Until */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">
                      {cert.validUntilDate}
                    </td>

                    {/* 45-Day Alert Status Badge */}
                    <td className="px-4 py-3">
                      {cert.daysRemaining < 0 ? (
                        <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs px-2.5 py-1 rounded-md font-extrabold border border-red-700 shadow-2xs animate-pulse">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          {lang === 'gu'
                            ? `એક્સપાયર થઈ ગયું (${Math.abs(cert.daysRemaining)} દિવસ)`
                            : `Expired (${Math.abs(cert.daysRemaining)} days ago)`}
                        </span>
                      ) : cert.daysRemaining <= 45 ? (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 text-xs px-2.5 py-1 rounded-md font-black border border-amber-600 shadow-2xs">
                          <ShieldAlert className="w-3.5 h-3.5 text-slate-900" />
                          {lang === 'gu'
                            ? `ચેતવણી! માત્ર ${cert.daysRemaining} દિવસ બાકી`
                            : `ALERT! Only ${cert.daysRemaining} Days Left`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-bold border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {lang === 'gu'
                            ? `વેલિડ (${cert.daysRemaining} દિવસ)`
                            : `Valid (${cert.daysRemaining} days left)`}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(cert)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
                      >
                        <RefreshCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'gu' ? 'નવીનીકરણ / અપડેટ' : 'Renew / Edit'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Certificate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              {editingCert
                ? lang === 'gu'
                  ? 'સ્ટેબિલિટી સર્ટિફિકેટ નવીનીકરણ'
                  : 'Renew Stability Certificate'
                : lang === 'gu'
                ? 'નવું સર્ટિફિકેટ નોંધો'
                : 'Add Stability Certificate'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Agency Filter for Hoarding Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'એજન્સી ફિલ્ટર (મરજિયાત):' : 'Filter by Agency:'}
                  </label>
                  <select
                    disabled={!!editingCert}
                    value={modalAgencyFilter}
                    onChange={(e) => {
                      const newAg = e.target.value;
                      setModalAgencyFilter(newAg);
                      const matchingHoardings = hoardings.filter(
                        (h) => newAg === 'ALL' || h.agencyName === newAg
                      );
                      if (matchingHoardings.length > 0 && !matchingHoardings.some((h) => h.id === hoardingId)) {
                        setHoardingId(matchingHoardings[0].id);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="ALL">
                      {lang === 'gu' ? 'તમામ એજન્સીઓ (All Agencies)' : 'All Agencies'}
                    </option>
                    {uniqueAgencies.map((agency) => (
                      <option key={agency} value={agency}>
                        {agency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'હોર્ડિંગ નં & લોકેશન પસંદ કરો *' : 'Select Hoarding & Location *'}
                  </label>
                  <select
                    disabled={!!editingCert}
                    value={hoardingId}
                    onChange={(e) => setHoardingId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    {hoardings
                      .filter((h) => modalAgencyFilter === 'ALL' || h.agencyName === modalAgencyFilter)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.hoardingNo} — 📍 {h.location} ({h.agencyName})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Live Selected Hoarding Info Card */}
              {(() => {
                const selectedH = hoardings.find((h) => h.id === hoardingId);
                if (!selectedH) return null;
                return (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-950 space-y-1">
                    <div className="font-bold flex items-center justify-between">
                      <span className="font-mono text-blue-900">{selectedH.hoardingNo}</span>
                      <span className="bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded text-[11px]">
                        {selectedH.agencyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold">{selectedH.location || 'N/A'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>{selectedH.tpNumber} | {selectedH.fpRsNumber}</span>
                      <span>{selectedH.width}x{selectedH.length} ft</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'સર્ટિફિકેટ નંબર *' : 'Certificate Number *'}
                </label>
                <input
                  type="text"
                  required
                  value={certificateNo}
                  onChange={(e) => setCertificateNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'ઇજનેરનું નામ *' : 'Engineer Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'લાઇસન્સ નંબર:' : 'Engineer License No:'}
                  </label>
                  <input
                    type="text"
                    value={engineerLicenseNo}
                    onChange={(e) => setEngineerLicenseNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'ઇશ્યુ તારીખ *' : 'Issue Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'વેલિડ તારીખ (Expiry Date) *' : 'Valid Until Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                >
                  {lang === 'gu' ? 'કેન્સલ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  {lang === 'gu' ? 'સેવ કરો' : 'Save Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
