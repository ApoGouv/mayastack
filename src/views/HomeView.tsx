import { useState } from 'react';
import { toBase20 } from '../utils/base20';
import MayanNumeralRenderer from '../components/MayanNumeralRenderer';

/**
 * HomeView is the main input view of the app.
 * Users enter a base-10 number, and the view displays its base-20 representation.
 */
export default function HomeView() {
  const [input, setInput] = useState('');
  const parsed = parseInt(input, 10);
  const isValid = !isNaN(parsed) && parsed >= 0;

  // Only convert if input is valid
  const base20 = isValid ? toBase20(parsed) : [];

  return (
    <div>
      <h1>🔢 Convert to Mayan Numerals</h1>

      <input
        type="number"
        value={input}
        min="0"
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter a number"
        style={{
          fontSize: '1.1rem',
          padding: '0.4rem 0.8rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          border: '1px solid #ccc',
        }}
      />

      {isValid && (
        <div>
          <h3>Base-20 Digits:</h3>
          <code style={{ fontSize: '1.2rem' }}>{base20.join(' • ')}</code>
          <h3>Mayan Numeral:</h3>
          <MayanNumeralRenderer digits={base20} />
        </div>
      )}

      {!isValid && input !== '' && (
        <p style={{ color: 'tomato' }}>⚠️ Please enter a valid non-negative integer.</p>
      )}
    </div>
  );
}
