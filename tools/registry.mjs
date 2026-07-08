/**
 * PassportMap master registry.
 *
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH for which travel-document-issuing
 * entities exist in the app. The map builder, the Wikipedia scraper, the seed
 * data generator and the frontend entity list all derive from it.
 *
 * Geopolitics changes: to add a country, add a row (and, if it has territory,
 * make sure a map feature exists with a matching name — see
 * tools/build-map.mjs). To remove a country (e.g. if it dissolves), delete its
 * row and re-run `npm run build:data`. Nothing else needs to change.
 *
 * Row format: [id, name, demonym, options]
 *   id       – our own stable ID (ISO 3166-1 alpha-3 where one exists,
 *              custom codes otherwise: XKX Kosovo, NCY Northern Cyprus,
 *              SOL Somaliland, SMOM Sovereign Military Order of Malta).
 *   name     – display name.
 *   demonym  – used to derive default Wikipedia page names:
 *                visa page:     Visa_requirements_for_<demonym>_citizens
 *                passport page: <demonym>_passport
 *   options  – overrides:
 *
 *     features:   names of features in the map file that belong to this
 *                 entity (default: [name]). [] = non-territorial issuer
 *                 (shows in the left "other passports" list, e.g. SMOM).
 *     visaPage / passportPage: explicit Wikipedia page names when the
 *                 demonym-derived default is wrong.
 *     documents:  explicit list of travel documents when the entity issues
 *                 more than one (e.g. Israel) or the defaults don't fit.
 *                 Each: { id, name, visaPage, passportPage, note }
 *     recognition: 'partial' | 'minimal' — drives the "not recognized"
 *                 rendering rules and is displayed in the sidebar.
 *     facts:      short interesting facts shown in the sidebar.
 */

// Freedom-of-movement / regional blocs. `fom: true` blocs are rendered
// bright blue when both origin and destination are members.
export const BLOCS = {
  EU: {
    name: 'European Union',
    fom: true,
    members: ['AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','IRL','ITA','LVA','LTU','LUX','MLT','NLD','POL','PRT','ROU','SVK','SVN','ESP','SWE'],
  },
  EFTA: { name: 'EFTA (EEA & Switzerland)', fom: true, members: ['ISL','LIE','NOR','CHE'] },
  // EU + EFTA form one free-movement area (EEA + CH bilateral treaties).
  EUEFTA: { name: 'EU/EEA/Switzerland free movement area', fom: true, virtual: true, union: ['EU','EFTA'] },
  SCHENGEN: {
    name: 'Schengen Area',
    fom: false, // border-control zone, not itself a right-to-work regime
    members: ['AUT','BEL','BGR','HRV','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','ISL','ITA','LVA','LIE','LTU','LUX','MLT','NLD','NOR','POL','PRT','ROU','SVK','SVN','ESP','SWE','CHE'],
  },
  GCC: { name: 'Gulf Cooperation Council', fom: true, members: ['SAU','KWT','BHR','QAT','ARE','OMN'] },
  CTA: { name: 'Common Travel Area (UK–Ireland)', fom: true, members: ['GBR','IRL'] },
  TTTA: { name: 'Trans-Tasman Travel Arrangement', fom: true, members: ['AUS','NZL'] },
  CA4: { name: 'Central America Border Control Agreement (CA-4)', fom: true, members: ['GTM','SLV','HND','NIC'] },
  MERCOSUR: { name: 'Mercosur Residence Agreement', fom: true, members: ['ARG','BOL','BRA','CHL','COL','ECU','PRY','PER','URY'] },
  ECOWAS: { name: 'ECOWAS Free Movement', fom: true, members: ['BEN','BFA','CPV','CIV','GMB','GHA','GIN','GNB','LBR','MLI','NER','NGA','SEN','SLE','TGO'] },
  EAC: { name: 'East African Community', fom: true, members: ['BDI','KEN','RWA','SSD','TZA','UGA'] },
};

