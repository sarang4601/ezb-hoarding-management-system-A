import React, { useState } from 'react';
import { Plus, Search, Building2, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { Agency } from '../types';

interface AgenciesTabProps {
  agencies: Agency[];
  onAddAgency: (agencyData: Omit<Agency, 'id' | 'agencyNo' | 'createdDate'>) => void;
  onEditAgency: (id: string, agencyData: Partial<Agency>) => void;
  onDeleteAgency: (id: string) => void;
  lang: 'gu' | 'en';
}

export const AgenciesTab: React.FC<AgenciesTabProps> = ({
  agencies,
  onAddAgency,
  onEditAgency,
  onDeleteAgency,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const openAddModal = () => {
    setEditingAgency(null);
    setName('');
    setGstNumber('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsModalOpen(true);
  };

  const openEditModal = (agency: Agency) => {
    setEditingAgency(agency);
    setName(agency.name);
    setGstNumber(agency.gstNumber);
    setContactPerson(agency.contactPerson);
    setPhone(agency.phone);
    setEmail(agency.email);
    setAddress(agency.address);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingAgency) {
      onEditAgency(editingAgency.id, { name, gstNumber, contactPerson, phone, email, address });
    } else {
      onAddAgency({ name, gstNumber, contactPerson, phone, email, address });
    }
    setIsModalOpen(false);
  };

  const filtered = agencies.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.agencyNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              lang === 'gu'
                ? 'એજન્સી શોધો (નામ, GST કે કોડ)...'
                : 'Search agencies (Name, GST, Code)...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs md:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs md:text-sm px-4 py-2 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'gu' ? 'નવી એજન્સી ઉમેરો' : 'Add New Agency'}</span>
        </button>
      </div>

      {/* Agencies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{lang === 'gu' ? 'ક્રમ / નંબર' : 'Code / ID'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'એજન્સીનું નામ' : 'Agency Name'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'GST નંબર' : 'GST Number'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'સંપર્ક વ્યક્તિ' : 'Contact Person'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'ફોન / ઈમેલ' : 'Phone / Email'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'સરનામું' : 'Address'}</th>
                <th className="px-4 py-3 text-right">{lang === 'gu' ? 'એક્શન' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    {lang === 'gu' ? 'કોઈ એજન્સી મળી નથી.' : 'No agencies found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((agency) => (
                  <tr key={agency.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {agency.agencyNo}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{agency.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {agency.gstNumber ? (
                        <span className="font-mono text-slate-700 font-semibold bg-slate-50 rounded px-1.5 py-0.5 border border-slate-200 inline-block">
                          {agency.gstNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {agency.contactPerson || '-'}
                    </td>
                    <td className="px-4 py-3 space-y-0.5 text-xs">
                      {agency.phone && (
                        <div className="flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" /> {agency.phone}
                        </div>
                      )}
                      {agency.email && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" /> {agency.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span>{agency.address || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(agency)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="એડિટ"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(lang === 'gu' ? 'શું તમે આ એજન્સી ડીલીટ કરવા માંગો છો?' : 'Delete this agency?')) {
                              onDeleteAgency(agency.id);
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="ડીલીટ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Agency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {editingAgency
                ? lang === 'gu'
                  ? 'એજન્સી વિગતો એડિટ કરો'
                  : 'Edit Agency Details'
                : lang === 'gu'
                ? 'નવી એજન્સી ઉમેરો'
                : 'Add New Agency'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'એજન્સીનું નામ *' : 'Agency Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spectrum Media Ltd"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'GST નંબર (મરજિયાત)' : 'GST Number (Optional)'}
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="24AAAAA0000A1Z5 (મરજિયાત / Optional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'સંપર્ક વ્યક્તિ:' : 'Contact Person:'}
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rajeshbhai Shah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'gu' ? 'મોબાઈલ / ફોન:' : 'Phone Number:'}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98250XXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'ઈમેલ એડ્રેસ:' : 'Email Address:'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@agency.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'gu' ? 'સરનામું:' : 'Office Address:'}
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Office address details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  {lang === 'gu' ? 'સેવ કરો' : 'Save Agency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
