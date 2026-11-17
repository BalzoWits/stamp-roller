// Impostazioni di stampa consigliate per ogni pezzo: unica fonte per la tabella nella pagina e per i
// valori scritti nel 3MF (Metadata/model_settings.config, letto da Bambu Studio anche nei 3MF non suoi).

export const PRINT = {
  head:   { walls: 4, infill: 25, layer: 0.2, placement: 'in piedi, bracci in alto' },
  sleeve: { walls: 3, infill: 15, layer: 0.2, placement: 'col fondo sul piatto' },
  pin:    { walls: 4, infill: 100, layer: 0.2, placement: 'sdraiato sul lato piatto' },
  spacers: { walls: 4, infill: 100, layer: 0.2, placement: 'in piedi (sono 2)' },
  hub:    { walls: 4, infill: 40, layer: 0.2, placement: 'col bordino sul piatto' },
  tire:   { walls: 3, infill: 15, layer: 0.16, placement: 'in piedi, 20–30 mm/s' },
  roller: { walls: 4, infill: 30, layer: 0.16, placement: 'in piedi' },
};

// Chiavi di Bambu Studio / OrcaSlicer per le impostazioni del singolo oggetto.
export function bambuObjectSettings(s) {
  return {
    layer_height: String(s.layer),
    wall_loops: String(s.walls),
    sparse_infill_density: `${s.infill}%`,
    enable_support: '0',
  };
}
