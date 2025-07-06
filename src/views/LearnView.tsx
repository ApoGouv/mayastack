import { Link } from 'react-router-dom';

/**
 * LearnView provides an educational overview of the Mayan numeral system.
 * It will later include examples, symbols, and interactive explanations.
 */
export default function LearnView() {
  return (
    <div>
      <h1>📚 Learn Mayan Numerals</h1>

      <p>
        The Mayan numeral system is vigesimal (base-20) and uses three main symbols:
      </p>

      <ul>
        <li><strong>Dot (•)</strong>: represents 1</li>
        <li><strong>Bar (—)</strong>: represents 5</li>
        <li><strong>Shell (𝍠)</strong>: represents 0</li>
      </ul>

      <p>
        Numbers are stacked vertically with the lowest value at the bottom.
        For example, the number 19 would be written as three bars (15) and four dots (4).
      </p>

      <p>
        Soon this view will include interactive visualizations and animations to better understand the system.
      </p>

      <Link to="/" style={{ marginTop: '2rem', display: 'inline-block' }}>
        ← Back to Converter
      </Link>
    </div>
  );
}
