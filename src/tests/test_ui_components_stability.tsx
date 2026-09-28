import React from "react";
import {
  FormulationCanvas,
  QMatrixHeatmap,
  EnergySpectrumView,
  OptimizationCopilot,
  ThemeColors,
  MathFormulationParams,
  EnergyDistributionItem
} from "@/components/optimization";

const mockColors: ThemeColors = {
  bgSection1: "#09090B",
  bgSection2: "#141417",
  bgSection3: "#0E0E11",
  bgMain: "#09090B",
  bgHeader: "#09090B",
  bgSidebar: "#09090B",
  bgEditor: "#141417",
  bgBottomDrawer: "#111114",
  bgBottomDrawerHeader: "#111114",
  bgCard: "#18181D",
  bgInput: "#09090C",
  bgPill: "#19191E",
  border: "#1E1E24",
  borderSection2: "#262630",
  borderSubtle: "#15151A",
  textPrimary: "#E2E8F0",
  textMuted: "#828E9E",
  textCyan: "#33A8DB",
  textEmerald: "#2FB885",
  textAmber: "#DEAA21",
  textSkyBlue: "#5390DD",
};

const mockParams: MathFormulationParams = {
  budgetMax: 18.0,
  yieldWeight: 1.0,
  minDiversity: 2,
  penaltyLambda: 3.5,
  hasMutualExclusion: true,
  hasCarbonCeiling: false,
  isMarkowitz: false,
};

const mockDist: EnergyDistributionItem[] = [
  { energy: -62.2, sample: { Battery_C: 1, Hydro_D: 1 }, num_occurrences: 500, bitstring: "0011" },
  { energy: -55.6, sample: { Solar_B: 1, Hydro_D: 1 }, num_occurrences: 300, bitstring: "0101" }
];

export function TestUiStability() {
  return (
    <div>
      <FormulationCanvas
        colors={mockColors}
        mathParams={mockParams}
        setMathParams={() => {}}
        selectedSection="01"
        onSelectSection={() => {}}
      />
      <QMatrixHeatmap
        colors={mockColors}
        matrix={[[-11.25, 15.7], [15.7, -9.5]]}
        variables={["Wind_A", "Solar_B"]}
        hasMutualExclusion={true}
      />
      <EnergySpectrumView
        colors={mockColors}
        distribution={mockDist}
        groundEnergy={-62.2}
        variables={["Wind_A", "Solar_B", "Battery_C", "Hydro_D"]}
      />
      <OptimizationCopilot
        colors={mockColors}
        selectedSection="02"
        onSelectSection={() => {}}
        messages={[]}
        onSendMessage={() => {}}
      />
    </div>
  );
}
