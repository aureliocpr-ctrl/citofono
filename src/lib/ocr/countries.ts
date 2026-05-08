/**
 * ISO 3166-1 alpha-3 → nome italiano del paese.
 *
 * Subset essenziale: i 60 paesi più frequenti per turismo in Italia (2026)
 * + i paesi UE/EEA. Lo standard Alloggiati Web della Polizia richiede il
 * nome in italiano dello stato di nascita / cittadinanza.
 *
 * Fonte denominazioni: lista ufficiale "Stati esteri" Polizia di Stato
 * (alloggiatiweb.poliziadistato.it/PortaleAlloggiati/static/Tabella_Stati.pdf)
 */

export interface CountryInfo {
  code3: string; // ISO 3166-1 alpha-3
  code2: string; // ISO 3166-1 alpha-2
  italianName: string;
  alloggiatiCode: string; // codice 100xxx Polizia
}

const C: CountryInfo[] = [
  { code3: 'ITA', code2: 'IT', italianName: 'ITALIA', alloggiatiCode: '100000100' },
  { code3: 'DEU', code2: 'DE', italianName: 'GERMANIA', alloggiatiCode: '100000132' },
  { code3: 'FRA', code2: 'FR', italianName: 'FRANCIA', alloggiatiCode: '100000127' },
  { code3: 'ESP', code2: 'ES', italianName: 'SPAGNA', alloggiatiCode: '100000122' },
  { code3: 'GBR', code2: 'GB', italianName: 'REGNO UNITO', alloggiatiCode: '100000219' },
  { code3: 'USA', code2: 'US', italianName: 'STATI UNITI D\'AMERICA', alloggiatiCode: '100000400' },
  { code3: 'CAN', code2: 'CA', italianName: 'CANADA', alloggiatiCode: '100000401' },
  { code3: 'CHN', code2: 'CN', italianName: 'CINA', alloggiatiCode: '100000314' },
  { code3: 'JPN', code2: 'JP', italianName: 'GIAPPONE', alloggiatiCode: '100000305' },
  { code3: 'AUS', code2: 'AU', italianName: 'AUSTRALIA', alloggiatiCode: '100000700' },
  { code3: 'NZL', code2: 'NZ', italianName: 'NUOVA ZELANDA', alloggiatiCode: '100000702' },
  { code3: 'BRA', code2: 'BR', italianName: 'BRASILE', alloggiatiCode: '100000503' },
  { code3: 'MEX', code2: 'MX', italianName: 'MESSICO', alloggiatiCode: '100000402' },
  { code3: 'ARG', code2: 'AR', italianName: 'ARGENTINA', alloggiatiCode: '100000502' },
  { code3: 'IND', code2: 'IN', italianName: 'INDIA', alloggiatiCode: '100000314' },
  { code3: 'KOR', code2: 'KR', italianName: 'COREA DEL SUD', alloggiatiCode: '100000316' },
  { code3: 'CHE', code2: 'CH', italianName: 'SVIZZERA', alloggiatiCode: '100000123' },
  { code3: 'AUT', code2: 'AT', italianName: 'AUSTRIA', alloggiatiCode: '100000133' },
  { code3: 'BEL', code2: 'BE', italianName: 'BELGIO', alloggiatiCode: '100000125' },
  { code3: 'NLD', code2: 'NL', italianName: 'PAESI BASSI', alloggiatiCode: '100000130' },
  { code3: 'LUX', code2: 'LU', italianName: 'LUSSEMBURGO', alloggiatiCode: '100000136' },
  { code3: 'IRL', code2: 'IE', italianName: 'IRLANDA', alloggiatiCode: '100000220' },
  { code3: 'PRT', code2: 'PT', italianName: 'PORTOGALLO', alloggiatiCode: '100000139' },
  { code3: 'GRC', code2: 'GR', italianName: 'GRECIA', alloggiatiCode: '100000137' },
  { code3: 'POL', code2: 'PL', italianName: 'POLONIA', alloggiatiCode: '100000146' },
  { code3: 'CZE', code2: 'CZ', italianName: 'REPUBBLICA CECA', alloggiatiCode: '100000275' },
  { code3: 'SVK', code2: 'SK', italianName: 'SLOVACCHIA', alloggiatiCode: '100000276' },
  { code3: 'HUN', code2: 'HU', italianName: 'UNGHERIA', alloggiatiCode: '100000142' },
  { code3: 'ROU', code2: 'RO', italianName: 'ROMANIA', alloggiatiCode: '100000150' },
  { code3: 'BGR', code2: 'BG', italianName: 'BULGARIA', alloggiatiCode: '100000149' },
  { code3: 'HRV', code2: 'HR', italianName: 'CROAZIA', alloggiatiCode: '100000256' },
  { code3: 'SVN', code2: 'SI', italianName: 'SLOVENIA', alloggiatiCode: '100000260' },
  { code3: 'SRB', code2: 'RS', italianName: 'SERBIA', alloggiatiCode: '100000272' },
  { code3: 'BIH', code2: 'BA', italianName: 'BOSNIA-ERZEGOVINA', alloggiatiCode: '100000252' },
  { code3: 'MNE', code2: 'ME', italianName: 'MONTENEGRO', alloggiatiCode: '100000274' },
  { code3: 'ALB', code2: 'AL', italianName: 'ALBANIA', alloggiatiCode: '100000201' },
  { code3: 'MKD', code2: 'MK', italianName: 'MACEDONIA DEL NORD', alloggiatiCode: '100000273' },
  { code3: 'TUR', code2: 'TR', italianName: 'TURCHIA', alloggiatiCode: '100000208' },
  { code3: 'ISR', code2: 'IL', italianName: 'ISRAELE', alloggiatiCode: '100000228' },
  { code3: 'EGY', code2: 'EG', italianName: 'EGITTO', alloggiatiCode: '100000605' },
  { code3: 'MAR', code2: 'MA', italianName: 'MAROCCO', alloggiatiCode: '100000602' },
  { code3: 'TUN', code2: 'TN', italianName: 'TUNISIA', alloggiatiCode: '100000603' },
  { code3: 'DZA', code2: 'DZ', italianName: 'ALGERIA', alloggiatiCode: '100000601' },
  { code3: 'LBY', code2: 'LY', italianName: 'LIBIA', alloggiatiCode: '100000604' },
  { code3: 'NOR', code2: 'NO', italianName: 'NORVEGIA', alloggiatiCode: '100000216' },
  { code3: 'SWE', code2: 'SE', italianName: 'SVEZIA', alloggiatiCode: '100000217' },
  { code3: 'FIN', code2: 'FI', italianName: 'FINLANDIA', alloggiatiCode: '100000215' },
  { code3: 'DNK', code2: 'DK', italianName: 'DANIMARCA', alloggiatiCode: '100000214' },
  { code3: 'ISL', code2: 'IS', italianName: 'ISLANDA', alloggiatiCode: '100000213' },
  { code3: 'EST', code2: 'EE', italianName: 'ESTONIA', alloggiatiCode: '100000277' },
  { code3: 'LVA', code2: 'LV', italianName: 'LETTONIA', alloggiatiCode: '100000278' },
  { code3: 'LTU', code2: 'LT', italianName: 'LITUANIA', alloggiatiCode: '100000279' },
  { code3: 'CYP', code2: 'CY', italianName: 'CIPRO', alloggiatiCode: '100000202' },
  { code3: 'MLT', code2: 'MT', italianName: 'MALTA', alloggiatiCode: '100000206' },
  { code3: 'RUS', code2: 'RU', italianName: 'RUSSIA', alloggiatiCode: '100000280' },
  { code3: 'UKR', code2: 'UA', italianName: 'UCRAINA', alloggiatiCode: '100000270' },
  { code3: 'BLR', code2: 'BY', italianName: 'BIELORUSSIA', alloggiatiCode: '100000271' },
  { code3: 'MDA', code2: 'MD', italianName: 'MOLDAVIA', alloggiatiCode: '100000269' },
  { code3: 'GEO', code2: 'GE', italianName: 'GEORGIA', alloggiatiCode: '100000266' },
  { code3: 'ARM', code2: 'AM', italianName: 'ARMENIA', alloggiatiCode: '100000264' },
  { code3: 'AZE', code2: 'AZ', italianName: 'AZERBAIGIAN', alloggiatiCode: '100000265' },
  { code3: 'KAZ', code2: 'KZ', italianName: 'KAZAKISTAN', alloggiatiCode: '100000267' },
  { code3: 'THA', code2: 'TH', italianName: 'THAILANDIA', alloggiatiCode: '100000311' },
  { code3: 'VNM', code2: 'VN', italianName: 'VIETNAM', alloggiatiCode: '100000312' },
  { code3: 'SGP', code2: 'SG', italianName: 'SINGAPORE', alloggiatiCode: '100000310' },
  { code3: 'IDN', code2: 'ID', italianName: 'INDONESIA', alloggiatiCode: '100000308' },
  { code3: 'PHL', code2: 'PH', italianName: 'FILIPPINE', alloggiatiCode: '100000309' },
  { code3: 'MYS', code2: 'MY', italianName: 'MALESIA', alloggiatiCode: '100000307' },
  { code3: 'ZAF', code2: 'ZA', italianName: 'SUDAFRICA', alloggiatiCode: '100000620' },
  { code3: 'CHL', code2: 'CL', italianName: 'CILE', alloggiatiCode: '100000506' },
  { code3: 'COL', code2: 'CO', italianName: 'COLOMBIA', alloggiatiCode: '100000507' },
  { code3: 'PER', code2: 'PE', italianName: 'PERU\'', alloggiatiCode: '100000509' },
  { code3: 'VEN', code2: 'VE', italianName: 'VENEZUELA', alloggiatiCode: '100000511' },
];

const BY_CODE3 = new Map(C.map((c) => [c.code3, c]));
const BY_CODE2 = new Map(C.map((c) => [c.code2, c]));

export function lookupByCode3(code3: string): CountryInfo | undefined {
  return BY_CODE3.get(code3.toUpperCase());
}

export function lookupByCode2(code2: string): CountryInfo | undefined {
  return BY_CODE2.get(code2.toUpperCase());
}

export function italianCountryName(code3: string): string {
  return lookupByCode3(code3)?.italianName ?? code3;
}

export function alloggiatiCountryCode(code3: string): string {
  return lookupByCode3(code3)?.alloggiatiCode ?? '100000999';
}

export const ALL_COUNTRIES: readonly CountryInfo[] = C;
