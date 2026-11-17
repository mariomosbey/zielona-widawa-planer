/* ===== KATALOG MEBLI =====
   Wymiary w cm (szerokość × głębokość × wysokość).
   IKEA  – wymiary z kart produktów (stan wiedzy; zweryfikuj w sklepie – oznaczone ~ gdy niepewne).
   VOX   – dane WPROST z katalogów PDF pobranych z vox.pl (Meble 2026 + Tapicerka), patrz folder /katalogi.
   Agata – brak publicznego katalogu PDF (strona blokuje pobieranie) → wymiary orientacyjne, edytuj w panelu.
*/
const IKEA_SEARCH = q => 'https://www.ikea.com/pl/pl/search/?q=' + encodeURIComponent(q);
const VOX_PDF = 'https://vox-files.com/assets/_default_upload_bucket/PDF/Katalogi/VOX_MEBLE_2026_PL.pdf';
const VOX_TAP = 'https://vox-files.com/assets/_default_upload_bucket/PDF/Katalogi/TAPICERKA%202022%20VOX.pdf';
const AGATA = 'https://www.agatameble.pl/';

const CATALOG = [];
function C(brand, type, name, w, d, h, o) {
  o = o || {};
  const id = (brand + '-' + name).toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/g, '-').replace(/^-|-$/g, '') + '-' + w + 'x' + d;
  CATALOG.push(Object.assign({ id, brand, type, name, w, d, h }, o));
}
const ik = (type, name, w, d, h, o) => C('IKEA', type, name, w, d, h, Object.assign({ url: IKEA_SEARCH(name.split(' ')[0]) }, o));
const vx = (type, name, w, d, h, o) => C('VOX', type, name, w, d, h, Object.assign({ url: VOX_PDF, note: 'wg katalogu VOX Meble 2026' }, o));
const vt = (type, name, w, d, h, o) => C('VOX', type, name, w, d, h, Object.assign({ url: VOX_TAP, note: 'wg katalogu VOX Tapicerka' }, o));
const ag = (type, name, w, d, h, o) => C('Agata', type, name, w, d, h, Object.assign({ url: AGATA, approx: true, note: 'wymiary orientacyjne – sprawdź w salonie/na stronie' }, o));

