import React, { useState } from 'react';
import StationAutocomplete from './StationAutocomplete';
import { useNavigate } from 'react-router-dom';
import NotificationModal from './NotificationModal';

const SearchBar = () => {
  const [from, setFrom] = useState('');
  const [fromCode, setFromCode] = useState('');
  const [to, setTo] = useState('');
  const [toCode, setToCode] = useState('');
  const [date, setDate] = useState('');
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!from || !to || !date) {
      setNotification({ isOpen: true, title: 'Missing Fields', message: 'Please fill in all fields', type: 'warning' });
      return;
    }
    // send station codes to results when available
    navigate('/results', {
      state: { from: fromCode || from, to: toCode || to, date }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-gray-700">Search Trains</h2>

      <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
        <StationAutocomplete
          value={from}
          onChange={(v) => setFrom(v)}
          onSelect={(s) => { setFromCode(s.code); setFrom(s.name); }}
          placeholder="From Station"
        />

        <StationAutocomplete
          value={to}
          onChange={(v) => setTo(v)}
          onSelect={(s) => { setToCode(s.code); setTo(s.name); }}
          placeholder="To Station"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
      >
        Search Trains
      </button>
    </form>
    <NotificationModal
      isOpen={notification.isOpen}
      title={notification.title}
      message={notification.message}
      type={notification.type}
      onClose={() => setNotification({ ...notification, isOpen: false })}
    />
  );
};

export default SearchBar;
