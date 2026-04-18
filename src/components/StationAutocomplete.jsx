import React, { useState, useRef, useEffect } from 'react';

export default function StationAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [input, setInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => setInput(value || ''), [value]);

  const fetchSuggestions = async (q) => {
    if (!q || q.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/stations/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Stations lookup failed');
      const data = await res.json();
      setSuggestions(data || []);
      setOpen(true);
    } catch (err) {
      console.error('Station lookup error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setInput(v);
    if (onChange) onChange(v);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  const handleSelect = (station) => {
    const label = `${station.name} (${station.code})`;
    setInput(label);
    setOpen(false);
    setSuggestions([]);
    if (onChange) onChange(label);
    if (onSelect) onSelect(station);
  };

  const handleBlur = () => {
    // small timeout to allow click
    setTimeout(() => setOpen(false), 150);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder || 'Station name or code'}
        value={input}
        onChange={handleChange}
        onFocus={() => input && fetchSuggestions(input)}
        onBlur={handleBlur}
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: '1rem' }}
      />
      {open && (suggestions.length > 0 || loading) && (
        <div style={{ position: 'absolute', zIndex: 40, left: 0, right: 0, background: 'white', boxShadow: '0 8px 16px rgba(0,0,0,0.08)', borderRadius: 8, marginTop: 6, maxHeight: 220, overflow: 'auto' }}>
          {loading && <div style={{ padding: 8, color: '#6b7280' }}>Searching...</div>}
          {suggestions.map((s, i) => (
            <div key={i} onMouseDown={() => handleSelect(s)} style={{ padding: 10, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{s.code}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