/* ---------- IKEA ---------- */
// sofy
ik('sofa', 'KIVIK sofa 2-os.', 190, 95, 83, { color: '#c8bdaa', seatH: 45, arm: 24 });
ik('sofa', 'KIVIK sofa 3-os.', 228, 95, 83, { color: '#c8bdaa', seatH: 45, arm: 24 });
ik('sofa', 'SÖDERHAMN sekcja 3-os.', 186, 99, 83, { color: '#b9a58a', seatH: 44, arm: 12 });
ik('sofa', 'PÄRUP sofa 2-os.', 165, 80, 86, { color: '#8f949a', seatH: 42, arm: 14, wood: true });
ik('sofa', 'EKTORP sofa 3-os.', 218, 88, 88, { color: '#e7e3da', seatH: 44, arm: 20 });
ik('sofa', 'GLOSTAD sofa 2-os.', 144, 94, 85, { color: '#4a4d54', seatH: 43, arm: 18, approx: true });
ik('sofa', 'LANDSKRONA sofa 3-os.', 204, 89, 78, { color: '#9aa39a', seatH: 44, arm: 16, approx: true });
ik('sofa', 'VIMLE sofa 3-os.', 218, 98, 80, { color: '#a9a39a', seatH: 44, arm: 22, approx: true });
ik('sofa', 'FRIHETEN narożnik rozkładany', 230, 151, 66, { color: '#6d737b', seatH: 40, arm: 14, corner: true, approx: true });
// fotele
ik('armchair', 'POÄNG fotel', 68, 82, 100, { color: '#d9c7a3', seatH: 40, arm: 8, approx: true });
ik('armchair', 'STRANDMON fotel uszak', 82, 96, 101, { color: '#d9d2c2', seatH: 43, arm: 14, approx: true });
ik('armchair', 'EKTORP fotel', 104, 88, 88, { color: '#e7e3da', seatH: 44, arm: 20, approx: true });
// łóżka
ik('bed', 'MALM łóżko 160×200', 176, 209, 100, { color: '#e8e2d4', mattress: 160, approx: true });
ik('bed', 'MALM łóżko 140×200', 156, 209, 100, { color: '#e8e2d4', mattress: 140, approx: true });
ik('bed', 'MALM łóżko 90×200', 106, 209, 100, { color: '#e8e2d4', mattress: 90, approx: true });
ik('bed', 'Łóżko 160×200 (typowe z zagłówkiem)', 170, 210, 105, { color: '#cdbb9a', mattress: 160 });
// szafy
ik('wardrobe', 'PAX szafa 100×58×201', 100, 58, 201, { color: '#f1efea' });
ik('wardrobe', 'PAX szafa 150×58×201', 150, 58, 201, { color: '#f1efea' });
ik('wardrobe', 'PAX szafa 200×58×201', 200, 58, 201, { color: '#f1efea' });
ik('wardrobe', 'PAX szafa 100×58×236', 100, 58, 236, { color: '#f1efea' });
ik('wardrobe', 'KLEPPSTAD szafa 2-drzwiowa', 117, 55, 176, { color: '#f1efea', approx: true });
ik('wardrobe', 'BRIMNES szafa 3-drzwiowa', 117, 50, 190, { color: '#f1efea', approx: true });
// regały
ik('shelf', 'BILLY regał 80×28×202', 80, 28, 202, { color: '#e6dcc6' });
ik('shelf', 'BILLY regał 40×28×202', 40, 28, 202, { color: '#e6dcc6' });
ik('shelf', 'KALLAX regał 77×39×147', 77, 39, 147, { color: '#f1efea' });
ik('shelf', 'KALLAX regał 147×39×147', 147, 39, 147, { color: '#f1efea' });
ik('shelf', 'KALLAX regał 77×39×77', 77, 39, 77, { color: '#f1efea' });
ik('shelf', 'HEMNES regał 90×37×197', 90, 37, 197, { color: '#f1efea', approx: true });
// biurka
ik('desk', 'VIHALS biurko 125×74 + 2 monitory 24″', 125, 74, 75, { color: '#f4f4f2', monitors: true, note: 'biurko VIHALS (biały) + stojak i 2 monitory Lenovo 24″' });
ik('desk', 'VIHALS biurko 125×74', 125, 74, 75, { color: '#f4f4f2' });
ik('desk', 'MICKE biurko 105×50', 105, 50, 75, { color: '#f1efea' });
ik('desk', 'MICKE biurko 142×50', 142, 50, 75, { color: '#f1efea' });
ik('desk', 'LINNMON/ADILS biurko 120×60', 120, 60, 74, { color: '#f4f4f2', approx: true });
// krzesła
ik('chair', 'Krzesło biurowe (typowe)', 55, 55, 90, { color: '#f1efea', office: true });
ik('chair', 'ADDE krzesło', 39, 47, 77, { color: '#f4f4f2', approx: true });
// stoły
ik('table', 'EKEDALEN stół rozłożony 180×80', 180, 80, 75, { color: '#c9a875', approx: true });
ik('table', 'EKEDALEN stół 120×80', 120, 80, 75, { color: '#c9a875', approx: true });
ik('table', 'LISABO stół 140×78', 140, 78, 74, { color: '#cdb68a', approx: true });
ik('table', 'LACK stolik 90×55', 90, 55, 45, { color: '#2b2b2b' });
ik('table', 'LACK stolik 118×78', 118, 78, 45, { color: '#2b2b2b' });
// RTV / komody / stoliki
ik('tvunit', 'BESTÅ szafka RTV 180×42×38', 180, 42, 38, { color: '#e8e8e4', tv: true });
ik('tvunit', 'HEMNES szafka RTV 148×47×57', 148, 47, 57, { color: '#f1efea', tv: true, approx: true });
ik('dresser', 'MALM komoda 6 szuflad 160×48×78', 160, 48, 78, { color: '#e8e2d4' });
ik('dresser', 'MALM komoda 4 szuflady 80×48×100', 80, 48, 100, { color: '#e8e2d4' });
ik('dresser', 'HEMNES komoda 8 szuflad 160×50×96', 160, 50, 96, { color: '#f1efea', approx: true });
ik('nightstand', 'MALM szafka nocna 40×48×55', 40, 48, 55, { color: '#e8e2d4' });
ik('nightstand', 'HEMNES szafka nocna 46×35×61', 46, 35, 61, { color: '#f1efea', approx: true });
ik('nightstand', 'KULLEN komoda 3 szuflady 35×49×73', 35, 49, 73, { color: '#f1efea', approx: true });
// AGD
ik('appliance', 'Pralka (typowa 60×60×85)', 60, 60, 85, { color: '#f6f6f6', kind: 'washer' });
ik('appliance', 'Suszarka (typowa 60×64×85)', 60, 64, 85, { color: '#f6f6f6', kind: 'washer' });
ik('appliance', 'Lodówka wolnostojąca 60×65×185', 60, 65, 185, { color: '#dcdcdc', kind: 'fridge' });

