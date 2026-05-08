/**
 * Codici catastali dei principali comuni italiani per il portale
 * Alloggiati Web. Top ~150 comuni per popolazione (copre ~50% della
 * popolazione italiana).
 *
 * Fonte: tabella ISTAT codici catastali aggiornata 2024.
 *
 * Il codice catastale è 4 char alfanumerici (es. "H501" per Roma).
 * Il portale Alloggiati richiede il campo ComuneNascita come 9 char
 * (codice + 5 spazi padding).
 *
 * Per comuni non in tabella, l'host deve correggere manualmente il file
 * prima di caricarlo sul portale (warning UI mostrato in advance).
 */

export interface ComuneInfo {
  /** Codice catastale 4 char (es. "H501"). */
  codice: string;
  /** Sigla provincia 2 char (es. "RM"). */
  provincia: string;
  /** Nome canonico (per UI). */
  nome: string;
}

/**
 * Tabella primaria: chiave = nome normalizzato (uppercase ASCII, no
 * diacritici, no apostrofi, spazi → underscore). Generata via normalize().
 */
const COMUNI: ComuneInfo[] = [
  { codice: 'H501', provincia: 'RM', nome: 'Roma' },
  { codice: 'F205', provincia: 'MI', nome: 'Milano' },
  { codice: 'F839', provincia: 'NA', nome: 'Napoli' },
  { codice: 'L219', provincia: 'TO', nome: 'Torino' },
  { codice: 'G273', provincia: 'PA', nome: 'Palermo' },
  { codice: 'D969', provincia: 'GE', nome: 'Genova' },
  { codice: 'A944', provincia: 'BO', nome: 'Bologna' },
  { codice: 'D612', provincia: 'FI', nome: 'Firenze' },
  { codice: 'A662', provincia: 'BA', nome: 'Bari' },
  { codice: 'C351', provincia: 'CT', nome: 'Catania' },
  { codice: 'L736', provincia: 'VE', nome: 'Venezia' },
  { codice: 'L781', provincia: 'VR', nome: 'Verona' },
  { codice: 'F158', provincia: 'ME', nome: 'Messina' },
  { codice: 'G224', provincia: 'PD', nome: 'Padova' },
  { codice: 'L424', provincia: 'TS', nome: 'Trieste' },
  { codice: 'L049', provincia: 'TA', nome: 'Taranto' },
  { codice: 'B157', provincia: 'BS', nome: 'Brescia' },
  { codice: 'G999', provincia: 'PO', nome: 'Prato' },
  { codice: 'G337', provincia: 'PR', nome: 'Parma' },
  { codice: 'H223', provincia: 'RE', nome: "Reggio nell'Emilia" },
  { codice: 'F257', provincia: 'MO', nome: 'Modena' },
  { codice: 'H224', provincia: 'RC', nome: 'Reggio Calabria' },
  { codice: 'G478', provincia: 'PG', nome: 'Perugia' },
  { codice: 'H199', provincia: 'RA', nome: 'Ravenna' },
  { codice: 'E625', provincia: 'LI', nome: 'Livorno' },
  { codice: 'B354', provincia: 'CA', nome: 'Cagliari' },
  { codice: 'D643', provincia: 'FG', nome: 'Foggia' },
  { codice: 'H294', provincia: 'RN', nome: 'Rimini' },
  { codice: 'H703', provincia: 'SA', nome: 'Salerno' },
  { codice: 'D548', provincia: 'FE', nome: 'Ferrara' },
  { codice: 'I452', provincia: 'SS', nome: 'Sassari' },
  { codice: 'E472', provincia: 'LT', nome: 'Latina' },
  { codice: 'F704', provincia: 'MB', nome: 'Monza' },
  { codice: 'I754', provincia: 'SR', nome: 'Siracusa' },
  { codice: 'G482', provincia: 'PE', nome: 'Pescara' },
  { codice: 'A794', provincia: 'BG', nome: 'Bergamo' },
  { codice: 'D704', provincia: 'FC', nome: 'Forlì' },
  { codice: 'L378', provincia: 'TN', nome: 'Trento' },
  { codice: 'L840', provincia: 'VI', nome: 'Vicenza' },
  { codice: 'L117', provincia: 'TR', nome: 'Terni' },
  { codice: 'A952', provincia: 'BZ', nome: 'Bolzano' },
  { codice: 'F952', provincia: 'NO', nome: 'Novara' },
  { codice: 'G535', provincia: 'PC', nome: 'Piacenza' },
  { codice: 'A271', provincia: 'AN', nome: 'Ancona' },
  { codice: 'A285', provincia: 'BT', nome: 'Andria' },
  { codice: 'A390', provincia: 'AR', nome: 'Arezzo' },
  { codice: 'L483', provincia: 'UD', nome: 'Udine' },
  { codice: 'C573', provincia: 'FC', nome: 'Cesena' },
  { codice: 'E506', provincia: 'LE', nome: 'Lecce' },
  { codice: 'G479', provincia: 'PU', nome: 'Pesaro' },
  { codice: 'A669', provincia: 'BT', nome: 'Barletta' },
  { codice: 'A182', provincia: 'AL', nome: 'Alessandria' },
  { codice: 'E463', provincia: 'SP', nome: 'La Spezia' },
  { codice: 'G713', provincia: 'PT', nome: 'Pistoia' },
  { codice: 'G702', provincia: 'PI', nome: 'Pisa' },
  { codice: 'C352', provincia: 'CZ', nome: 'Catanzaro' },
  { codice: 'E263', provincia: 'RM', nome: 'Guidonia Montecelio' },
  { codice: 'E715', provincia: 'LU', nome: 'Lucca' },
  { codice: 'B180', provincia: 'BR', nome: 'Brindisi' },
  { codice: 'L259', provincia: 'NA', nome: 'Torre del Greco' },
  { codice: 'L407', provincia: 'TV', nome: 'Treviso' },
  { codice: 'B300', provincia: 'VA', nome: 'Busto Arsizio' },
  { codice: 'C933', provincia: 'CO', nome: 'Como' },
  { codice: 'E974', provincia: 'TP', nome: 'Marsala' },
  { codice: 'E202', provincia: 'GR', nome: 'Grosseto' },
  { codice: 'G964', provincia: 'NA', nome: 'Pozzuoli' },
  { codice: 'L682', provincia: 'VA', nome: 'Varese' },
  { codice: 'B990', provincia: 'NA', nome: 'Casoria' },
  { codice: 'A479', provincia: 'AT', nome: 'Asti' },
  { codice: 'C707', provincia: 'MI', nome: 'Cinisello Balsamo' },
  { codice: 'D960', provincia: 'CL', nome: 'Gela' },
  { codice: 'B963', provincia: 'CE', nome: 'Caserta' },
  { codice: 'A341', provincia: 'LT', nome: 'Aprilia' },
  { codice: 'H163', provincia: 'RG', nome: 'Ragusa' },
  { codice: 'G388', provincia: 'PV', nome: 'Pavia' },
  { codice: 'D150', provincia: 'CR', nome: 'Cremona' },
  { codice: 'B819', provincia: 'MO', nome: 'Carpi' },
  { codice: 'H118', provincia: 'CA', nome: "Quartu Sant'Elena" },
  { codice: 'M208', provincia: 'CZ', nome: 'Lamezia Terme' },
  { codice: 'A225', provincia: 'BA', nome: 'Altamura' },
  { codice: 'E289', provincia: 'BO', nome: 'Imola' },
  { codice: 'A345', provincia: 'AQ', nome: "L'Aquila" },
  { codice: 'L328', provincia: 'BT', nome: 'Trani' },
  { codice: 'F023', provincia: 'MS', nome: 'Massa' },
  { codice: 'M082', provincia: 'VT', nome: 'Viterbo' },
  { codice: 'D086', provincia: 'CS', nome: 'Cosenza' },
  { codice: 'G942', provincia: 'PZ', nome: 'Potenza' },
  { codice: 'C129', provincia: 'NA', nome: 'Castellammare di Stabia' },
  { codice: 'A064', provincia: 'NA', nome: 'Afragola' },
  { codice: 'M088', provincia: 'RG', nome: 'Vittoria' },
  { codice: 'D122', provincia: 'KR', nome: 'Crotone' },
  { codice: 'L331', provincia: 'TP', nome: 'Trapani' },
  { codice: 'B832', provincia: 'MS', nome: 'Carrara' },
  { codice: 'A509', provincia: 'AV', nome: 'Avellino' },
  { codice: 'F052', provincia: 'MT', nome: 'Matera' },
  { codice: 'C349', provincia: 'CS', nome: 'Castrovillari' },
  { codice: 'H264', provincia: 'MI', nome: 'Rho' },
  { codice: 'L872', provincia: 'PV', nome: 'Vigevano' },
  { codice: 'B950', provincia: 'PI', nome: 'Cascina' },
  { codice: 'C773', provincia: 'RM', nome: 'Civitavecchia' },
  { codice: 'B519', provincia: 'CB', nome: 'Campobasso' },
  { codice: 'A089', provincia: 'AG', nome: 'Agrigento' },
  { codice: 'I483', provincia: 'SA', nome: 'Scafati' },
  { codice: 'C342', provincia: 'EN', nome: 'Enna' },
  { codice: 'B429', provincia: 'CL', nome: 'Caltanissetta' },
  { codice: 'A024', provincia: 'NA', nome: 'Acerra' },
  { codice: 'E054', provincia: 'NA', nome: 'Giugliano in Campania' },
  { codice: 'G811', provincia: 'RM', nome: 'Pomezia' },
  { codice: 'L182', provincia: 'RM', nome: 'Tivoli' },
  { codice: 'E290', provincia: 'IM', nome: 'Imperia' },
  { codice: 'I138', provincia: 'IM', nome: 'Sanremo' },
  { codice: 'F061', provincia: 'TP', nome: 'Mazara del Vallo' },
  { codice: 'A512', provincia: 'CE', nome: 'Aversa' },
  { codice: 'A783', provincia: 'BN', nome: 'Benevento' },
  { codice: 'L103', provincia: 'TE', nome: 'Teramo' },
  { codice: 'D869', provincia: 'VA', nome: 'Gallarate' },
  { codice: 'A515', provincia: 'AQ', nome: 'Avezzano' },
  { codice: 'G812', provincia: 'NA', nome: "Pomigliano d'Arco" },
  { codice: 'A323', provincia: 'RM', nome: 'Anzio' },
  { codice: 'C632', provincia: 'CH', nome: 'Chieti' },
  { codice: 'A546', provincia: 'PA', nome: 'Bagheria' },
  { codice: 'D458', provincia: 'RA', nome: 'Faenza' },
  { codice: 'L719', provincia: 'RM', nome: 'Velletri' },
  { codice: 'D810', provincia: 'FR', nome: 'Frosinone' },
  { codice: 'H282', provincia: 'RI', nome: 'Rieti' },
  { codice: 'D488', provincia: 'PU', nome: 'Fano' },
  { codice: 'E514', provincia: 'MI', nome: 'Legnano' },
  { codice: 'M297', provincia: 'RM', nome: 'Fiumicino' },
  { codice: 'F880', provincia: 'RM', nome: 'Nettuno' },
  { codice: 'L109', provincia: 'BA', nome: 'Terlizzi' },
  { codice: 'A462', provincia: 'AP', nome: 'Ascoli Piceno' },
  { codice: 'E507', provincia: 'LC', nome: 'Lecco' },
  { codice: 'A883', provincia: 'BT', nome: 'Bisceglie' },
  { codice: 'D653', provincia: 'PG', nome: 'Foligno' },
  { codice: 'A717', provincia: 'SA', nome: 'Battipaglia' },
  { codice: 'A010', provincia: 'MI', nome: 'Abbiategrasso' },
  { codice: 'F284', provincia: 'BA', nome: 'Molfetta' },
  { codice: 'G015', provincia: 'SS', nome: 'Olbia' },
  { codice: 'E885', provincia: 'FG', nome: 'Manfredonia' },
  { codice: 'G886', provincia: 'PN', nome: 'Pordenone' },
  { codice: 'I726', provincia: 'SI', nome: 'Siena' },
  { codice: 'F537', provincia: 'VV', nome: 'Vibo Valentia' },
  { codice: 'F979', provincia: 'NU', nome: 'Nuoro' },
  { codice: 'A757', provincia: 'BL', nome: 'Belluno' },
  { codice: 'E648', provincia: 'LO', nome: 'Lodi' },
  { codice: 'M109', provincia: 'PV', nome: 'Voghera' },
  { codice: 'I441', provincia: 'VA', nome: 'Saronno' },
  { codice: 'E783', provincia: 'MC', nome: 'Macerata' },
  { codice: 'E098', provincia: 'GO', nome: 'Gorizia' },
  { codice: 'L750', provincia: 'VC', nome: 'Vercelli' },
  { codice: 'A859', provincia: 'BI', nome: 'Biella' },
  { codice: 'D205', provincia: 'CN', nome: 'Cuneo' },
  { codice: 'A326', provincia: 'AO', nome: 'Aosta' },
  { codice: 'E897', provincia: 'MN', nome: 'Mantova' },
  { codice: 'I829', provincia: 'SO', nome: 'Sondrio' },
  { codice: 'I480', provincia: 'SV', nome: 'Savona' },
  { codice: 'H620', provincia: 'RO', nome: 'Rovigo' },
  { codice: 'E335', provincia: 'IS', nome: 'Isernia' },
  { codice: 'A176', provincia: 'TP', nome: 'Alcamo' },
];