const R = [
  // ── Europe ─────────────────────────────────────────────────────────────
  ['ALB','Albania','Albanian'],
  ['AND','Andorra','Andorran'],
  ['AUT','Austria','Austrian'],
  ['BLR','Belarus','Belarusian'],
  ['BEL','Belgium','Belgian'],
  ['BIH','Bosnia and Herzegovina','Bosnia and Herzegovina',{features:['Bosnia and Herz.'],visaPage:'Visa_requirements_for_Bosnia_and_Herzegovina_citizens',passportPage:'Bosnia_and_Herzegovina_passport'}],
  ['BGR','Bulgaria','Bulgarian'],
  ['HRV','Croatia','Croatian'],
  ['CYP','Cyprus','Cypriot'],
  ['CZE','Czechia','Czech'],
  ['DNK','Denmark','Danish',{features:['Denmark','Greenland','Faeroe Is.']}],
  ['EST','Estonia','Estonian'],
  ['FIN','Finland','Finnish',{features:['Finland','Åland']}],
  ['FRA','France','French',{features:['France','Fr. Polynesia','New Caledonia','St. Pierre and Miquelon','Wallis and Futuna Is.','St-Martin','St-Barthélemy','Fr. S. Antarctic Lands']}],
  ['DEU','Germany','German'],
  ['GRC','Greece','Greek'],
  ['HUN','Hungary','Hungarian'],
  ['ISL','Iceland','Icelandic'],
  ['IRL','Ireland','Irish'],
  ['ITA','Italy','Italian'],
  ['XKX','Kosovo','Kosovan',{recognition:'partial',
    facts:['Kosovo declared independence in 2008 and is recognised by around 100 UN members; its passport is not accepted by several non-recognising states.']}],
  ['LVA','Latvia','Latvian'],
  ['LIE','Liechtenstein','Liechtenstein',{visaPage:'Visa_requirements_for_Liechtenstein_citizens',passportPage:'Liechtenstein_passport'}],
  ['LTU','Lithuania','Lithuanian'],
  ['LUX','Luxembourg','Luxembourgish',{passportPage:'Luxembourgish_passport'}],
  ['MLT','Malta','Maltese'],
  ['MDA','Moldova','Moldovan'],
  ['MCO','Monaco','Monégasque',{visaPage:'Visa_requirements_for_Mon%C3%A9gasque_citizens',passportPage:'Monegasque_passport'}],
  ['MNE','Montenegro','Montenegrin'],
  ['NLD','Netherlands','Dutch',{features:['Netherlands','Aruba','Curaçao','Sint Maarten']}],
  ['MKD','North Macedonia','Macedonian',{features:['Macedonia'],visaPage:'Visa_requirements_for_North_Macedonian_citizens',passportPage:'North_Macedonian_passport'}],
  ['NOR','Norway','Norwegian'],
  ['POL','Poland','Polish'],
  ['PRT','Portugal','Portuguese'],
  ['ROU','Romania','Romanian'],
  ['RUS','Russia','Russian'],
  ['SMR','San Marino','Sammarinese',{passportPage:'San_Marino_passport'}],
  ['SRB','Serbia','Serbian'],
  ['SVK','Slovakia','Slovak'],
  ['SVN','Slovenia','Slovenian'],
  ['ESP','Spain','Spanish'],
  ['SWE','Sweden','Swedish'],
  ['CHE','Switzerland','Swiss'],
  ['UKR','Ukraine','Ukrainian'],
  ['GBR','United Kingdom','British',{features:['United Kingdom','Jersey','Guernsey','Isle of Man','Bermuda','Cayman Is.','British Virgin Is.','Turks and Caicos Is.','Montserrat','Anguilla','Falkland Is.','Saint Helena','Pitcairn Is.','S. Geo. and the Is.','Br. Indian Ocean Ter.'],
    facts:['The UK issues several classes of passport beyond the ordinary British citizen passport, including British Overseas Territories citizen and British National (Overseas) passports.']}],
  ['VAT','Vatican City','Vatican',{features:['Vatican'],visaPage:'Visa_requirements_for_Vatican_citizens',passportPage:'Vatican_passport',
    facts:['The Holy See issues diplomatic and service passports; Vatican City issues ordinary passports to its few hundred citizens.']}],

  // ── Middle East ────────────────────────────────────────────────────────
  ['ARM','Armenia','Armenian'],
  ['AZE','Azerbaijan','Azerbaijani'],
  ['BHR','Bahrain','Bahraini'],
  ['IRN','Iran','Iranian'],
  ['IRQ','Iraq','Iraqi'],
  ['ISR','Israel','Israeli',{documents:[
    {id:'ISR-darkon', name:'Israeli passport (Darkon)', visaPage:'Visa_requirements_for_Israeli_citizens', passportPage:'Israeli_passport',
     note:'Regular national passport.'},
    {id:'ISR-teudat-maavar', name:"Teudat Ma'avar (travel document)", visaPage:'Visa_requirements_for_Israeli_citizens', passportPage:'Israeli_laissez-passer',
     note:'Israeli travel document (laissez-passer) issued in lieu of a passport; carries weaker visa privileges than the Darkon.'}],
    facts:['Israel issues two travel documents with different visa privileges: the regular Darkon and the Teudat Ma\'avar laissez-passer.',
           'Several states do not accept Israeli travel documents at all and bar entry to their holders.']}],
  ['JOR','Jordan','Jordanian'],
  ['KWT','Kuwait','Kuwaiti'],
  ['LBN','Lebanon','Lebanese'],
  ['OMN','Oman','Omani'],
  ['PSE','Palestine','Palestinian',{recognition:'partial',visaPage:'Visa_requirements_for_Palestinian_citizens',passportPage:'Palestinian_Authority_passport'}],
  ['QAT','Qatar','Qatari'],
  ['SAU','Saudi Arabia','Saudi'],
  ['SYR','Syria','Syrian'],
  ['TUR','Turkey','Turkish'],
  ['ARE','United Arab Emirates','Emirati'],
  ['YEM','Yemen','Yemeni'],

  // ── Africa ─────────────────────────────────────────────────────────────
  ['DZA','Algeria','Algerian'],
  ['AGO','Angola','Angolan'],
  ['BEN','Benin','Beninese'],
  ['BWA','Botswana','Botswana',{visaPage:'Visa_requirements_for_Botswana_citizens',passportPage:'Botswana_passport'}],
  ['BFA','Burkina Faso','Burkinabé',{visaPage:'Visa_requirements_for_Burkinab%C3%A9_citizens',passportPage:'Burkinab%C3%A9_passport'}],
  ['BDI','Burundi','Burundian'],
  ['CPV','Cabo Verde','Cape Verdean'],
  ['CMR','Cameroon','Cameroonian'],
  ['CAF','Central African Republic','Central African',{features:['Central African Rep.']}],
  ['TCD','Chad','Chadian'],
  ['COM','Comoros','Comorian'],
  ['COG','Congo (Republic)','Republic of the Congo',{features:['Congo'],visaPage:'Visa_requirements_for_Republic_of_the_Congo_citizens',passportPage:'Republic_of_the_Congo_passport'}],
  ['COD','Congo (DRC)','Democratic Republic of the Congo',{features:['Dem. Rep. Congo'],visaPage:'Visa_requirements_for_Democratic_Republic_of_the_Congo_citizens',passportPage:'Democratic_Republic_of_the_Congo_passport'}],
  ['CIV',"Côte d'Ivoire",'Ivorian',{features:["Côte d'Ivoire"]}],
  ['DJI','Djibouti','Djiboutian'],
  ['EGY','Egypt','Egyptian'],
  ['GNQ','Equatorial Guinea','Equatoguinean',{features:['Eq. Guinea'],visaPage:'Visa_requirements_for_Equatoguinean_citizens',passportPage:'Equatoguinean_passport'}],
  ['ERI','Eritrea','Eritrean'],
  ['SWZ','Eswatini','Swazi',{features:['eSwatini'],visaPage:'Visa_requirements_for_Swazi_citizens',passportPage:'Swazi_passport'}],
  ['ETH','Ethiopia','Ethiopian'],
  ['GAB','Gabon','Gabonese'],
  ['GMB','Gambia','Gambian'],
  ['GHA','Ghana','Ghanaian'],
  ['GIN','Guinea','Guinean'],
  ['GNB','Guinea-Bissau','Bissau-Guinean',{visaPage:'Visa_requirements_for_Bissau-Guinean_citizens',passportPage:'Bissau-Guinean_passport'}],
  ['KEN','Kenya','Kenyan'],
  ['LSO','Lesotho','Lesotho',{visaPage:'Visa_requirements_for_Lesotho_citizens',passportPage:'Lesotho_passport'}],
  ['LBR','Liberia','Liberian'],
  ['LBY','Libya','Libyan'],
  ['MDG','Madagascar','Malagasy',{visaPage:'Visa_requirements_for_Malagasy_citizens',passportPage:'Malagasy_passport'}],
  ['MWI','Malawi','Malawian'],
  ['MLI','Mali','Malian'],
  ['MRT','Mauritania','Mauritanian'],
  ['MUS','Mauritius','Mauritian'],
  ['MAR','Morocco','Moroccan'],
  ['MOZ','Mozambique','Mozambican'],
  ['NAM','Namibia','Namibian'],
  ['NER','Niger','Nigerien'],
  ['NGA','Nigeria','Nigerian'],
  ['RWA','Rwanda','Rwandan'],
  ['STP','São Tomé and Príncipe','São Toméan',{features:['São Tomé and Principe'],visaPage:'Visa_requirements_for_S%C3%A3o_Tom%C3%A9_and_Pr%C3%ADncipe_citizens',passportPage:'S%C3%A3o_Tom%C3%A9_and_Pr%C3%ADncipe_passport'}],
  ['SEN','Senegal','Senegalese'],
  ['SYC','Seychelles','Seychellois',{passportPage:'Seychellois_passport'}],
  ['SLE','Sierra Leone','Sierra Leonean'],
  ['SOM','Somalia','Somali'],
  ['SOL','Somaliland','Somaliland',{recognition:'minimal',visaPage:'Visa_requirements_for_Somaliland_citizens',passportPage:'Somaliland_passport',
    facts:['Somaliland has operated as a de facto independent state since 1991; its passport is accepted by a small number of states.']}],
  ['ZAF','South Africa','South African'],
  ['SSD','South Sudan','South Sudanese',{features:['S. Sudan']}],
  ['SDN','Sudan','Sudanese'],
  ['TZA','Tanzania','Tanzanian'],
  ['TGO','Togo','Togolese'],
  ['TUN','Tunisia','Tunisian'],
  ['UGA','Uganda','Ugandan'],
  ['ESH','Western Sahara','Sahrawi',{features:['W. Sahara'],recognition:'partial',visaPage:'Visa_requirements_for_Sahrawi_citizens',passportPage:'Sahrawi_passport',
    facts:['The Sahrawi Arab Democratic Republic is recognised by some states; most of the territory is administered by Morocco.']}],
  ['ZMB','Zambia','Zambian'],
  ['ZWE','Zimbabwe','Zimbabwean'],

  // ── Americas ───────────────────────────────────────────────────────────
  ['ATG','Antigua and Barbuda','Antigua and Barbuda',{features:['Antigua and Barb.'],visaPage:'Visa_requirements_for_Antigua_and_Barbuda_citizens',passportPage:'Antigua_and_Barbuda_passport'}],
  ['ARG','Argentina','Argentine'],
  ['BHS','Bahamas','Bahamian'],
  ['BRB','Barbados','Barbadian'],
  ['BLZ','Belize','Belizean'],
  ['BOL','Bolivia','Bolivian'],
  ['BRA','Brazil','Brazilian'],
  ['CAN','Canada','Canadian'],
  ['CHL','Chile','Chilean'],
  ['COL','Colombia','Colombian'],
  ['CRI','Costa Rica','Costa Rican'],
  ['CUB','Cuba','Cuban'],
  ['DMA','Dominica','Dominica',{visaPage:'Visa_requirements_for_Dominica_citizens',passportPage:'Dominica_passport'}],
  ['DOM','Dominican Republic','Dominican',{features:['Dominican Rep.'],visaPage:'Visa_requirements_for_Dominican_Republic_citizens',passportPage:'Dominican_Republic_passport'}],
  ['ECU','Ecuador','Ecuadorian'],
  ['SLV','El Salvador','Salvadoran'],
  ['GRD','Grenada','Grenadian'],
  ['GTM','Guatemala','Guatemalan'],
  ['GUY','Guyana','Guyanese'],
  ['HTI','Haiti','Haitian'],
  ['HND','Honduras','Honduran'],
  ['JAM','Jamaica','Jamaican'],
  ['MEX','Mexico','Mexican'],
  ['NIC','Nicaragua','Nicaraguan'],
  ['PAN','Panama','Panamanian'],
  ['PRY','Paraguay','Paraguayan'],
  ['PER','Peru','Peruvian'],
  ['KNA','Saint Kitts and Nevis','Saint Kitts and Nevis',{features:['St. Kitts and Nevis'],visaPage:'Visa_requirements_for_Saint_Kitts_and_Nevis_citizens',passportPage:'Saint_Kitts_and_Nevis_passport'}],
  ['LCA','Saint Lucia','Saint Lucian',{features:['Saint Lucia']}],
  ['VCT','Saint Vincent and the Grenadines','Saint Vincent and the Grenadines',{features:['St. Vin. and Gren.'],visaPage:'Visa_requirements_for_Saint_Vincent_and_the_Grenadines_citizens',passportPage:'Saint_Vincent_and_the_Grenadines_passport'}],
  ['SUR','Suriname','Surinamese'],
  ['TTO','Trinidad and Tobago','Trinidad and Tobago',{visaPage:'Visa_requirements_for_Trinidad_and_Tobago_citizens',passportPage:'Trinidad_and_Tobago_passport'}],
  ['USA','United States','United States',{features:['United States of America','Puerto Rico','Guam','American Samoa','U.S. Virgin Is.','N. Mariana Is.'],visaPage:'Visa_requirements_for_United_States_citizens',passportPage:'United_States_passport'}],
  ['URY','Uruguay','Uruguayan'],
  ['VEN','Venezuela','Venezuelan'],

  // ── Asia ───────────────────────────────────────────────────────────────
  ['AFG','Afghanistan','Afghan'],
  ['BGD','Bangladesh','Bangladeshi'],
  ['BTN','Bhutan','Bhutanese'],
  ['BRN','Brunei','Bruneian'],
  ['KHM','Cambodia','Cambodian'],
  ['CHN','China','Chinese',{
    facts:['The People\'s Republic of China also authorises the Hong Kong and Macao SARs to issue their own passports with separate visa regimes.']}],
  ['HKG','Hong Kong','Hong Kong',{visaPage:'Visa_requirements_for_Chinese_citizens_of_Hong_Kong',passportPage:'Hong_Kong_Special_Administrative_Region_passport',
    facts:['The HKSAR passport is issued to Chinese citizens who are permanent residents of Hong Kong and enjoys far broader visa-free access than the ordinary PRC passport.']}],
  ['MAC','Macao','Macanese',{visaPage:'Visa_requirements_for_Chinese_citizens_of_Macau',passportPage:'Macao_Special_Administrative_Region_passport'}],
  ['TWN','Taiwan','Taiwanese',{recognition:'partial',passportPage:'Taiwan_passport',
    facts:['The Republic of China (Taiwan) passport is widely accepted for travel even by states that do not maintain diplomatic relations with Taipei.']}],
  ['GEO','Georgia','Georgian',{visaPage:'Visa_requirements_for_citizens_of_Georgia',passportPage:'Georgian_passport'}],
  ['IND','India','Indian'],
  ['IDN','Indonesia','Indonesian'],
  ['JPN','Japan','Japanese'],
  ['KAZ','Kazakhstan','Kazakhstani',{passportPage:'Kazakhstani_passport'}],
  ['PRK','North Korea','North Korean'],
  ['KOR','South Korea','South Korean'],
  ['KGZ','Kyrgyzstan','Kyrgyzstani',{visaPage:'Visa_requirements_for_Kyrgyzstani_citizens',passportPage:'Kyrgyzstani_passport'}],
  ['LAO','Laos','Lao',{visaPage:'Visa_requirements_for_Lao_citizens',passportPage:'Lao_passport'}],
  ['MYS','Malaysia','Malaysian'],
  ['MDV','Maldives','Maldivian'],
  ['MNG','Mongolia','Mongolian'],
  ['MMR','Myanmar','Burmese',{features:['Myanmar']}],
  ['NPL','Nepal','Nepalese',{passportPage:'Nepalese_passport'}],
  ['PAK','Pakistan','Pakistani'],
  ['PHL','Philippines','Filipino',{visaPage:'Visa_requirements_for_Philippine_citizens',passportPage:'Philippine_passport'}],
  ['SGP','Singapore','Singaporean',{
    facts:['The Singapore passport regularly tops global passport-power rankings.']}],
  ['LKA','Sri Lanka','Sri Lankan'],
  ['TJK','Tajikistan','Tajikistani',{visaPage:'Visa_requirements_for_Tajikistani_citizens',passportPage:'Tajikistani_passport'}],
  ['THA','Thailand','Thai'],
  ['TLS','Timor-Leste','East Timorese',{features:['Timor-Leste'],visaPage:'Visa_requirements_for_East_Timorese_citizens',passportPage:'East_Timorese_passport'}],
  ['TKM','Turkmenistan','Turkmen',{visaPage:'Visa_requirements_for_Turkmen_citizens',passportPage:'Turkmen_passport'}],
  ['UZB','Uzbekistan','Uzbekistani',{visaPage:'Visa_requirements_for_Uzbekistani_citizens',passportPage:'Uzbekistani_passport'}],
  ['VNM','Vietnam','Vietnamese'],

  // ── Oceania ────────────────────────────────────────────────────────────
  ['AUS','Australia','Australian',{features:['Australia','Norfolk Island','Ashmore and Cartier Is.','Indian Ocean Ter.']}],
  ['FJI','Fiji','Fijian'],
  ['KIR','Kiribati','Kiribati',{visaPage:'Visa_requirements_for_Kiribati_citizens',passportPage:'Kiribati_passport'}],
  ['MHL','Marshall Islands','Marshallese',{features:['Marshall Is.']}],
  ['FSM','Micronesia','Micronesian',{features:['Micronesia'],visaPage:'Visa_requirements_for_Micronesian_citizens',passportPage:'Micronesian_passport'}],
  ['NRU','Nauru','Nauruan'],
  ['NZL','New Zealand','New Zealand',{features:['New Zealand','Cook Is.','Niue'],visaPage:'Visa_requirements_for_New_Zealand_citizens',passportPage:'New_Zealand_passport'}],
  ['PLW','Palau','Palauan'],
  ['PNG','Papua New Guinea','Papua New Guinean'],
  ['WSM','Samoa','Samoan'],
  ['SLB','Solomon Islands','Solomon Islands',{features:['Solomon Is.'],visaPage:'Visa_requirements_for_Solomon_Islands_citizens',passportPage:'Solomon_Islands_passport'}],
  ['TON','Tonga','Tongan'],
  ['TUV','Tuvalu','Tuvaluan'],
  ['VUT','Vanuatu','Vanuatuan',{visaPage:'Visa_requirements_for_Vanuatuan_citizens',passportPage:'Vanuatuan_passport'}],

  // ── Partially recognised / special issuers ─────────────────────────────
  ['NCY','Northern Cyprus','Northern Cypriot',{features:['N. Cyprus'],recognition:'minimal',
    visaPage:'Visa_requirements_for_Northern_Cypriot_citizens',passportPage:'Northern_Cypriot_passport',
    facts:['The Turkish Republic of Northern Cyprus is recognised only by Turkey; a handful of other states accept its passport as a travel document.']}],
  ['SMOM','Sovereign Military Order of Malta','Sovereign Military Order of Malta',{features:[],recognition:'partial',
    visaPage:'Visa_requirements_for_Sovereign_Military_Order_of_Malta_citizens',
    passportPage:'Sovereign_Military_Order_of_Malta_passport',
    facts:['The Sovereign Military Order of Malta holds no territory yet maintains diplomatic relations with over 100 states and issues one of the rarest passports in the world — only a few hundred are in circulation, mostly diplomatic.']}],
];

/** Expand the compact rows into full entity objects. */
export function buildEntities() {
  return R.map(([id, name, demonym, opt = {}]) => {
    const slug = (s) => s.replace(/ /g, '_');
    const documents = opt.documents ?? [{
      id,
      name: `${name} passport`,
      visaPage: opt.visaPage ?? `Visa_requirements_for_${slug(demonym)}_citizens`,
      passportPage: opt.passportPage ?? `${slug(demonym)}_passport`,
    }];
    return {
      id,
      name,
      demonym,
      features: opt.features ?? [name],
      recognition: opt.recognition ?? 'full',
      blocs: Object.entries(BLOCS)
        .filter(([, b]) => !b.virtual && b.members.includes(id))
        .map(([k]) => k),
      documents,
      facts: opt.facts ?? [],
    };
  });
}

export default { BLOCS, buildEntities };