/* ---------- VOX (dane z katalogu PDF 2026 + Tapicerka) ---------- */
// system Sova (łóżka) – str. katalogu: łóżko z zagłówkiem prostym płytowym s165/d204/w92,5
vx('bed', 'Sova łóżko 160×200 + zagłówek płytowy', 165, 204, 92.5, { color: '#d8c8a8', mattress: 160, note: 'wg katalogu VOX 2026 (system Sova): s165/d204/w92,5' });
vx('bed', 'Sova łóżko 140×200 + zagłówek płytowy', 145, 204, 92.5, { color: '#d8c8a8', mattress: 140, note: 's145/d204/w92,5' });
vx('bed', 'Sova łóżko 160×200 + zagłówek tapicerowany', 166.5, 214, 105, { color: '#b9b2a4', mattress: 160, note: 's166,5/d214/w105' });
vx('bed', 'Sova łóżko 120×200 + zagłówek płytowy', 125, 204, 92.5, { color: '#d8c8a8', mattress: 120, note: 's125/d204/w92,5' });
// system Stor (szafy)
vx('wardrobe', 'Stor szafa 2-drzwiowa', 103.5, 60, 229, { color: '#e9e5dc', note: 's103,5/g60/w223,5–235' });
vx('wardrobe', 'Stor szafa 3-drzwiowa', 153.5, 60, 229, { color: '#e9e5dc', note: 's153,5/g60/w223,5–235' });
vx('wardrobe', 'Szafa 3-drzwiowa 139,5×60×204', 139.5, 60, 204, { color: '#e9e5dc' });
vx('wardrobe', 'Szafa 2-drzwiowa 94,5×60×204', 94.5, 60, 204, { color: '#e9e5dc' });
vx('wardrobe', 'Szafa 3-drzwiowa 151×60×202,5', 151, 60, 202.5, { color: '#e9e5dc' });
vx('wardrobe', 'Szafa 2-drzwiowa 101×60×202,5', 101, 60, 202.5, { color: '#e9e5dc' });
vx('wardrobe', 'Szafa 4-drzwiowa 185×57×230', 185, 57, 230, { color: '#e9e5dc' });
vx('wardrobe', 'Szafa 2-drzwiowa 92,5×57×185,5', 92.5, 57, 185.5, { color: '#e9e5dc' });
// regały / RTV / komody / biurka / stoliki
vx('shelf', 'Stor regał szeroki 83,5×35×198', 83.5, 35, 198, { color: '#e9e5dc' });
vx('shelf', 'Regał szeroki 148,5×38×185,5', 148.5, 38, 185.5, { color: '#e9e5dc' });
vx('shelf', 'Regał szeroki 94,5×38×204', 94.5, 38, 204, { color: '#e9e5dc' });
vx('shelf', 'Regał wąski 54,5×38×204', 54.5, 38, 204, { color: '#e9e5dc' });
vx('tvunit', 'Szafka RTV szeroka 183,5×46×56', 183.5, 46, 56, { color: '#e9e5dc', tv: true });
vx('tvunit', 'Szafka RTV wąska 138,5×46×56', 138.5, 46, 56, { color: '#e9e5dc', tv: true });
vx('tvunit', 'Szafka RTV 179,5×40×50', 179.5, 40, 50, { color: '#e9e5dc', tv: true });
vx('tvunit', 'Szafka RTV szeroka 151×47×51,5', 151, 47, 51.5, { color: '#e9e5dc', tv: true });
vx('dresser', 'Komoda szeroka 179,5×40×72', 179.5, 40, 72, { color: '#e9e5dc' });
vx('dresser', 'Komoda z szufladami 101×47×77', 101, 47, 77, { color: '#e9e5dc' });
vx('dresser', 'Komoda z szufladami 90×47×90,5', 90, 47, 90.5, { color: '#e9e5dc' });
vx('desk', 'Biurko 123×57×75,5', 123, 57, 75.5, { color: '#e9e5dc' });
vx('desk', 'Biurko 140×65×68,5', 140, 65, 68.5, { color: '#e9e5dc' });
vx('desk', 'Biurko 130×60×75', 130, 60, 75, { color: '#e9e5dc' });
vx('table', 'Stolik kawowy 80×80×35,5', 80, 80, 35.5, { color: '#d8c8a8' });
vx('table', 'Stolik kawowy wysoki 54×54×45', 54, 54, 45, { color: '#d8c8a8', round: true });
vx('nightstand', 'Stolik nocny z szufladami 45×38×30', 45, 38, 30, { color: '#e9e5dc', note: 's45/g38/w30' });
vx('chair', 'Krzesło 43×50×86', 43, 50, 86, { color: '#d8c8a8' });
// tapicerka
vt('sofa', 'Sofa 3-os. 230×91×80', 230, 91, 80, { color: '#a99b86', seatH: 44, arm: 18 });
vt('sofa', 'Sophie sofa 2-os. 170×91×80', 170, 91, 80, { color: '#a99b86', seatH: 44, arm: 18 });
vt('sofa', 'Sofa 2-os. modułowa 196×93×75', 196, 93, 75, { color: '#8d97a3', seatH: 42, arm: 12 });
vt('sofa', 'Sofa 3-os. chesterfield 228×96×94', 228, 96, 94, { color: '#6c5a4a', seatH: 44, arm: 20 });
vt('sofa', 'Sofa 2,5-os. 194×90×87', 194, 90, 87, { color: '#a99b86', seatH: 45, arm: 20 });
vt('sofa', 'Sofa 3,5-os. 244×90×87', 244, 90, 87, { color: '#a99b86', seatH: 45, arm: 20 });
vt('sofa', 'Milton narożnik z funkcją spania 275×169×87', 275, 169, 87, { color: '#8d97a3', seatH: 45, arm: 20, corner: true });
vt('sofa', 'Narożnik z funkcją spania 234×152×90', 234, 152, 90, { color: '#8d97a3', seatH: 45, arm: 20, corner: true });
vt('sofa', 'Narożnik 229×156×92', 229, 156, 92, { color: '#a99b86', seatH: 45, arm: 18, corner: true });
vt('armchair', 'Fotel z regulowanym oparciem 88×96×94', 88, 96, 94, { color: '#6c5a4a', seatH: 44, arm: 16 });