/** Aliases (for misspellings or alternative names common in OCR). */
const ALIASES: Record<string, string> = {
  // OCR spesso legge nomi senza apostrofi.
  REGGIO_EMILIA: 'H223',
  REGGIO_NELL_EMILIA: 'H223',
  L_AQUILA: 'A345',
  LAQUILA: 'A345',
  QUARTU_SANT_ELENA: 'H118',
  QUARTU_SANTELENA: 'H118',
  POMIGLIANO_D_ARCO: 'G812',
  POMIGLIANO_DARCO: 'G812',
  // Forlì → senza accento
  FORLI: 'D704',
};

/** Normalizza un nome comune per il lookup. */
function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toUpperCase()
    .replace(/['']/g, '_')
    .replace(/[^A-Z0-9\s_]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/** Build the lookup map once. */
const LOOKUP = (() => {
  const m = new Map<string, ComuneInfo>();
  for (const c of COMUNI) {
    m.set(normalize(c.nome), c);
  }
  for (const [alias, codice] of Object.entries(ALIASES)) {
    const found = COMUNI.find((c) => c.codice === codice);
    if (found) m.set(alias, found);
  }
  return m;
})();

/**
 * Cerca il codice catastale di un comune italiano.
 * Restituisce undefined se non trovato (l'host dovrà correggere il file
 * Alloggiati a mano per quel guest).
 */
export function lookupComune(name: string | null | undefined): ComuneInfo | undefined {
  if (!name) return undefined;
  return LOOKUP.get(normalize(name));
}

/** Tutti i comuni in tabella (per UI di autocomplete futura). */
export function allComuni(): ComuneInfo[] {
  return [...COMUNI].sort((a, b) => a.nome.localeCompare(b.nome));
}
