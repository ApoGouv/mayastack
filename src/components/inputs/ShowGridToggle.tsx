import React from "react";

interface ShowGridToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const ShowGridToggle: React.FC<ShowGridToggleProps> = ({ value, onChange }) => {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input
        type="checkbox"
        checked={value}
        onChange={() => onChange(!value)}
      />
      Show grid
    </label>
  );
};

export default ShowGridToggle;