/* ---------- Agata Meble (orientacyjnie) ---------- */
ag('sofa', 'Kanapa rozkładana 3-os. 220×100×90', 220, 100, 90, { color: '#9aa0a6', seatH: 42, arm: 18, note: 'wymiary z ogłoszenia: 220×100, siedzisko 40 cm; po rozłożeniu ok. 150 cm' });
ag('sofa', 'Narożnik NALA (orientacyjnie)', 250, 160, 90, { color: '#8f949a', seatH: 42, arm: 16, corner: true, note: 'wysokość 90 cm wg oferty; szer./głęb. orientacyjne' });
ag('sofa', 'Sofa 2-os. (orientacyjnie)', 160, 90, 85, { color: '#a69f92', seatH: 43, arm: 16 });
ag('bed', 'Łóżko 160×200 (orientacyjnie)', 168, 208, 95, { color: '#c9b896', mattress: 160 });
ag('bed', 'Łóżko kontynentalne 160×200 (orientacyjnie)', 168, 208, 110, { color: '#9aa0a6', mattress: 160 });
ag('wardrobe', 'Szafa 2-drzwiowa (orientacyjnie)', 100, 55, 200, { color: '#ece7dc' });
ag('wardrobe', 'Szafa 3-drzwiowa przesuwna (orientacyjnie)', 150, 60, 210, { color: '#ece7dc' });
ag('dresser', 'Komoda (orientacyjnie)', 120, 40, 85, { color: '#ece7dc' });
ag('table', 'Stół rozkładany (orientacyjnie)', 160, 90, 76, { color: '#c9a875' });
ag('tvunit', 'Szafka RTV (orientacyjnie)', 150, 40, 50, { color: '#ece7dc', tv: true });

/* ---------- Własne klocki ---------- */
C('Własne', 'box', 'Własny klocek 100×50×75', 100, 50, 75, { color: '#b8c7d9', custom: true });

const TYPE_LABEL = {
  sofa: 'Sofy', armchair: 'Fotele', bed: 'Łóżka', wardrobe: 'Szafy', shelf: 'Regały', desk: 'Biurka', chair: 'Krzesła',
  table: 'Stoły/stoliki', tvunit: 'RTV', dresser: 'Komody', nightstand: 'Szafki nocne', appliance: 'AGD', box: 'Klocki'
};
