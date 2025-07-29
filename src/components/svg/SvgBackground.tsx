import React from "react";

interface SvgBackgroundProps {
  fill?: string;
}

const SvgBackground: React.FC<SvgBackgroundProps> = ({
  fill = "#ddd",
}) => {

  return (
    <rect 
      x='0'
      y='0'
      width='100%'
      height='100%'
      fill={fill}
    />
  );
};

export default SvgBackground;
