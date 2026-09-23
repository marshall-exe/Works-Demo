// Places Shams can put on the map. Coordinates checked against OpenStreetMap (Nominatim), September 2026.
// The model only ever passes ids from this list, so a pin can never land somewhere invented.

export type Region = 'Erbil' | 'Sulaymaniyah' | 'Duhok' | 'Halabja' | 'Nineveh Plains' | 'Kirkuk';
export type Place = { id: string; name: string; region: Region; lat: number; lng: number; kind: string; blurb: string };

export const PLACES: Place[] = [
  // Erbil city
  { id: 'erbil', name: 'Erbil', region: 'Erbil', lat: 36.1912, lng: 44.0094, kind: 'City', blurb: 'Capital of the Kurdistan Region, built around a citadel lived in for over 6,000 years.' },
  { id: 'erbil_citadel', name: 'Erbil Citadel', region: 'Erbil', lat: 36.1914, lng: 44.0093, kind: 'Heritage', blurb: 'UNESCO World Heritage mound at the heart of the city, with the Kurdish Textile Museum inside.' },
  { id: 'textile_museum', name: 'Kurdish Textile Museum', region: 'Erbil', lat: 36.1902, lng: 44.0101, kind: 'Museum', blurb: 'Kilims, felt and nomad weaving, inside the citadel walls.' },
  { id: 'qaysari_bazaar', name: 'Qaysari Bazaar', region: 'Erbil', lat: 36.1885, lng: 44.0092, kind: 'Market', blurb: 'Covered bazaar under the citadel: spices, honey, klash shoes and the old tea houses.' },
  { id: 'minaret_park', name: 'Mudhafaria Minaret', region: 'Erbil', lat: 36.186, lng: 44.0006, kind: 'Heritage', blurb: 'Brick minaret from the late 12th century, in Minaret Park.' },
  { id: 'sami_abdulrahman_park', name: 'Sami Abdulrahman Park', region: 'Erbil', lat: 36.1909, lng: 43.9832, kind: 'Park', blurb: 'The big city park. Evening walks, families, lakes and cafes.' },
  { id: 'jalil_khayat_mosque', name: 'Jalil Khayat Mosque', region: 'Erbil', lat: 36.2012, lng: 44.0185, kind: 'Landmark', blurb: 'Erbil’s landmark white mosque, beautiful at night.' },
  { id: 'ankawa', name: 'Ankawa', region: 'Erbil', lat: 36.2284, lng: 43.9953, kind: 'District', blurb: 'Historic Assyrian Christian district with churches, restaurants and nightlife.' },
  { id: 'erbil_airport', name: 'Erbil International Airport', region: 'Erbil', lat: 36.2335, lng: 43.9553, kind: 'Airport', blurb: 'EBL. The main gateway, with direct flights from the Gulf and Europe.' },
  // Erbil mountains
  { id: 'shaqlawa', name: 'Shaqlawa', region: 'Erbil', lat: 36.4, lng: 44.3368, kind: 'Town', blurb: 'Summer town an hour from Erbil, orchards, walnuts and cool evenings.' },
  { id: 'gali_ali_beg', name: 'Gali Ali Beg Waterfall', region: 'Erbil', lat: 36.6317, lng: 44.4458, kind: 'Nature', blurb: 'The famous waterfall in the gorge on the Hamilton Road.' },
  { id: 'bekhal', name: 'Bekhal Waterfall', region: 'Erbil', lat: 36.6178, lng: 44.4975, kind: 'Nature', blurb: 'Spring water tumbling out of the mountain, with tea stalls on the rocks.' },
  { id: 'rawanduz', name: 'Rawanduz Canyon', region: 'Erbil', lat: 36.6128, lng: 44.5275, kind: 'Nature', blurb: 'The deepest gorge on the Hamilton Road, with a viewpoint over the canyon.' },
  { id: 'korek', name: 'Korek Mountain', region: 'Erbil', lat: 36.5985, lng: 44.456, kind: 'Resort', blurb: 'Cable car to the top, views across the Soran valleys, snow in winter.' },
  { id: 'pank', name: 'Pank Resort', region: 'Erbil', lat: 36.6048, lng: 44.506, kind: 'Resort', blurb: 'Family resort above Rawanduz with rides, chalets and canyon views.' },
  { id: 'soran', name: 'Soran', region: 'Erbil', lat: 36.6555, lng: 44.5422, kind: 'Town', blurb: 'Mountain town and base for Rawanduz, Bekhal and Korek.' },
  { id: 'choman', name: 'Choman', region: 'Erbil', lat: 36.6363, lng: 44.8868, kind: 'Town', blurb: 'High valley near the Iranian border, the road to Halgurd.' },
  { id: 'halgurd', name: 'Halgurd Mountain', region: 'Erbil', lat: 36.72, lng: 44.87, kind: 'Nature', blurb: 'One of the highest peaks in Iraq, around 3,600 m. Summer treks with a guide.' },
  { id: 'shanidar', name: 'Shanidar Cave', region: 'Erbil', lat: 36.8348, lng: 44.2191, kind: 'Heritage', blurb: 'Where Neanderthal remains were found in the 1950s. A climb above the Great Zab.' },
  { id: 'barzan', name: 'Barzan', region: 'Erbil', lat: 36.9305, lng: 44.0394, kind: 'Town', blurb: 'Mountain village on the Great Zab, home of the Barzani family.' },
  { id: 'gaugamela', name: 'Gaugamela', region: 'Nineveh Plains', lat: 36.5942, lng: 43.4809, kind: 'Heritage', blurb: 'Plain near Tall Jumal where Alexander defeated Darius III in 331 BC.' },
  // Sulaymaniyah
  { id: 'sulaymaniyah', name: 'Sulaymaniyah', region: 'Sulaymaniyah', lat: 35.557, lng: 45.4426, kind: 'City', blurb: 'The cultural capital. Poets, cafes, bookshops and mountains on every side.' },
  { id: 'amna_suraka', name: 'Amna Suraka Museum', region: 'Sulaymaniyah', lat: 35.5622, lng: 45.4254, kind: 'Museum', blurb: 'The former Red Security prison, now a museum of the Anfal years. Moving and important.' },
  { id: 'slemani_museum', name: 'Slemani Museum', region: 'Sulaymaniyah', lat: 35.5573, lng: 45.4257, kind: 'Museum', blurb: 'The second-largest museum in Iraq, from prehistory to the Islamic era.' },
  { id: 'salim_street', name: 'Salim Street', region: 'Sulaymaniyah', lat: 35.5586, lng: 45.4239, kind: 'Street', blurb: 'The city’s main boulevard for evening walks, shops and cafes.' },
  { id: 'azmar', name: 'Azmar Mountain', region: 'Sulaymaniyah', lat: 35.5888, lng: 45.4934, kind: 'Nature', blurb: 'Sunset over the city, picnic spots and the road up to Chavi Land.' },
  { id: 'goizha', name: 'Goizha Mountain', region: 'Sulaymaniyah', lat: 35.5933, lng: 45.4732, kind: 'Nature', blurb: 'The mountain right above the city, hikes and viewpoints.' },
  { id: 'chavi_land', name: 'Chavi Land', region: 'Sulaymaniyah', lat: 35.5822, lng: 45.4657, kind: 'Resort', blurb: 'Cable car and park on the mountain with the whole city below.' },
  { id: 'dukan_lake', name: 'Lake Dukan', region: 'Sulaymaniyah', lat: 36.0872, lng: 44.937, kind: 'Nature', blurb: 'Big reservoir lake. Boats, swimming and lakeside resorts in summer.' },
  { id: 'dukan_dam', name: 'Dukan Dam', region: 'Sulaymaniyah', lat: 35.9537, lng: 44.9533, kind: 'Landmark', blurb: 'The dam on the Little Zab, gateway to the lake.' },
  { id: 'ranya', name: 'Ranya', region: 'Sulaymaniyah', lat: 36.2565, lng: 44.8828, kind: 'Town', blurb: 'Town on the north shore of Lake Dukan, near where the 1991 uprising began.' },
  { id: 'darbandikhan', name: 'Lake Darbandikhan', region: 'Sulaymaniyah', lat: 35.1129, lng: 45.7057, kind: 'Nature', blurb: 'Lake and dam in the south-east, fish restaurants on the shore.' },
  { id: 'penjwen', name: 'Penjwen', region: 'Sulaymaniyah', lat: 35.6222, lng: 45.9488, kind: 'Town', blurb: 'Border town known for winter snow.' },
  // Halabja
  { id: 'halabja', name: 'Halabja', region: 'Halabja', lat: 35.1792, lng: 45.9874, kind: 'City', blurb: 'City of pomegranates, and of remembrance for 16 March 1988.' },
  { id: 'halabja_monument', name: 'Halabja Monument', region: 'Halabja', lat: 35.186, lng: 45.9735, kind: 'Memorial', blurb: 'Memorial and museum for the victims of the 1988 chemical attack.' },
  { id: 'ahmad_awa', name: 'Ahmad Awa Waterfall', region: 'Halabja', lat: 35.3172, lng: 46.0903, kind: 'Nature', blurb: 'Waterfall and picnic valley under the Hawraman mountains.' },
  { id: 'byara', name: 'Byara', region: 'Halabja', lat: 35.2308, lng: 46.1206, kind: 'Village', blurb: 'Hawraman village with a historic Sufi mosque and terraced orchards.' },
  { id: 'tawela', name: 'Tawela', region: 'Halabja', lat: 35.1994, lng: 46.1861, kind: 'Village', blurb: 'Stone-terraced Hawrami village on the mountainside.' },
  // Duhok
  { id: 'duhok', name: 'Duhok', region: 'Duhok', lat: 36.8543, lng: 42.9925, kind: 'City', blurb: 'Relaxed city in a valley, with a big university and a lively centre.' },
  { id: 'duhok_dam', name: 'Duhok Dam', region: 'Duhok', lat: 36.8758, lng: 43.005, kind: 'Nature', blurb: 'Lake and park just above the city, popular at weekends.' },
  { id: 'zawita', name: 'Zawita', region: 'Duhok', lat: 36.9067, lng: 43.1469, kind: 'Nature', blurb: 'Pine forests and summer houses on the road to Amedi.' },
  { id: 'amedi', name: 'Amedi', region: 'Duhok', lat: 37.092, lng: 43.4874, kind: 'Town', blurb: 'Ancient town on top of a flat mountain, with the Mosul Gate and a lone minaret.' },
  { id: 'sulav', name: 'Sulav', region: 'Duhok', lat: 37.105, lng: 43.4833, kind: 'Resort', blurb: 'Cool summer resort in the valley below Amedi, with streams and cafes.' },
  { id: 'ashawa', name: 'Ashawa Waterfall', region: 'Duhok', lat: 37.0217, lng: 43.2915, kind: 'Nature', blurb: 'Waterfall and river picnic spot between Duhok and Amedi.' },
  { id: 'gara', name: 'Gara Mountain', region: 'Duhok', lat: 37.0176, lng: 43.3412, kind: 'Nature', blurb: 'The big mountain over Amedi, a viewpoint road and snow in winter.' },
  { id: 'lalish', name: 'Lalish Temple', region: 'Nineveh Plains', lat: 36.7715, lng: 43.303, kind: 'Heritage', blurb: 'The holiest place of the Yazidi faith. Visitors walk barefoot.' },
  { id: 'zakho', name: 'Zakho', region: 'Duhok', lat: 37.1434, lng: 42.6823, kind: 'City', blurb: 'Border city on the Khabur river, near the crossing to Turkey.' },
  { id: 'delal_bridge', name: 'Delal Bridge', region: 'Duhok', lat: 37.1361, lng: 42.6949, kind: 'Heritage', blurb: 'Old stone arch bridge over the Khabur, the icon of Zakho.' },
  { id: 'rabban_hormizd', name: 'Rabban Hormizd Monastery', region: 'Nineveh Plains', lat: 36.7491, lng: 43.1156, kind: 'Heritage', blurb: 'Monastery carved into the mountain above Alqosh, 7th century origins.' },
  { id: 'khinis', name: 'Khinis Reliefs', region: 'Nineveh Plains', lat: 36.7597, lng: 43.4195, kind: 'Heritage', blurb: 'Assyrian King Sennacherib’s rock reliefs at the head of his canal.' },
  { id: 'jerwan', name: 'Jerwan Aqueduct', region: 'Nineveh Plains', lat: 36.6699, lng: 43.3939, kind: 'Heritage', blurb: 'Sennacherib’s stone aqueduct, around 690 BC, among the oldest in the world.' },
  { id: 'akre', name: 'Akre', region: 'Duhok', lat: 36.7305, lng: 43.8749, kind: 'Town', blurb: 'Hillside town famous for the torch-lit Newroz celebration every March.' },
  { id: 'kirkuk', name: 'Kirkuk', region: 'Kirkuk', lat: 35.4719, lng: 44.3954, kind: 'City', blurb: 'Oil city with a historic citadel, outside the Kurdistan Region’s administration.' },
];

export const PLACE_IDS = PLACES.map((p) => p.id);
export const placeById = (id: string) => PLACES.find((p) => p.id === id);
