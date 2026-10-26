import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import ColorPicker from "@components/inputs/ColorPicker";
import ToggleSwitch from "@/components/inputs/ToggleSwitch";

export default function DisplaySettings() {
  const {
    backgroundColor,
    setBackgroundColor,
    glyphColor,
    setGlyphColor,
    showGrid,
    setShowGrid
  } = useDisplaySettings();

  return (
    <fieldset className="border border-line rounded-md py-5 px-3 space-y-4">
      <legend className="px-3 font-medium text-fg-muted">
        SVG Display Settings
      </legend>
      <div className="flex flex-wrap items-center gap-4">
        <ColorPicker
          id="background-color-picker-button"
          label="Background color:"
          value={backgroundColor}
          onChange={setBackgroundColor}
          showValue={false}
        />
        <ColorPicker
          id="glyph-color-picker-button"
          label="Glyph color:"
          value={glyphColor}
          onChange={setGlyphColor}
          showValue={false}
        />
        <ToggleSwitch 
          label="Show Grid:"
          value={showGrid} 
          onChange={setShowGrid} 
        />
      </div>
    </fieldset>
  );
}