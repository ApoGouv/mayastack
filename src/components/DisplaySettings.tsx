import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import ColorPicker from "@components/inputs/ColorPicker";
import ShowGridToggle from "@components/inputs/ShowGridToggle";

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
    <fieldset className="border border-gray-200 dark:border-gray-700 rounded-md py-5 px-3 space-y-4">
      <legend className="px-3 font-medium text-gray-700 dark:text-gray-300">
        SVG Display Settings
      </legend>
      <div className="flex flex-wrap items-center gap-4">
        <ColorPicker
          label="Background color:"
          value={backgroundColor}
          onChange={setBackgroundColor}
          showValue={false}
        />
        <ColorPicker
          label="Glyph color:"
          value={glyphColor}
          onChange={setGlyphColor}
          showValue={false}
        />
        <ShowGridToggle 
          label="Show Grid:"
          value={showGrid} 
          onChange={setShowGrid} 
        />
      </div>
    </fieldset>
  );
}