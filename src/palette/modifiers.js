// Starter pigments and modifier pigments.
//
// Painterly primaries mix a wide gamut. Modifiers express warmth/coolness as
// physical dabs (the core metaphor) rather than hidden sliders: "warmer" =
// flick warm pigment into a blob.

// Classic painter's primary set — mixes most of the useful gamut.
export const STARTER_PIGMENTS = [
  { id: "cad-yellow", name: "Cadmium Yellow", rgb: [254, 236, 0] },
  { id: "ultramarine", name: "Ultramarine Blue", rgb: [25, 0, 89] },
  { id: "cad-red", name: "Cadmium Red", rgb: [227, 30, 36] },
  { id: "titanium-white", name: "Titanium White", rgb: [243, 243, 243] },
  { id: "ivory-black", name: "Ivory Black", rgb: [30, 30, 30] },
];

// Modifier pigments: dab these into a blob to shift it.
export const MODIFIER_PIGMENTS = [
  { id: "warm", name: "Warmth", rgb: [255, 170, 20] }, // warm yellow-orange
  { id: "cool", name: "Coolness", rgb: [30, 120, 220] }, // icy blue
  { id: "white", name: "Lighten", rgb: [243, 243, 243] },
  { id: "black", name: "Darken", rgb: [30, 30, 30] },
  { id: "mute", name: "Mute", rgb: [120, 110, 100] }, // gray-brown complement
];

export function pigmentById(id) {
  return (
    STARTER_PIGMENTS.find((p) => p.id === id) ||
    MODIFIER_PIGMENTS.find((p) => p.id === id) ||
    null
  );
}
