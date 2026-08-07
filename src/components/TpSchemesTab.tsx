import React, { useState } from 'react';
import { MapPin, Plus, Search, Edit, Trash2, Building, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { TpScheme, Hoarding } from '../types';
import { initialTpSchemes } from '../data/mockData';

interface TpSchemesTabProps {
  tpSchemes: TpScheme[];
  hoardings: Hoarding[];
  onAddTpScheme: (scheme: Omit<TpScheme, 'id'>) => Promise<void> | void;
  onEditTpScheme: (id: string, scheme: Partial<TpScheme>) => Promise<void> | void;
  onDeleteTpScheme: (id: string) => Promise<void> | void;
  onSeedDefaults: () => Promise<void> | void;
  lang: 'gu' | 'en';
}

export const TpSchemesTab: React.FC<TpSchemesTabProps> = ({
  tpSchemes,
  hoardings,
  onAddTpScheme,
  onEditTpScheme,
  onDeleteTpScheme,
  onSeedDefaults,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [schemeNo, setSchemeNo] = useState('');
  const [nameGu, setNameGu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [areaName, setAreaName] = useState('');
  const [remarks, setRemarks] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setSchemeNo('');
    setNameGu('');
    setNameEn('');
    setAreaName('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const openEditModal = (scheme: TpScheme) => {
    setEditingId(scheme.id);
    setSchemeNo(scheme.schemeNo || '');
    setNameGu(scheme.nameGu || '');
    setNameEn(scheme.nameEn || '');
    setAreaName(scheme.areaName || '');
    setRemarks(scheme.remarks || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameGu.trim()) {
      alert(lang === 'gu' ? 'કૃપા કરીને ટી.પી. સ્કીમનું નામ દર્શાવો' : 'Please provide TP Scheme name');
      return;
    }

    if (editingId) {
      await onEditTpScheme(editingId, {
        schemeNo: schemeNo.trim(),
        nameGu: nameGu.trim(),
        nameEn: nameEn.trim() || `TP Scheme No. ${schemeNo}`,
        areaName: areaName.trim(),
        remarks: remarks.trim(),
      });
    } else {
      await onAddTpScheme({
        schemeNo: schemeNo.trim(),
        nameGu: nameGu.trim(),
        nameEn: nameEn.trim() || `TP Scheme No. ${schemeNo}`,
        areaName: areaName.trim(),
        remarks: remarks.trim(),
        createdAt: new Date().toISOString().split('T')[0],
      });
    }

    setIsModalOpen(false);
  };

  const filteredSchemes = tpSchemes.filter((scheme) => {
    const query = searchTerm.toLowerCase();
    return (
      scheme.nameGu?.toLowerCase().includes(query) ||
      scheme.nameEn?.toLowerCase().includes(query) ||
      scheme.schemeNo?.toLowerCase().includes(query) ||
      scheme.areaName?.toLowerCase().includes(query)
    );
  });

  // Count hoardings for each scheme
  const getHoardingCountForScheme = (scheme: TpScheme) => {
    return hoardings.filter((h) => {
      if (!h.tpNumber) return false;
      return (
        h.tpNumber.toLowerCase().includes(scheme.schemeNo.toLowerCase()) ||
        h.tpNumber.toLowerCase().includes(scheme.nameGu.toLowerCase()) ||
        (scheme.areaName && h.tpNumber.toLowerCase().includes(scheme.areaName.toLowerCase()))
      );
    }).length;
  };

  return (
    <div className="space-[#1e293b] space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-indigo-600" />
            <span>{lang === 'gu' ? 'ટી.પી. સ્કીમ માસ્ટર ડિરેક્ટરી (Town Planning Schemes)' : 'T.P. Schemes Master Directory'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'gu'
              ? 'નગર રચના યોજના (ટી.પી. સ્કીમ) ની યાદીનું સંચાલન કરો. નવી ટી.પી. ઉમેરો, સુધારો કરો અથવા ડિલીટ કરો.'
              : 'Manage Surat Town Planning Schemes list. Add new schemes, update details or delete.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tpSchemes.length === 0 && (
            <button
              onClick={onSeedDefaults}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{lang === 'gu' ? '૧૮ મૂળ ટી.પી. સ્કીમ લોડ કરો' : 'Load Default 18 TP Schemes'}</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'gu' ? 'નવી ટી.પી. સ્કીમ ઉમેરો' : 'Add New TP Scheme'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-lg shadow-xs">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-950">{tpSchemes.length}</div>
            <div className="text-xs font-medium text-indigo-800">
              {lang === 'gu' ? 'કુલ રજીસ્ટર્ડ ટી.પી. સ્કીમો' : 'Total Registered TP Schemes'}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-lg shadow-xs">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-950">
              {tpSchemes.filter((s) => getHoardingCountForScheme(s) > 0).length}
            </div>
            <div className="text-xs font-medium text-emerald-800">
              {lang === 'gu' ? 'હોર્ડિંગ ધરાવતી ટી.પી. સ્કીમ' : 'TP Schemes with Active Hoardings'}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100 flex items-center gap-3">
          <div className="p-3 bg-purple-600 text-white rounded-lg shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-950">{hoardings.length}</div>
            <div className="text-xs font-medium text-purple-800">
              {lang === 'gu' ? 'કુલ લિંક થયેલ હોર્ડિંગ્સ' : 'Total Linked Hoardings'}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === 'gu'
                ? 'ટી.પી. નંબર, નામ અથવા વિસ્તાર શોધો (દા.ત. ૨૭, ઉત્રાણ, મોટા વરાછા)...'
                : 'Search TP scheme no, Gujarati name, or area...'
            }
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* TP Schemes Grid View */}
      {filteredSchemes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-200">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-700 font-semibold text-base mb-1">
            {lang === 'gu' ? 'કોઈ ટી.પી. સ્કીમ મળી નથી' : 'No TP Schemes Found'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {lang === 'gu'
              ? 'હાલમાં કોઈ ટી.પી. સ્કીમ રજીસ્ટર નથી અથવા તમારી શોધ મુજબ કોઈ મળેલ નથી.'
              : 'No TP Scheme records match your search query.'}
          </p>
          {tpSchemes.length === 0 && (
            <button
              onClick={onSeedDefaults}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{lang === 'gu' ? '૧૮ પ્રાથમિક ટી.પી. સ્કીમ ડેટા ઉમેરો' : 'Seed Initial 18 TP Schemes'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchemes.map((scheme, idx) => {
            const hrdCount = getHoardingCountForScheme(scheme);
            return (
              <div
                key={scheme.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-4 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{scheme.schemeNo ? `નં. ${scheme.schemeNo}` : `નં. ${idx + 1}`}</span>
                    </span>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        hrdCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {hrdCount} {lang === 'gu' ? 'હોર્ડિંગ્સ' : 'Hoardings'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{scheme.nameGu}</h3>
                  {scheme.nameEn && (
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{scheme.nameEn}</p>
                  )}

                  {scheme.areaName && (
                    <div className="mt-2.5 text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">વિસ્તાર (Area):</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-medium">
                        {scheme.areaName}
                      </span>
                    </div>
                  )}

                  {scheme.remarks && (
                    <p className="mt-2 text-xs text-slate-500 italic bg-amber-50/60 border border-amber-100 p-2 rounded-lg">
                      {scheme.remarks}
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">ID: {scheme.id}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(scheme)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      title={lang === 'gu' ? 'સુધારો કરો (Edit)' : 'Edit Scheme'}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            lang === 'gu'
                              ? `શું તમે ખરેખર "${scheme.nameGu}" ટી.પી. સ્કીમ ડિલીટ કરવા માંગો છો?`
                              : `Are you sure you want to delete ${scheme.nameGu}?`
                          )
                        ) {
                          onDeleteTpScheme(scheme.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      title={lang === 'gu' ? 'ડિલીટ કરો (Delete)' : 'Delete Scheme'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span>
                {editingId
                  ? lang === 'gu'
                    ? 'ટી.પી. સ્કીમ વિગતમાં સુધારો કરો'
                    : 'Edit TP Scheme Details'
                  : lang === 'gu'
                  ? 'નવી ટી.પી. સ્કીમ ઉમેરો'
                  : 'Add New TP Scheme'}
              </span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'gu' ? 'ટી.પી. સ્કીમ નંબર (Scheme No)' : 'TP Scheme Number'}
                </label>
                <input
                  type="text"
                  value={schemeNo}
                  onChange={(e) => setSchemeNo(e.target.value)}
                  placeholder="દા.ત. ૨૭ અથવા 27"
                  className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'gu' ? 'ગુજરાતીમાં પૂરું નામ (Gujarati Name) *' : 'Full Name (Gujarati) *'}
                </label>
                <input
                  type="text"
                  required
                  value={nameGu}
                  onChange={(e) => setNameGu(e.target.value)}
                  placeholder="દા.ત. ટી.પી. સ્કીમ નં. ૨૭ (ઉત્રાણ-કોસાડ)"
                  className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'gu' ? 'અંગ્રેજીમાં નામ (English Name)' : 'Name (English)'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. TP Scheme No. 27 (Utran-Kosad)"
                  className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'gu' ? 'વિસ્તાર/વિલેજ (Area / Village Name)' : 'Area / Village Name'}
                </label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="દા.ત. ઉત્રાણ-કોસાડ, મોટા વરાછા, સીમાડા"
                  className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'gu' ? 'રીમાર્ક્સ / નોંધ (Remarks)' : 'Remarks'}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="કોઈ વધારાની માહિતી અથવા નોંધ..."
                  className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  {lang === 'gu' ? 'રદ કરો' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                >
                  {editingId
                    ? lang === 'gu'
                      ? 'સુધારો સાચવો'
                      : 'Update Scheme'
                    : lang === 'gu'
                    ? 'ઉમેરો'
                    : 'Save Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
