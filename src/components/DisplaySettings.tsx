import { useId } from "react";
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
    setShowGrid,
    showPlaceTierGuides,
    setShowPlaceTierGuides,
    showTierHairlines,
    setShowTierHairlines
  } = useDisplaySettings();
  const viewerGuidesHintId = useId();

  return (
    <fieldset className="border border-line rounded-md py-5 px-3 space-y-4">
      <legend className="px-3 font-medium text-fg-muted">
        Stela Material & Glyph Settings
      </legend>
      {/* What the exported SVG and PNG show */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-fg-muted">Exported appearance</legend>
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
      {/* Guides over the numeral in the viewer only, never exported */}
      <fieldset className="space-y-2" aria-describedby={viewerGuidesHintId}>
        <legend className="text-sm font-medium text-fg-muted">Viewer guides</legend>
        <p id={viewerGuidesHintId} className="text-sm text-fg-muted">
          Shown on screen only, not included in exports.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <ToggleSwitch
            label="Show Place Tier Guides:"
            value={showPlaceTierGuides}
            onChange={setShowPlaceTierGuides}
          />
          <ToggleSwitch
            label="Show Dividing Hairlines:"
            value={showTierHairlines}
            onChange={setShowTierHairlines}
          />
        </div>
      </fieldset>
    </fieldset>
  );
}