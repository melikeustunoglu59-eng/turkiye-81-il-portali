import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Treemap
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const harfTemizle = (metin) => {
  if (!metin) return "";

  return metin.toString()
    .normalize('NFKD')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/i̇/g, 'i')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const kategoriTemizle = (metin) => {
  if (!metin) return "";

  return metin
    .toString()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const turkceGoster = (metin) => {
  if (!metin) return "";
  
  let formatli = metin;

  // 1. EĞER TAMAMI BÜYÜK HARF İSE -> Otomatik Olarak İlk Harfleri Büyük Yap (Title Case)
  if (!/[a-zçğıöşü]/.test(formatli)) {
    formatli = formatli.split(' ').map(kelime => {
      if (!kelime) return "";
      // İçinde parantez olan ifadeleri korumak için (Örn: "(BİNDE)")
      if (kelime.startsWith('(') && kelime.length > 1) {
        return '(' + kelime.charAt(1).toLocaleUpperCase('tr-TR') + kelime.slice(2).toLocaleLowerCase('tr-TR');
      }
      return kelime.charAt(0).toLocaleUpperCase('tr-TR') + kelime.slice(1).toLocaleLowerCase('tr-TR');
    }).join(' ');
  }

  // 2. Kapsamlı ve Tam Otomatik Türkçe Karakter Düzeltici (Tüm Site İçin)
  formatli = formatli
    // Uzun kelimeler ve özel durumlar (Önce bunlar çalışsın ki kısa kelimelerle karışmasın)
    .replace(/Arpa \(Biralik\)/g, "Arpa (Biralık)")
    .replace(/agaclarinin/g, "ağaçlarının").replace(/Agaclarinin/g, "Ağaçlarının")
    .replace(/bagimlilik/g, "bağımlılık").replace(/Bagimlilik/g, "Bağımlılık")
    .replace(/kutuphaneleri/g, "kütüphaneleri").replace(/Kutuphaneleri/g, "Kütüphaneleri")
    .replace(/Ortaogretim/g, "Ortaöğretim").replace(/ortaogretim/g, "ortaöğretim")
    .replace(/kazalarinda/g, "kazalarında").replace(/Kazalarinda/g, "Kazalarında")
    .replace(/yogunlugu/g, "yoğunluğu").replace(/Yogunlugu/g, "Yoğunluğu")
    .replace(/Gunubirlik/g, "Günübirlik").replace(/gunubirlik/g, "günübirlik")
    .replace(/Hanehalki/g, "Hanehalkı").replace(/hanehalki/g, "hanehalkı")
    .replace(/Havaalani/g, "Havaalanı").replace(/havaalani/g, "havaalanı")
    .replace(/Buyuklugu/g, "Büyüklüğü").replace(/buyuklugu/g, "büyüklüğü")
    .replace(/vatandaslar/g, "vatandaşlar").replace(/Vatandaslar/g, "Vatandaşlar")
    .replace(/yabancilar/g, "yabancılar").replace(/Yabancilar/g, "Yabancılar")
    .replace(/icindeki/g, "içindeki").replace(/Icindeki/g, "İçindeki")
    
    // Kategori, Ürün ve Cümle İçleri
    .replace(/Adacayi/g, "Adaçayı").replace(/adacayi/g, "adaçayı")
    .replace(/Aycicegi/g, "Ayçiçeği").replace(/aycicegi/g, "ayçiçeği")
    .replace(/Cerezlik/g, "Çerezlik").replace(/cerezlik/g, "çerezlik")
    .replace(/Bugdayi/g, "Buğdayı").replace(/bugdayi/g, "buğdayı")
    .replace(/Bugday/g, "Buğday").replace(/bugday/g, "buğday")
    .replace(/Celtik/g, "Çeltik").replace(/celtik/g, "çeltik")
    .replace(/Cografi/g, "Coğrafi").replace(/cografi/g, "coğrafi")
    .replace(/Faydali/g, "Faydalı").replace(/faydali/g, "faydalı")
    .replace(/Isaretli/g, "İşaretli").replace(/isaretli/g, "işaretli").replace(/İsaretli/g, "İşaretli")
    .replace(/Tasarim/g, "Tasarım").replace(/tasarim/g, "tasarım")
    .replace(/Yaglik/g, "Yağlık").replace(/yaglik/g, "yağlık")
    .replace(/Muzeler/g, "Müzeler").replace(/muzeler/g, "müzeler")
    .replace(/Ilkokul/g, "İlkokul").replace(/ilkokul/g, "ilkokul")
    .replace(/Ogrenci/g, "Öğrenci").replace(/ogrenci/g, "öğrenci")
    .replace(/Ogretmen/g, "Öğretmen").replace(/ogretmen/g, "öğretmen")
    .replace(/Ogretim/g, "Öğretim").replace(/ogretim/g, "öğretim")
    .replace(/Elemani/g, "Elemanı").replace(/elemani/g, "elemanı")
    .replace(/Docent/g, "Doçent").replace(/docent/g, "doçent")
    .replace(/Oncesi/g, "Öncesi").replace(/oncesi/g, "öncesi")
    .replace(/Cekirdek/g, "Çekirdek").replace(/cekirdek/g, "çekirdek")
    .replace(/Bosandi/g, "Boşandı").replace(/bosandi/g, "boşandı")
    .replace(/Ziyaretci/g, "Ziyaretçi").replace(/ziyaretci/g, "ziyaretçi")
    .replace(/Calisan/g, "Çalışan").replace(/calisan/g, "çalışan")
    .replace(/Isyeri/g, "İşyeri").replace(/isyeri/g, "işyeri")
    .replace(/Yarali/g, "Yaralı").replace(/yarali/g, "yaralı")
    .replace(/kazalari/g, "kazaları").replace(/Kazalari/g, "Kazaları")
    .replace(/Vatandas/g, "Vatandaş").replace(/vatandas/g, "vatandaş")
    .replace(/Yabanci/g, "Yabancı").replace(/yabanci/g, "yabancı")
    .replace(/Cikis/g, "Çıkış").replace(/cikis/g, "çıkış")
    .replace(/Giris/g, "Giriş").replace(/giris/g, "giriş")
    .replace(/Inis/g, "İniş").replace(/inis/g, "iniş")
    .replace(/kalkis/g, "kalkış").replace(/Kalkis/g, "Kalkış")
    .replace(/Ihracat/g, "İhracat").replace(/ihracat/g, "ihracat")
    .replace(/Ithalat/g, "İthalat").replace(/ithalat/g, "ithalat")
    .replace(/Islenen/g, "İşlenen").replace(/islenen/g, "işlenen")
    .replace(/kapladigi/g, "kapladığı").replace(/Kapladigi/g, "Kapladığı")
    .replace(/icecek/g, "içecek").replace(/Icecek/g, "İçecek")
    .replace(/urunler/g, "ürünler").replace(/Urunler/g, "Ürünler")
    .replace(/kullanimi/g, "kullanımı").replace(/Kullanimi/g, "Kullanımı")
    .replace(/hayvani/g, "hayvanı").replace(/Hayvani/g, "Hayvanı")
    
    // Sağlık ve Eğitim Kalanları
    .replace(/Saglik/g, "Sağlık").replace(/saglik/g, "sağlık")
    .replace(/sayilari/g, "sayıları").replace(/Sayilari/g, "Sayıları")
    .replace(/Universite/g, "Üniversite").replace(/universite/g, "üniversite")
    .replace(/Dis Hekimi/g, "Diş Hekimi").replace(/dis hekimi/g, "diş hekimi")

    // Kısa Kelimeler ve Ekler (Boşluklara ve parantezlere dikkat edilerek)
    .replace(/Aldigi/g, "Aldığı").replace(/aldigi/g, "aldığı")
    .replace(/Verdigi/g, "Verdiği").replace(/verdigi/g, "verdiği")
    .replace(/alani/g, "alanı").replace(/Alani/g, "Alanı")
    .replace(/basina/g, "başına").replace(/Basina/g, "Başına")
    .replace(/\(bas\)/g, "(baş)").replace(/\(Bas\)/g, "(Baş)")
    .replace(/Boga /g, "Boğa ").replace(/boga /g, "boğa ")
    .replace(/buzagi/g, "buzağı").replace(/Buzagi/g, "Buzağı")
    .replace(/Canli/g, "Canlı").replace(/canli/g, "canlı")
    .replace(/Cocuk/g, "Çocuk").replace(/cocuk/g, "çocuk")
    .replace(/Diger/g, "Diğer").replace(/diger/g, "diğer")
    .replace(/Dis /g, "Dış ").replace(/dis /g, "dış ")
    .replace(/disi/g, "dişi").replace(/Disi/g, "Dişi")
    .replace(/Dusuk/g, "Düşük").replace(/dusuk/g, "düşük")
    .replace(/dusen/g, "düşen").replace(/Dusen/g, "Düşen")
    .replace(/Duve/g, "Düve").replace(/duve/g, "düve")
    .replace(/esek/g, "eşek").replace(/Esek/g, "Eşek")
    .replace(/Genc/g, "Genç").replace(/genc/g, "genç")
    .replace(/Genis/g, "Geniş").replace(/genis/g, "geniş")
    .replace(/Goc/g, "Göç").replace(/goc/g, "göç")
    .replace(/gore/g, "göre").replace(/Gore/g, "Göre")
    .replace(/Gsyh/g, "GSYH")
    .replace(/Gul-/g, "Gül-").replace(/gul-/g, "gül-")
    .replace(/Haric/g, "Hariç").replace(/haric/g, "hariç")
    .replace(/Hizi/g, "Hızı").replace(/hizi/g, "hızı")
    .replace(/Ic /g, "İç ").replace(/ic /g, "iç ")
    .replace(/Ilk/g, "İlk").replace(/ilk/g, "ilk")
    .replace(/Inek/g, "İnek").replace(/inek/g, "inek")
    .replace(/katir/g, "katır").replace(/Katir/g, "Katır")
    .replace(/Keci/g, "Keçi").replace(/keci/g, "keçi")
    .replace(/kisilik/g, "kişilik").replace(/Kisilik/g, "Kişilik")
    .replace(/kisi/g, "kişi").replace(/Kisi/g, "Kişi")
    .replace(/Kiz/g, "Kız").replace(/kiz/g, "kız")
    .replace(/Kumes/g, "Kümes").replace(/kumes/g, "kümes")
    .replace(/Muze/g, "Müze").replace(/muze/g, "müze")
    .replace(/Nufus/g, "Nüfus").replace(/nufus/g, "nüfus")
    .replace(/okuz/g, "öküz").replace(/Okuz/g, "Öküz")
    .replace(/Olu /g, "Ölü ").replace(/olu /g, "ölü ")
    .replace(/olusan/g, "oluşan").replace(/Olusan/g, "Oluşan")
    .replace(/omurlu/g, "ömürlü").replace(/Omurlu/g, "Ömürlü")
    .replace(/orani/g, "oranı").replace(/Orani/g, "Oranı")
    .replace(/oren/g, "ören").replace(/Oren/g, "Ören")
    .replace(/Ozel/g, "Özel").replace(/ozel/g, "özel")
    .replace(/Payi/g, "Payı").replace(/payi/g, "payı")
    .replace(/sayisi/g, "sayısı").replace(/Sayisi/g, "Sayısı")
    .replace(/sutu/g, "sütü").replace(/Sutu/g, "Sütü")
    .replace(/Tarim/g, "Tarım").replace(/tarim/g, "tarım")
    .replace(/ucak/g, "uçak").replace(/Ucak/g, "Uçak")
    .replace(/Ulke/g, "Ülke").replace(/ulke/g, "ülke")
    .replace(/Uye/g, "Üye").replace(/uye/g, "üye")
    .replace(/uzeri/g, "üzeri").replace(/Uzeri/g, "Üzeri")
    .replace(/yas/g, "yaş").replace(/Yas/g, "Yaş")
    .replace(/Yuksek/g, "Yüksek").replace(/yuksek/g, "yüksek")
    .replace(/Turk/g, "Türk").replace(/turk/g, "türk")
    .replace(/Bag /g, "Bağ ").replace(/bag /g, "bağ ");
  
  return formatli;
};

const ANA_KATEGORILER = [
  "Araştırma ve Geliştirme",
  "Bankacılık",
  "Eğitim",
  "Ekonomi",
  "Göç",
  "Haberleşme-İletişim",
  "Hayvancılık",
  "Kültür",
  "Nüfus",
  "Sağlık",
  "Şirket",
  "Tarım",
  "Turizm",
  "Ulaşım",
  "Vergi"
];

const IBBS_DUZEY2_BOLGELERI = [
  "TR10 - İstanbul",
  "TR21 - Tekirdağ, Edirne, Kırklareli",
  "TR22 - Balıkesir, Çanakkale",
  "TR31 - İzmir",
  "TR32 - Aydın, Denizli, Muğla",
  "TR33 - Manisa, Afyonkarahisar, Kütahya, Uşak",
  "TR41 - Bursa, Eskişehir, Bilecik",
  "TR42 - Kocaeli, Sakarya, Düzce, Bolu, Yalova",
  "TR51 - Ankara",
  "TR52 - Konya, Karaman",
  "TR61 - Antalya, Isparta, Burdur",
  "TR62 - Adana, Mersin",
  "TR63 - Hatay, Kahramanmaraş, Osmaniye",
  "TR71 - Kırıkkale, Aksaray, Niğde, Nevşehir, Kırşehir",
  "TR72 - Kayseri, Sivas, Yozgat",
  "TR81 - Zonguldak, Karabük, Bartın",
  "TR82 - Kastamonu, Çankırı, Sinop",
  "TR83 - Samsun, Tokat, Çorum, Amasya",
  "TR90 - Trabzon, Ordu, Giresun, Rize, Artvin, Gümüşhane",
  "TRA1 - Erzurum, Erzincan, Bayburt",
  "TRA2 - Ağrı, Kars, Iğdır, Ardahan",
  "TRB1 - Malatya, Elazığ, Bingöl, Tunceli",
  "TRB2 - Van, Muş, Bitlis, Hakkari",
  "TRC1 - Gaziantep, Adıyaman, Kilis",
  "TRC2 - Şanlıurfa, Diyarbakır",
  "TRC3 - Mardin, Batman, Şırnak, Siirt"
];

const IBBS_DUZEY2_KODLARI = new Set(IBBS_DUZEY2_BOLGELERI.map(bolge => bolge.split(" - ")[0]));

const IL_DUZEY2_ESLESME = {
  istanbul: "TR10",
  tekirdag: "TR21", edirne: "TR21", kirklareli: "TR21",
  balikesir: "TR22", canakkale: "TR22",
  izmir: "TR31",
  aydin: "TR32", denizli: "TR32", mugla: "TR32",
  manisa: "TR33", afyonkarahisar: "TR33", kutahya: "TR33", usak: "TR33",
  bursa: "TR41", eskisehir: "TR41", bilecik: "TR41",
  kocaeli: "TR42", sakarya: "TR42", duzce: "TR42", bolu: "TR42", yalova: "TR42",
  ankara: "TR51",
  konya: "TR52", karaman: "TR52",
  antalya: "TR61", isparta: "TR61", burdur: "TR61",
  adana: "TR62", Mersin: "TR62", icel: "TR62",
  hatay: "TR63", kahramanmaras: "TR63", osmaniye: "TR63",
  kirikkale: "TR71", aksaray: "TR71", nigde: "TR71", nevsehir: "TR71", kirsehir: "TR71",
  kayseri: "TR72", sivas: "TR72", yozgat: "TR72",
  zonguldak: "TR81", karabuk: "TR81", bartin: "TR81",
  kastamonu: "TR82", cankiri: "TR82", sinop: "TR82",
  samsun: "TR83", tokat: "TR83", corum: "TR83", amasya: "TR83",
  trabzon: "TR90", ordu: "TR90", giresun: "TR90", rize: "TR90", artvin: "TR90", gumushane: "TR90",
  erzurum: "TRA1", erzincan: "TRA1", bayburt: "TRA1",
  agri: "TRA2", kars: "TRA2", igdir: "TRA2", ardahan: "TRA2",
  malatya: "TRB1", elazig: "TRB1", bingol: "TRB1", tunceli: "TRB1",
  van: "TRB2", mus: "TRB2", bitlis: "TRB2", hakkari: "TRB2",
  gaziantep: "TRC1", adiyaman: "TRC1", kilis: "TRC1",
  sanliurfa: "TRC2", diyarbakir: "TRC2",
  mardin: "TRC3", batman: "TRC3", sirnak: "TRC3", siirt: "TRC3"
};

// 2019 yılında verisi 0 olan bu iki Sağlık göstergesini yıl filtresinden çıkarır.
const SAGLIK_2019_CIKARILACAK_VERILER = new Set([
  harfTemizle("Hastane ve yatak sayilari : Diger Kamu  / Yatak Sayisi"),
  harfTemizle("Hastane ve yatak sayilari : Diger Kamu / Kurum Sayisi")
]);

// İBBS DÜZEY 1 KODLARI VE DÜZEY 2 -> DÜZEY 1 EŞLEŞMESİ
const IBBS_DUZEY1_BOLGELERI = [
  "TR1 - İstanbul",
  "TR2 - Batı Marmara",
  "TR3 - Ege",
  "TR4 - Doğu Marmara",
  "TR5 - Batı Anadolu",
  "TR6 - Akdeniz",
  "TR7 - Orta Anadolu",
  "TR8 - Batı Karadeniz",
  "TR9 - Doğu Karadeniz",
  "TRA - Kuzeydoğu Anadolu",
  "TRB - Ortadoğu Anadolu",
  "TRC - Güneydoğu Anadolu"
];

const IBBS_DUZEY1_KODLARI = new Set(IBBS_DUZEY1_BOLGELERI.map(bolge => bolge.split(" - ")[0]));

const DUZEY2_DUZEY1_ESLESME = {
  TR10: "TR1",
  TR21: "TR2", TR22: "TR2",
  TR31: "TR3", TR32: "TR3", TR33: "TR3",
  TR41: "TR4", TR42: "TR4",
  TR51: "TR5", TR52: "TR5",
  TR61: "TR6", TR62: "TR6", TR63: "TR6",
  TR71: "TR7", TR72: "TR7",
  TR81: "TR8", TR82: "TR8", TR83: "TR8",
  TR90: "TR9",
  TRA1: "TRA", TRA2: "TRA",
  TRB1: "TRB", TRB2: "TRB",
  TRC1: "TRC", TRC2: "TRC", TRC3: "TRC"
};

const IL_DUZEY1_ESLESME = Object.entries(IL_DUZEY2_ESLESME).reduce((sozluk, [il, duzey2]) => {
  const ilAnahtar = harfTemizle(il);
  if (ilAnahtar && DUZEY2_DUZEY1_ESLESME[duzey2]) {
    sozluk[ilAnahtar] = DUZEY2_DUZEY1_ESLESME[duzey2];
  }
  return sozluk;
}, {});

const D1_KAPSAM_ILLERI = IBBS_DUZEY2_BOLGELERI.reduce((sozluk, bolge) => {
  const duzey2Kod = bolge.split(" - ")[0];
  const duzey1Kod = DUZEY2_DUZEY1_ESLESME[duzey2Kod];
  const iller = bolge.split(" - ")[1] || "";
  if (!sozluk[duzey1Kod]) sozluk[duzey1Kod] = [];
  if (iller) sozluk[duzey1Kod].push(iller);
  return sozluk;
}, {});

function App() {
  const [geoData, setGeoData] = useState(null);
  const [dbVerileri, setDbVerileri] = useState([]);
  const [veriMetadata, setVeriMetadata] = useState([]);
  const [hata, setHata] = useState("");

  const [kategoriler, setKategoriler] = useState(ANA_KATEGORILER);
  const [seciliKategori, setSeciliKategori] = useState(ANA_KATEGORILER[0]);

  const [seciliVeri, setSeciliVeri] = useState("");
  const [seciliYil, setSeciliYil] = useState("");

  const [veriListesi, setVeriListesi] = useState([]);
  const [yilListesi, setYilListesi] = useState([]);

  const [haritaIlleri, setHaritaIlleri] = useState(new Set());
  const [aktifDuzey, setAktifDuzey] = useState(1);
  const [geoDuzey2Data, setGeoDuzey2Data] = useState(null);
  const [geoDuzey1Data, setGeoDuzey1Data] = useState(null);
  // YÖNETİCİ PANELİ
  const [adminModu, setAdminModu] = useState(false);
  const [mobilMenuAcik, setMobilMenuAcik] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return sessionStorage.getItem("adminToken") || "";
    } catch {
      return "";
    }
  });
  const [adminGiris, setAdminGiris] = useState({ kullaniciAdi: "", sifre: "" });
  const [adminHata, setAdminHata] = useState("");
  const [adminYukleniyor, setAdminYukleniyor] = useState(false);
  const [adminVeriler, setAdminVeriler] = useState([]);
  const [adminArama, setAdminArama] = useState("");
  const [adminForm, setAdminForm] = useState({
    il: "",
    duzey1_kod: "",
    duzey2_kod: "",
    baslik: "",
    kategori: "",
    yil: "",
    deger: ""
  });
  const [adminDuzenlenenId, setAdminDuzenlenenId] = useState(null);
  const [adminExcelDosyasi, setAdminExcelDosyasi] = useState(null);
  const [adminExcelDurum, setAdminExcelDurum] = useState("");
  const [adminExcelYukleniyor, setAdminExcelYukleniyor] = useState(false);

  // HARİTA + VERİTABANI
  useEffect(() => {

    fetch('/turkiye.json')
      .then(res => {
        if (!res.ok) {
          throw new Error("Harita dosyası yüklenemedi.");
        }
        return res.json();
      })
      .then(data => {
        setGeoData(data);
        
        if (data && data.features) {
          const illerSeti = new Set();
          data.features.forEach(feature => {
            const ad1 = harfTemizle(feature.properties?.NAME_1);
            const ad2 = harfTemizle(feature.properties?.VARNAME_1);
            if (ad1) illerSeti.add(ad1);
            if (ad2) illerSeti.add(ad2);
          });
          setHaritaIlleri(illerSeti);
        }
      })
      .catch(() => {
        setHata("Harita dosyası yüklenemedi.");
      });

    // İBBS DÜZEY 1 HARİTASI (SADECE DÜZEY 1 SEKME HARİTASI)
    fetch('https://raw.githubusercontent.com/skurmus/Turkey-Vector-Maps/master/Area/GeoJSON/IBBS1.geojson')
      .then(res => {
        if (!res.ok) {
          throw new Error("İBBS Düzey 1 haritası yüklenemedi.");
        }
        return res.json();
      })
      .then(data => setGeoDuzey1Data(data))
      .catch(() => {
        console.error("İBBS Düzey 1 haritası yüklenemedi.");
      });

    // İBBS DÜZEY 2 HARİTASI
    fetch('https://raw.githubusercontent.com/skurmus/Turkey-Vector-Maps/master/Area/GeoJSON/IBBS2.geojson')
      .then(res => {
        if (!res.ok) {
          throw new Error("İBBS Düzey 2 haritası yüklenemedi.");
        }
        return res.json();
      })
      .then(data => setGeoDuzey2Data(data))
      .catch(() => {
        console.error("İBBS Düzey 2 haritası yüklenemedi.");
      });

axios.get(`${API_URL}/api/veri-metadata`)
  .then(res => {
    const temizMetadata = res.data.map(item => ({
      orjinalKategori: item.kategori, // Veritabanındaki orijinal bozuk/boşluklu hali saklıyoruz
      kategori: kategoriTemizle(item.kategori),
      orjinalVeri: item.baslik, // Veritabanındaki orijinal bozuk/boşluklu hali saklıyoruz
      veri: item.baslik ? item.baslik.toString().trim() : "",
      yil: item.yil
    }));

    setVeriMetadata(temizMetadata);

    const bulunanKategoriler = [
      ...new Set(
        temizMetadata
          .map(item => item.kategori)
          .filter(Boolean)
      )
    ];

    const aktifKategoriler = ANA_KATEGORILER.filter(kategori =>
      bulunanKategoriler.some(
        dbKategori =>
          harfTemizle(dbKategori) === harfTemizle(kategori)
      )
    );

    setKategoriler(
      aktifKategoriler.length > 0
        ? aktifKategoriler
        : ANA_KATEGORILER
    );

    setSeciliKategori(
      aktifKategoriler.length > 0
        ? aktifKategoriler[0]
        : ANA_KATEGORILER[0]
    );
  })
  .catch(err => {
    console.error("Metadata çekme hatası:", err);
    setHata("Veri tabanına bağlanılamadı.");
  });
  }, []);

  // SEÇİLİ KATEGORİYE GÖRE VERİLER
  useEffect(() => {
    if (!seciliKategori || veriMetadata.length === 0) {
      setVeriListesi([]);
      setSeciliVeri("");
      return;
    }

    const kategoriAnahtar = harfTemizle(seciliKategori);
    const benzersizVeriler = [
      ...new Set(
        veriMetadata
          .filter(item => harfTemizle(item.kategori) === kategoriAnahtar)
          .map(item => item.veri)
          .filter(Boolean)
      )
    ];

    setVeriListesi(benzersizVeriler);

    if (!benzersizVeriler.includes(seciliVeri)) {
      setSeciliVeri(benzersizVeriler[0] || "");
    }
  }, [seciliKategori, veriMetadata]);

  // SEÇİLİ VERİYE GÖRE YILLAR
  useEffect(() => {
    if (!seciliKategori || !seciliVeri || veriMetadata.length === 0) {
      setYilListesi([]);
      setSeciliYil("");
      return;
    }

    const kategoriAnahtar = harfTemizle(seciliKategori);
    const seciliVeriAnahtar = harfTemizle(seciliVeri);
    const saglik2019Cikarilsin =
      kategoriAnahtar === harfTemizle("Sağlık") &&
      SAGLIK_2019_CIKARILACAK_VERILER.has(seciliVeriAnahtar);

    const benzersizYillar = [
      ...new Set(
        veriMetadata
          .filter(item =>
            harfTemizle(item.kategori) === kategoriAnahtar &&
            item.veri === seciliVeri
          )
          .map(item => item.yil)
          .filter(yil => yil !== null && yil !== undefined && yil !== "")
          .filter(yil => !(saglik2019Cikarilsin && String(yil) === "2019"))
      )
    ].sort((a, b) => Number(b) - Number(a));

    setYilListesi(benzersizYillar);

    if (!benzersizYillar.includes(seciliYil)) {
      setSeciliYil(benzersizYillar[0] || "");
    }
  }, [seciliVeri, seciliKategori, veriMetadata]);

  // SADECE SEÇİLİ KATEGORİ + VERİ + YIL VERİSİNİ GETİR
  useEffect(() => {
    if (!seciliKategori || !seciliVeri || !seciliYil) {
      setDbVerileri([]);
      return;
    }

    setDbVerileri([]);

    // UI'daki kategori/başlık adını veritabanındaki gerçek değerle eşleştir.
    const seciliMetadata = veriMetadata.find(item =>
      harfTemizle(item.kategori) === harfTemizle(seciliKategori) &&
      item.veri === seciliVeri &&
      String(item.yil) === String(seciliYil)
    );

    if (!seciliMetadata) {
      setDbVerileri([]);
      return;
    }

    // Backend'e soruyu trim'lenmiş haliyle değil, veritabanından aldığımız ilk orijinal (boşluklu vb.) haliyle soruyoruz ki hata vermesin
    const params = new URLSearchParams({
      kategori: seciliMetadata.orjinalKategori !== undefined ? seciliMetadata.orjinalKategori : seciliMetadata.kategori,
      baslik: seciliMetadata.orjinalVeri !== undefined ? seciliMetadata.orjinalVeri : seciliMetadata.veri,
      yil: String(seciliMetadata.yil)
    });

    axios.get(`${API_URL}/api/veriler?${params.toString()}`)
      .then(res => {
        const temizVeriler = res.data.map(item => ({
          ...item,
          kategori: kategoriTemizle(item.kategori),
          veri: item.baslik ? item.baslik.toString().trim() : (item.veri ? item.veri.toString().trim() : ""),
          il: item.il ? item.il.toString().trim() : "",
          isim: item.isim ? item.isim.toString().trim() : (item.il ? item.il.toString().trim() : ""),
          bolge_kodu: item.duzey2_kod ? item.duzey2_kod.toString().trim() : ""
        }));

        setDbVerileri(temizVeriler);
      })
      .catch(err => {
        console.error("Seçili veri çekme hatası:", err);
        setDbVerileri([]);
        setHata("Veri tabanına bağlanılamadı.");
      });
  }, [seciliKategori, seciliVeri, seciliYil]);

  // İL İSİMLERİ
  const gercekIsimSozlugu = useMemo(() => {

    const sozluk = {};

    dbVerileri.forEach(v => {

      const gercekIsim = v.isim || v.il;
      if (!gercekIsim) return;

      const anahtar1 = harfTemizle(v.il);
      const anahtar2 = harfTemizle(v.isim);

      if (anahtar1) {
        sozluk[anahtar1] = gercekIsim;
      }

      if (anahtar2) {
        sozluk[anahtar2] = gercekIsim;
      }

    });

    return sozluk;

  }, [dbVerileri]);

  // SEÇİLİ KATEGORİ + VERİ + YIL İÇİN İL VERİLERİ
  const ilVeriSozlugu = useMemo(() => {

    const sozluk = {};

    dbVerileri.forEach(v => {

      const kategoriEslesiyor = harfTemizle(v.kategori) === harfTemizle(seciliKategori);
      const veriEslesiyor = v.veri === seciliVeri;
      const yilEslesiyor = String(v.yil) === String(seciliYil);

      if (kategoriEslesiyor && veriEslesiyor && yilEslesiyor) {
        const ilAnahtar = harfTemizle(v.il);
        if (ilAnahtar) sozluk[ilAnahtar] = v;

        const isimAnahtar = harfTemizle(v.isim);
        if (isimAnahtar) sozluk[isimAnahtar] = v;
      }

    });

    return sozluk;

  }, [dbVerileri, seciliKategori, seciliVeri, seciliYil]);

  // SÜTUN GRAFİK İÇİN SIRALANMIŞ VERİ
  const grafikVerisi = useMemo(() => {
    const veriler = [];
    const eklenenIller = new Set();
    
    Object.values(ilVeriSozlugu).forEach(v => {
      const ilAdi = v.isim || v.il;
      if (!ilAdi || eklenenIller.has(ilAdi)) return;

      const temizIlAdi = harfTemizle(ilAdi);
      if (!haritaIlleri.has(temizIlAdi) && haritaIlleri.size > 0) return; 

      const temizDeger = String(v.deger ?? "").replace(/\s/g, "").replace(",", ".");
      const sayisalDeger = parseFloat(temizDeger) || 0;

      if (sayisalDeger > 0) {
        eklenenIller.add(ilAdi);
        veriler.push({ il: ilAdi, deger: sayisalDeger });
      }
    });

    return veriler.sort((a, b) => b.deger - a.deger).slice(0, 10);
  }, [ilVeriSozlugu, haritaIlleri]);

  // BAR GRAFİĞİ RENKLERİ: AYNI DEĞER AYNI RENK
  const grafikRenkleri = useMemo(() => {
    const benzersizDegerler = [...new Set(grafikVerisi.map(item => item.deger))]
      .sort((a, b) => b - a);

    const renkPaleti = [
      '#326282',
      '#477797',
      '#5a86a3',
      '#6d96ae',
      '#80a5b9',
      '#93b4c4',
      '#a6c2cf',
      '#b6ccdd',
      '#c7d8e2',
      '#d8e4eb'
    ];

    const renkSozlugu = {};

    benzersizDegerler.forEach((deger, index) => {
      renkSozlugu[deger] = renkPaleti[index % renkPaleti.length];
    });

    return renkSozlugu;
  }, [grafikVerisi]);

  // BÖLGESEL İSTATİSTİKLER İÇİN OTOMATİK ÖZET
  const istatistikOzeti = useMemo(() => {
    const iller = [];
    const eklenenIller = new Set();

    Object.values(ilVeriSozlugu).forEach(v => {
      const ilAdi = v.isim || v.il;
      if (!ilAdi) return;

      const ilAnahtari = harfTemizle(ilAdi);
      if (!ilAnahtari || eklenenIller.has(ilAnahtari)) return;
      if (!haritaIlleri.has(ilAnahtari) && haritaIlleri.size > 0) return;

      const temizDeger = String(v.deger ?? '').replace(/\s/g, '').replace(',', '.');
      const sayisalDeger = parseFloat(temizDeger);

      if (!Number.isFinite(sayisalDeger)) return;

      eklenenIller.add(ilAnahtari);
      iller.push({ il: ilAdi, deger: sayisalDeger });
    });

    if (iller.length === 0) {
      return { enYuksek: null, enDusuk: null, ortalama: 0, ilSayisi: 0, farkKati: null };
    }

    const enYuksek = iller.reduce((enIyi, mevcut) =>
      mevcut.deger > enIyi.deger ? mevcut : enIyi
    );

    const pozitifIller = iller.filter(item => item.deger > 0);
    const enDusuk = pozitifIller.length > 0
      ? pozitifIller.reduce((enIyi, mevcut) =>
          mevcut.deger < enIyi.deger ? mevcut : enIyi
        )
      : null;

    const toplam = iller.reduce((sum, item) => sum + item.deger, 0);
    const ortalama = toplam / iller.length;
    const farkKati = enDusuk ? enYuksek.deger / enDusuk.deger : null;

    return { enYuksek, enDusuk, ortalama, ilSayisi: iller.length, farkKati };
  }, [ilVeriSozlugu, haritaIlleri]);

  const formatOzetDegeri = (deger) =>
    Number(deger || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });

  // DÜZEY 2 HARİTASI İÇİN BÖLGE VERİLERİ
  // ÖNEMLİ: Düzey 3 kayıtları aynı Düzey 2 kodunu taşıdığı için
  // doğrudan sozluk[kod] = değer yapmak son kaydın değeriyle önceki illeri ezebiliyordu.
  // Bu yüzden tüm il kayıtlarını Düzey 2 koduna göre gruplayıp bölgesel değeri hesaplıyoruz.
  const duzey2VeriSozlugu = useMemo(() => {
    const gruplar = {};

    dbVerileri.forEach(v => {
      const kategoriEslesiyor = harfTemizle(v.kategori) === harfTemizle(seciliKategori);
      const veriEslesiyor = v.veri === seciliVeri;
      const yilEslesiyor = String(v.yil) === String(seciliYil);
      if (!kategoriEslesiyor || !veriEslesiyor || !yilEslesiyor) return;

      const temizDeger = String(v.deger ?? '').replace(/\s/g, '').replace(',', '.');
      const sayisalDeger = parseFloat(temizDeger);
      if (!Number.isFinite(sayisalDeger)) return;

      // Öncelik: veritabanındaki Düzey 2 kodu.
      // Yoksa ilin Düzey 2 eşlemesinden üret.
      let kod = null;
      const olasiAlanlar = [v.duzey2_kod, v.location_code, v.bolge_kodu, v.bolgeKod, v.bolge];

      for (const alan of olasiAlanlar) {
        const eslesme = String(alan ?? '').toUpperCase().match(/TR(?:[0-9]{2}|[ABC][0-9])/);
        if (eslesme && IBBS_DUZEY2_KODLARI.has(eslesme[0])) {
          kod = eslesme[0];
          break;
        }
      }

      if (!kod) {
        for (const alan of [v.il, v.isim]) {
          const anahtar = harfTemizle(alan);
          if (IL_DUZEY2_ESLESME[anahtar]) {
            kod = IL_DUZEY2_ESLESME[anahtar];
            break;
          }
        }
      }

      if (!kod) return;
      if (!gruplar[kod]) gruplar[kod] = [];
      gruplar[kod].push({ ...v, degerSayisal: sayisalDeger });
    });

    const sozluk = {};

    Object.entries(gruplar).forEach(([kod, kayitlar]) => {
      if (!kayitlar.length) return;

      const toplam = kayitlar.reduce((sum, item) => sum + item.degerSayisal, 0);
      const veriAdi = String(kayitlar[0]?.veri || '').toLowerCase();
      const oranMi = veriAdi.includes('oran') || veriAdi.includes('%') || veriAdi.includes('doluluk') || veriAdi.includes('yuzde');

      // Sayım/değer göstergelerinde bölgedeki illerin toplamı;
      // oran göstergelerinde illerin aritmetik ortalaması kullanılır.
      const bolgeselDeger = oranMi ? toplam / kayitlar.length : toplam;

      sozluk[kod] = {
        ...kayitlar[0],
        degerSayisal: bolgeselDeger
      };
    });

    return sozluk;
  }, [dbVerileri, seciliKategori, seciliVeri, seciliYil]);

  const duzey2RenkLimitleri = useMemo(() => {
    const degerler = Object.values(duzey2VeriSozlugu)
      .map(v => v.degerSayisal)
      .filter(v => v > 0)
      .sort((a, b) => a - b);

    if (degerler.length === 0) return [0, 0, 0, 0];

    const indexGetir = (oran) =>
      degerler[Math.floor((degerler.length - 1) * oran)];

    return [
      indexGetir(0.20),
      indexGetir(0.40),
      indexGetir(0.60),
      indexGetir(0.80)
    ];
  }, [duzey2VeriSozlugu]);

  const getDuzey2Color = (deger) => {
    const sayisalDeger = Number(deger) || 0;

    if (!sayisalDeger) return '#dee2e6';

    return sayisalDeger > duzey2RenkLimitleri[3] ? '#6ca26c' :
           sayisalDeger > duzey2RenkLimitleri[2] ? '#97c194' :
           sayisalDeger > duzey2RenkLimitleri[1] ? '#bbd5b7' :
           sayisalDeger > duzey2RenkLimitleri[0] ? '#cfe1cc' :
                                                  '#e2ede0';
  };

  const duzey2GrafikVerisi = useMemo(() => {
    return Object.entries(duzey2VeriSozlugu)
      .map(([kod, v]) => ({ il: kod, deger: v.degerSayisal }))
      .filter(item => item.deger > 0)
      .sort((a, b) => b.deger - a.deger)
      .slice(0, 10);
  }, [duzey2VeriSozlugu]);

  const duzey2GrafikRenkleri = useMemo(() => {
    const benzersizDegerler = [...new Set(duzey2GrafikVerisi.map(item => item.deger))]
      .sort((a, b) => b - a);

    const renkPaleti = [
      '#326282',
      '#477797',
      '#5a86a3',
      '#6d96ae',
      '#80a5b9',
      '#93b4c4',
      '#a6c2cf',
      '#b6ccdd',
      '#c7d8e2',
      '#d8e4eb'
    ];

    const renkSozlugu = {};

    benzersizDegerler.forEach((deger, index) => {
      renkSozlugu[deger] = renkPaleti[index % renkPaleti.length];
    });

    return renkSozlugu;
  }, [duzey2GrafikVerisi]);


  const duzey2IstatistikOzeti = useMemo(() => {
    const bolgeler = Object.entries(duzey2VeriSozlugu).map(([kod, v]) => ({
      kod,
      deger: v.degerSayisal
    })).filter(item => Number.isFinite(item.deger));

    if (bolgeler.length === 0) {
      return { enYuksek: null, enDusuk: null, ortalama: 0, bolgeSayisi: 0, farkKati: null };
    }

    const enYuksek = bolgeler.reduce((a, b) => b.deger > a.deger ? b : a);
    const pozitifBolgeler = bolgeler.filter(item => item.deger > 0);
    const enDusuk = pozitifBolgeler.length > 0
      ? pozitifBolgeler.reduce((a, b) => b.deger < a.deger ? b : a)
      : null;

    const toplam = bolgeler.reduce((sum, item) => sum + item.deger, 0);
    const ortalama = toplam / bolgeler.length;
    const farkKati = enDusuk ? enYuksek.deger / enDusuk.deger : null;

    return { enYuksek, enDusuk, ortalama, bolgeSayisi: bolgeler.length, farkKati };
  }, [duzey2VeriSozlugu]);

  const getDuzey2Kod = (feature) => {
    const kod = feature?.properties?.ibbs2_code || feature?.properties?.IBBS2_CODE || feature?.properties?.NUTS2;
    return kod ? String(kod).toUpperCase() : '';
  };

  const duzey2Stili = (feature) => {
    const kod = getDuzey2Kod(feature);
    const veri = duzey2VeriSozlugu[kod];

    return {
      fillColor: veri ? getDuzey2Color(veri.degerSayisal) : '#dee2e6',
      weight: 1,
      opacity: 1,
      color: '#ffffff',
      fillOpacity: 0.95
    };
  };

  const onEachDuzey2Feature = (feature, layer) => {
    const kod = getDuzey2Kod(feature);
    const veri = duzey2VeriSozlugu[kod];
    const formatliDeger = veri
      ? formatOzetDegeri(veri.degerSayisal)
      : null;

    const bolgeBilgisi = IBBS_DUZEY2_BOLGELERI.find(bolge =>
      bolge.startsWith(`${kod} -`)
    );
    const kapsananIller = bolgeBilgisi
      ? bolgeBilgisi.split(' - ')[1]
      : 'Bölge illeri bilgisi bulunamadı';

    layer.bindTooltip(kod || 'Bilinmiyor', {
      permanent: true,
      direction: 'center',
      className: 'duzey2-isim-etiketi',
      interactive: false
    });

    const hoverIcerik = `
      <div style="text-align:center; font-size:14px; padding:5px 8px;">
        <b style="color:#6ca26c; font-size:15px;">${kod || 'Bilinmiyor'}</b>
        <div style="margin-top:5px; color:#495057; font-size:12px; line-height:1.45; max-width:240px;">${kapsananIller}</div>
        ${
          formatliDeger !== null
            ? `<div style="margin-top:5px; font-weight:600; color:#333; font-size:14px;">${formatliDeger}</div>`
            : `<div style="margin-top:5px; font-size:12px; color:#e03131;">Veri yok</div>`
        }
      </div>
    `;

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({ weight: 2.5, color: '#333', fillOpacity: 1 });
        l.bringToFront();
        l.unbindTooltip();
        l.bindTooltip(hoverIcerik, { sticky: true, direction: 'top', className: 'hover-popup' }).openTooltip(e.latlng);
      },
      mouseout: (e) => {
        e.target.setStyle(duzey2Stili(feature));
        e.target.unbindTooltip();
        e.target.bindTooltip(kod || 'Bilinmiyor', {
          permanent: true,
          direction: 'center',
          className: 'duzey2-isim-etiketi',
          interactive: false
        });
      }
    });
  };

  const duzey2TreemapVerisi = useMemo(() => {
    return IBBS_DUZEY2_BOLGELERI.map(bolge => {
      const kod = bolge.split(' - ')[0];
      const veri = duzey2VeriSozlugu[kod];
      return {
        name: kod,
        size: veri ? veri.degerSayisal : 0,
        deger: veri ? veri.degerSayisal : 0
      };
    }).filter(item => item.size > 0)
      .sort((a, b) => b.size - a.size);
  }, [duzey2VeriSozlugu]);

  const getDuzey2ChartColor = (deger) => {
    const sayisalDeger = Number(deger) || 0;

    if (!sayisalDeger) return '#dee2e6';

    return sayisalDeger > duzey2RenkLimitleri[3] ? '#326282' :
           sayisalDeger > duzey2RenkLimitleri[2] ? '#5a86a3' :
           sayisalDeger > duzey2RenkLimitleri[1] ? '#87a9c2' :
           sayisalDeger > duzey2RenkLimitleri[0] ? '#b6ccdd' :
                                                  '#e4f1f8';
  };

  const Duzey2TreemapCustomContent = (props) => {
    const { x, y, width, height, name, size } = props;

    if (width < 10 || height < 10) return null;

    const fillColor = getDuzey2ChartColor(size);
    const textColor = size > duzey2RenkLimitleri[1] ? '#ffffff' : '#326282';

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fillColor}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        {width > 28 && height > 24 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={11}
            fontWeight="600"
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  const treemapVerisi = useMemo(() => {
    const veriler = [];
    const eklenenIller = new Set();
    
    Object.values(ilVeriSozlugu).forEach(v => {
      const ilAdi = v.isim || v.il;
      if (!ilAdi || eklenenIller.has(ilAdi)) return;

      const temizIlAdi = harfTemizle(ilAdi);
      if (!haritaIlleri.has(temizIlAdi) && haritaIlleri.size > 0) return; 

      const temizDeger = String(v.deger ?? "").replace(/\s/g, "").replace(",", ".");
      const sayisalDeger = parseFloat(temizDeger) || 0;

      if (sayisalDeger > 0) {
        eklenenIller.add(ilAdi);
        veriler.push({ name: ilAdi, size: sayisalDeger });
      }
    });

    return veriler.sort((a, b) => b.size - a.size).slice(0, 20);
  }, [ilVeriSozlugu, haritaIlleri]);


  const renkLimitleri = useMemo(() => {
    const gecerliDegerler = Object.values(ilVeriSozlugu)
      .map(v => {
        const temizDeger = String(v.deger ?? "").replace(/\s/g, "").replace(",", ".");
        return parseFloat(temizDeger) || 0;
      })
      .filter(v => v > 0)
      .sort((a, b) => a - b);

    if (gecerliDegerler.length === 0) {
      return [0, 0, 0, 0];
    }

    const indexGetir = (oran) => gecerliDegerler[Math.floor((gecerliDegerler.length - 1) * oran)];

    return [
      indexGetir(0.20),
      indexGetir(0.40),
      indexGetir(0.60),
      indexGetir(0.80)
    ];
  }, [ilVeriSozlugu]);

  const getColor = (deger) => {
    const temizDeger = String(deger ?? "").replace(/\s/g, "").replace(",", ".");
    const sayisalDeger = parseFloat(temizDeger) || 0;

    if (!sayisalDeger) return '#dee2e6';

    return sayisalDeger > renkLimitleri[3] ? '#6ca26c' : 
           sayisalDeger > renkLimitleri[2] ? '#97c194' :
           sayisalDeger > renkLimitleri[1] ? '#bbd5b7' :
           sayisalDeger > renkLimitleri[0] ? '#cfe1cc' :
                                             '#e2ede0'; 
  };

  const getChartColor = (deger) => {
    const temizDeger = String(deger ?? "").replace(/\s/g, "").replace(",", ".");
    const sayisalDeger = parseFloat(temizDeger) || 0;

    if (!sayisalDeger) return '#dee2e6';

    return sayisalDeger > renkLimitleri[3] ? '#326282' : 
           sayisalDeger > renkLimitleri[2] ? '#5a86a3' :
           sayisalDeger > renkLimitleri[1] ? '#87a9c2' :
           sayisalDeger > renkLimitleri[0] ? '#b6ccdd' :
                                             '#e4f1f8'; 
  };

  const OzelTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const ilAdi = payload[0].payload.name || payload[0].payload.il || label;
      const deger = payload[0].value;
      const bolgeKodu = String(ilAdi || '').toUpperCase();
      const bolgeBilgisi = IBBS_DUZEY2_BOLGELERI.find(bolge =>
        bolge.startsWith(`${bolgeKodu} - `)
      );
      const kapsananIller = bolgeBilgisi
        ? bolgeBilgisi.split(' - ')[1]
        : null;

      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ced4da',
          borderRadius: '8px',
          padding: '10px 15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#326282', fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>
            {ilAdi}
          </div>
          {kapsananIller && (
            <div style={{ color: '#495057', fontSize: '12px', lineHeight: '1.4', marginBottom: '5px' }}>
              <span style={{ fontWeight: '600' }}>İller:</span> {kapsananIller}
            </div>
          )}
          <div style={{ color: '#495057', fontSize: '13px' }}>
            <span style={{ fontWeight: '600' }}>{turkceGoster(seciliVeri)}:</span> {Number(deger).toLocaleString('tr-TR')}
          </div>
        </div>
      );
    }
    return null;
  };

  const TreemapCustomContent = (props) => {
    const { x, y, width, height, name, size } = props;
    
    if (width < 10 || height < 10) return null;

    const fillColor = getChartColor(size); 
    const textFits = width > (name.length * 6.5 + 10) && height > 25;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fillColor}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        {textFits && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={size > renkLimitleri[1] ? "#ffffff" : "#326282"} 
            fontSize={11}
            fontWeight="600"
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  const ilStili = (feature) => {
    const geoAd1 = harfTemizle(feature.properties?.NAME_1);
    const geoAd2 = harfTemizle(feature.properties?.VARNAME_1);

    const ilVerisi = ilVeriSozlugu[geoAd1] || ilVeriSozlugu[geoAd2];
    const deger = ilVerisi ? ilVerisi.deger : 0;

    return {
      fillColor: getColor(deger), 
      weight: 1, 
      opacity: 1,
      color: '#ffffff', 
      fillOpacity: 0.95 
    };
  };

  const onEachFeature = (feature, layer) => {
    const geoAdi = feature.properties?.NAME_1 || feature.properties?.VARNAME_1 || "Bilinmiyor";
    const geoAd1 = harfTemizle(feature.properties?.NAME_1);
    const geoAd2 = harfTemizle(feature.properties?.VARNAME_1);

    const orjinalTurkceIsim = gercekIsimSozlugu[geoAd1] || gercekIsimSozlugu[geoAd2] || geoAdi;
    const ilVerisi = ilVeriSozlugu[geoAd1] || ilVeriSozlugu[geoAd2];

    let formatliDeger = null;

    if (ilVerisi) {
      const temizDeger = String(ilVerisi.deger ?? "").replace(/\s/g, "").replace(",", ".");
      const sayisalDeger = parseFloat(temizDeger);

      if (!isNaN(sayisalDeger)) {
        formatliDeger = sayisalDeger.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
      }
    }

    const sabitEtiket = orjinalTurkceIsim;

    const hoverIcerik = `
      <div style="text-align:center; font-size:14px; padding:4px;">
        <b style="color:#6ca26c; font-size:15px;">${orjinalTurkceIsim}</b><br/>
        ${
          ilVerisi && formatliDeger !== null
            ? `<span style="font-weight:600; color:#333; font-size:14px;">${formatliDeger}</span>`
            : `<span style="font-size:12px; color:#e03131;">Veri yok</span>`
        }
      </div>
    `;

    layer.bindTooltip(sabitEtiket, {
      permanent: true,
      direction: "center",
      className: "il-isim-etiketi",
      interactive: false
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({ weight: 2.5, color: '#333', fillOpacity: 1 });
        l.bringToFront();
        l.unbindTooltip();
        l.bindTooltip(hoverIcerik, { sticky: true, direction: "top", className: "hover-popup" }).openTooltip(e.latlng);
      },
      mouseout: (e) => {
        const l = e.target;
        if (geoData) {
          l.setStyle(ilStili(feature));
        }
        l.unbindTooltip();
        l.bindTooltip(sabitEtiket, { permanent: true, direction: "center", className: "il-isim-etiketi", interactive: false });
      }
    });
  };


  // =====================================================
  // DÜZEY 1 VERİLERİ
  // =====================================================
  const duzey1VeriSozlugu = useMemo(() => {
    const gruplar = {};

    const getD1Kod = (v) => {
      const adayAlanlar = [v.duzey1_kod, v.duzey1Kod, v.duzey1, v.location_code, v.bolge_kodu, v.bolgeKod, v.bolge];

      for (const alan of adayAlanlar) {
        const temiz = String(alan ?? '').trim().toUpperCase();
        const d1Eslesme = temiz.match(/\b(TR[1-9]|TR[ABC])\b/);
        if (d1Eslesme && IBBS_DUZEY1_KODLARI.has(d1Eslesme[1])) return d1Eslesme[1];

        const d2Eslesme = temiz.match(/\b(TR(?:[0-9]{2}|[ABC][0-9]))\b/);
        if (d2Eslesme && DUZEY2_DUZEY1_ESLESME[d2Eslesme[1]]) return DUZEY2_DUZEY1_ESLESME[d2Eslesme[1]];
      }

      for (const alan of [v.il, v.isim]) {
        const ilAnahtar = harfTemizle(alan);
        if (IL_DUZEY1_ESLESME[ilAnahtar]) return IL_DUZEY1_ESLESME[ilAnahtar];
      }

      return null;
    };

    dbVerileri.forEach(v => {
      const kategoriEslesiyor = harfTemizle(v.kategori) === harfTemizle(seciliKategori);
      const veriEslesiyor = v.veri === seciliVeri;
      const yilEslesiyor = String(v.yil) === String(seciliYil);
      if (!kategoriEslesiyor || !veriEslesiyor || !yilEslesiyor) return;

      const kod = getD1Kod(v);
      if (!kod) return;

      const temizDeger = String(v.deger ?? '').replace(/\s/g, '').replace(',', '.');
      const sayisalDeger = parseFloat(temizDeger);
      if (!Number.isFinite(sayisalDeger)) return;

      if (!gruplar[kod]) gruplar[kod] = [];
      gruplar[kod].push({ ...v, degerSayisal: sayisalDeger });
    });

    const sozluk = {};
    const veriAdi = String(seciliVeri || '').toLowerCase();
    const oranMi = veriAdi.includes('oran') || veriAdi.includes('%') || veriAdi.includes('doluluk') || veriAdi.includes('yuzde') || veriAdi.includes('pay');

    Object.entries(gruplar).forEach(([kod, kayitlar]) => {
      const toplam = kayitlar.reduce((sum, item) => sum + item.degerSayisal, 0);
      const deger = oranMi ? toplam / kayitlar.length : toplam;
      sozluk[kod] = { ...kayitlar[0], degerSayisal: deger, kayitSayisi: kayitlar.length };
    });

    return sozluk;
  }, [dbVerileri, seciliKategori, seciliVeri, seciliYil]);

  const duzey1GrafikVerisi = useMemo(() =>
    Object.entries(duzey1VeriSozlugu)
      .map(([kod, v]) => ({ il: kod, deger: v.degerSayisal }))
      .filter(item => item.deger > 0)
      .sort((a, b) => b.deger - a.deger)
      .slice(0, 10),
  [duzey1VeriSozlugu]);

  const duzey1GrafikRenkleri = useMemo(() => {
    const benzersizDegerler = [...new Set(duzey1GrafikVerisi.map(item => item.deger))].sort((a, b) => b - a);
    const renkPaleti = ['#326282','#477797','#5a86a3','#6d96ae','#80a5b9','#93b4c4','#a6c2cf','#b6ccdd','#c7d8e2','#d8e4eb'];
    const renkSozlugu = {};
    benzersizDegerler.forEach((deger, index) => { renkSozlugu[deger] = renkPaleti[index % renkPaleti.length]; });
    return renkSozlugu;
  }, [duzey1GrafikVerisi]);

  const duzey1IstatistikOzeti = useMemo(() => {
    const bolgeler = Object.entries(duzey1VeriSozlugu)
      .map(([kod, v]) => ({ kod, deger: v.degerSayisal }))
      .filter(item => Number.isFinite(item.deger));

    if (bolgeler.length === 0) return { enYuksek: null, enDusuk: null, ortalama: 0, bolgeSayisi: 0, farkKati: null };

    const enYuksek = bolgeler.reduce((a, b) => b.deger > a.deger ? b : a);
    const pozitifBolgeler = bolgeler.filter(item => item.deger > 0);
    const enDusuk = pozitifBolgeler.length > 0
      ? pozitifBolgeler.reduce((a, b) => b.deger < a.deger ? b : a)
      : bolgeler.reduce((a, b) => b.deger < a.deger ? b : a);
    const toplam = bolgeler.reduce((sum, item) => sum + item.deger, 0);
    const ortalama = toplam / bolgeler.length;
    const farkKati = enDusuk && enDusuk.deger !== 0 ? enYuksek.deger / enDusuk.deger : null;

    return { enYuksek, enDusuk, ortalama, bolgeSayisi: bolgeler.length, farkKati };
  }, [duzey1VeriSozlugu]);

  const duzey1RenkLimitleri = useMemo(() => {
    const degerler = Object.values(duzey1VeriSozlugu).map(v => v.degerSayisal).filter(v => v > 0).sort((a, b) => a - b);
    if (degerler.length === 0) return [0, 0, 0, 0];
    const indexGetir = oran => degerler[Math.floor((degerler.length - 1) * oran)];
    return [indexGetir(0.20), indexGetir(0.40), indexGetir(0.60), indexGetir(0.80)];
  }, [duzey1VeriSozlugu]);

  const getDuzey1Color = (deger) => {
    const sayisalDeger = Number(deger) || 0;
    if (!sayisalDeger) return '#dee2e6';
    return sayisalDeger > duzey1RenkLimitleri[3] ? '#6ca26c' :
      sayisalDeger > duzey1RenkLimitleri[2] ? '#97c194' :
      sayisalDeger > duzey1RenkLimitleri[1] ? '#bbd5b7' :
      sayisalDeger > duzey1RenkLimitleri[0] ? '#cfe1cc' : '#e2ede0';
  };

  const getDuzey1ChartColor = (deger) => {
    const sayisalDeger = Number(deger) || 0;
    if (!sayisalDeger) return '#dee2e6';
    return sayisalDeger > duzey1RenkLimitleri[3] ? '#326282' :
      sayisalDeger > duzey1RenkLimitleri[2] ? '#5a86a3' :
      sayisalDeger > duzey1RenkLimitleri[1] ? '#87a9c2' :
      sayisalDeger > duzey1RenkLimitleri[0] ? '#b6ccdd' : '#e4f1f8';
  };

  const getDuzey1Kod = (feature) => {
    const props = feature?.properties || {};
    const adaylar = [
      props.ibbs1_code,
      props.IBBS1_CODE,
      props.IBBS1,
      props.ibbs1,
      props.NUTS1,
      props.nuts1,
      props.NUTS_1,
      props.NUTS1_CODE,
      props.nuts1_code,
      props.NUTS_ID,
      props.nuts_id,
      props.region_code,
      props.REGION_CODE,
      props.code,
      props.CODE,
      props.id,
      props.ID
    ];

    for (const alan of adaylar) {
      const kod = String(alan ?? '').trim().toUpperCase();
      if (IBBS_DUZEY1_KODLARI.has(kod)) return kod;
    }

    const metin = Object.values(props).map(v => String(v ?? '')).join(' ');
    const eslesme = metin.toUpperCase().match(/\bTR(?:[1-9]|[ABC])\b/);
    return eslesme && IBBS_DUZEY1_KODLARI.has(eslesme[0]) ? eslesme[0] : '';
  };

  const d1HaritaStili = (feature) => {
    const d1Kod = getDuzey1Kod(feature);
    const veri = d1Kod ? duzey1VeriSozlugu[d1Kod] : null;

    return {
      fillColor: veri ? getDuzey1Color(veri.degerSayisal) : '#dee2e6',
      weight: 1,
      opacity: 1,
      color: '#ffffff',
      fillOpacity: 0.95
    };
  };

  const onEachDuzey1Feature = (feature, layer) => {
    const d1Kod = getDuzey1Kod(feature);
    const bolgeBilgisi = IBBS_DUZEY1_BOLGELERI.find(bolge => bolge.startsWith(`${d1Kod} - `));
    const bolgeAdi = bolgeBilgisi ? bolgeBilgisi.split(' - ')[1] : (feature.properties?.NAME_1 || feature.properties?.name || d1Kod || 'Bilinmiyor');
    const veri = d1Kod ? duzey1VeriSozlugu[d1Kod] : null;
    const formatliDeger = veri ? formatOzetDegeri(veri.degerSayisal) : null;
    const kapsam = d1Kod && D1_KAPSAM_ILLERI[d1Kod] ? D1_KAPSAM_ILLERI[d1Kod].join(' | ') : '';

    const hoverIcerik = `
      <div style="text-align:center; font-size:14px; padding:5px 8px;">
        <b style="color:#6ca26c; font-size:15px;">${d1Kod || 'Bilinmiyor'}</b>
        <div style="margin-top:3px; color:#495057; font-size:13px; font-weight:600;">${bolgeAdi}</div>
        <div style="margin-top:5px; color:#495057; font-size:12px; line-height:1.45; max-width:250px;">${kapsam}</div>
        ${formatliDeger !== null
          ? `<div style="margin-top:5px; font-weight:600; color:#333; font-size:14px;">${formatliDeger}</div>`
          : `<div style="margin-top:5px; font-size:12px; color:#e03131;">Veri yok</div>`}
      </div>`;

    layer.bindTooltip(d1Kod || bolgeAdi, { permanent: true, direction: 'center', className: 'duzey2-isim-etiketi', interactive: false });

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({ weight: 2.5, color: '#333', fillOpacity: 1 });
        l.bringToFront();
        l.unbindTooltip();
        l.bindTooltip(hoverIcerik, { sticky: true, direction: 'top', className: 'hover-popup' }).openTooltip(e.latlng);
      },
      mouseout: (e) => {
        e.target.setStyle(d1HaritaStili(feature));
        e.target.unbindTooltip();
        e.target.bindTooltip(d1Kod || bolgeAdi, { permanent: true, direction: 'center', className: 'duzey2-isim-etiketi', interactive: false });
      }
    });
  };

  const duzey1TreemapVerisi = useMemo(() =>
    IBBS_DUZEY1_BOLGELERI.map(bolge => {
      const kod = bolge.split(' - ')[0];
      const veri = duzey1VeriSozlugu[kod];
      return { name: kod, size: veri ? veri.degerSayisal : 0, deger: veri ? veri.degerSayisal : 0 };
    }).filter(item => item.size > 0).sort((a, b) => b.size - a.size),
  [duzey1VeriSozlugu]);

  const Duzey1TreemapCustomContent = (props) => {
    const { x, y, width, height, name, size } = props;
    if (width < 10 || height < 10) return null;
    const fillColor = getDuzey1ChartColor(size);
    const textColor = size > duzey1RenkLimitleri[1] ? '#ffffff' : '#326282';
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fillColor} stroke="#ffffff" strokeWidth={1.5} />
        {width > 28 && height > 24 && (
          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fill={textColor} fontSize={11} fontWeight="600">{name}</text>
        )}
      </g>
    );
  };

  const Duzey1OzelTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const kod = payload[0].payload.name || payload[0].payload.il || label;
      const deger = payload[0].value;
      const bolgeBilgisi = IBBS_DUZEY1_BOLGELERI.find(bolge => bolge.startsWith(`${kod} - `));
      const kapsananIller = bolgeBilgisi ? bolgeBilgisi.split(' - ')[1] : null;
      return (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ced4da', borderRadius: '8px', padding: '10px 15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#326282', fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>{kod}</div>
          {kapsananIller && (
            <div style={{ color: '#495057', fontSize: '12px', lineHeight: '1.4', marginBottom: '5px' }}><span style={{ fontWeight: '600' }}>İller:</span> {kapsananIller}</div>
          )}
          <div style={{ color: '#495057', fontSize: '13px' }}><span style={{ fontWeight: '600' }}>{turkceGoster(seciliVeri)}:</span> {Number(deger).toLocaleString('tr-TR')}</div>
        </div>
      );
    }
    return null;
  };

  // =====================================================
  // İNDİRME / DIŞA AKTARMA İŞLEMLERİ
  // =====================================================
  const getExportRows = () => {
    if (aktifDuzey === 1) {
      return Object.entries(duzey1VeriSozlugu).map(([kod, v]) => ({
        Kod: kod,
        Yer: IBBS_DUZEY1_BOLGELERI.find(b => b.startsWith(`${kod} - `))?.split(' - ')[1] || kod,
        Değer: v.degerSayisal
      }));
    }

    if (aktifDuzey === 2) {
      return Object.entries(duzey2VeriSozlugu).map(([kod, v]) => ({
        Kod: kod,
        Yer: IBBS_DUZEY2_BOLGELERI.find(b => b.startsWith(`${kod} - `))?.split(' - ')[1] || kod,
        Değer: v.degerSayisal
      }));
    }

    const rows = [];
    const eklenen = new Set();
    Object.values(ilVeriSozlugu).forEach(v => {
      const yer = v.isim || v.il;
      const anahtar = harfTemizle(yer);
      if (!yer || !anahtar || eklenen.has(anahtar)) return;
      eklenen.add(anahtar);

      const temizDeger = String(v.deger ?? '').replace(/\s/g, '').replace(',', '.');
      const deger = parseFloat(temizDeger);
      if (!Number.isFinite(deger)) return;

      rows.push({
        Kod: v.duzey2_kod || '',
        Yer: yer,
        Değer: deger
      });
    });

    return rows.sort((a, b) => b.Değer - a.Değer);
  };

  const getExportTitle = () =>
    aktifDuzey === 1
      ? 'TR Düzey 1 Bölgeleri Analizleri'
      : aktifDuzey === 2
        ? 'TR Düzey 2 Bölgeleri Analizleri'
        : 'TR Düzey 3 Bölgeleri Analizleri';

  const getExportFilePrefix = () => {
    const kategori = harfTemizle(seciliKategori) || 'kategori';
    const veri = harfTemizle(seciliVeri) || 'veri';
    const yil = seciliYil || 'yil';
    return `${kategori}_${veri}_${yil}`.slice(0, 150);
  };

  const veriyiExcelIndir = () => {
    const rows = getExportRows();
    if (!rows.length) {
      alert('İndirilecek veri bulunamadı.');
      return;
    }

    const headers = ['Kod', 'Yer', 'Değer'];
    const escapeHtml = value => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const tableRows = rows.map(row => `
      <tr>
        <td>${escapeHtml(row.Kod)}</td>
        <td>${escapeHtml(row.Yer)}</td>
        <td>${escapeHtml(Number(row.Değer).toLocaleString('tr-TR', { maximumFractionDigits: 4 }))}</td>
      </tr>
    `).join('');

    const html = `\ufeff<html><head><meta charset="UTF-8"></head><body>
      <h2>${escapeHtml(getExportTitle())}</h2>
      <p><strong>Kategori:</strong> ${escapeHtml(seciliKategori)}<br/>
      <strong>Veri:</strong> ${escapeHtml(turkceGoster(seciliVeri))}<br/>
      <strong>Yıl:</strong> ${escapeHtml(seciliYil)}</p>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getExportFilePrefix()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const haritayiPngIndir = () => {
    const wrapper = document.querySelector(`.analiz-harita-duzey-${aktifDuzey}`);
    const mapElement = wrapper?.querySelector('.leaflet-container');
    const svg = mapElement?.querySelector('.leaflet-overlay-pane svg');

    if (!mapElement || !svg) {
      alert('Harita görüntüsü bulunamadı.');
      return;
    }

    const exportWidth = 1400;
    const exportHeight = 995;
    const mapX = 85;
    const mapY = 205;
    const targetWidth = 1230;
    const targetHeight = 600;

    const escapeXml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const formatHaritaDegeri = (value) =>
      Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });

    let mapSvg = '';
    const rows = getExportRows();
    const features = aktifDuzey === 1 ? (geoDuzey1Data?.features || [])
                   : aktifDuzey === 2 ? (geoDuzey2Data?.features || [])
                   : (geoData?.features || []);

    const getFeatureLabelAndRow = (feature) => {
      if (!feature) return null;
      if (aktifDuzey === 1) {
        const kod = getDuzey1Kod(feature);
        const row = rows.find(r => harfTemizle(r.Kod) === harfTemizle(kod));
        return row ? { label: row.Kod, row } : null;
      }
      if (aktifDuzey === 2) {
        const kod = getDuzey2Kod(feature);
        const row = rows.find(r => harfTemizle(r.Kod) === harfTemizle(kod));
        return row ? { label: row.Kod, row } : null;
      }
      const ad = feature.properties?.NAME_1 || feature.properties?.VARNAME_1 || feature.properties?.name || '';
      const row = rows.find(r => harfTemizle(r.Yer) === harfTemizle(ad));
      return row ? { label: row.Yer, row } : null;
    };

    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.querySelectorAll('g').forEach(group => group.removeAttribute('transform'));
      clone.querySelectorAll('path').forEach(path => {
        path.removeAttribute('transform');
        path.removeAttribute('tabindex');
      });

      const clonePaths = Array.from(clone.querySelectorAll('path')).filter(path => path.getAttribute('d'));

      if (clonePaths.length) {
        const measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        measureSvg.setAttribute('width', '1');
        measureSvg.setAttribute('height', '1');
        measureSvg.style.position = 'absolute';
        measureSvg.style.left = '-100000px';
        measureSvg.style.top = '-100000px';
        measureSvg.style.visibility = 'hidden';
        measureSvg.style.pointerEvents = 'none';
        document.body.appendChild(measureSvg);
        measureSvg.appendChild(clone);

        const boxes = clonePaths.map(path => {
          try {
            const b = path.getBBox();
            return { x: b.x, y: b.y, width: b.width, height: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
          } catch { return null; }
        });

        const validBoxes = boxes.filter(Boolean).filter(b => b.width > 0 && b.height > 0);

        if (validBoxes.length) {
          const minX = Math.min(...validBoxes.map(b => b.x));
          const minY = Math.min(...validBoxes.map(b => b.y));
          const maxX = Math.max(...validBoxes.map(b => b.x + b.width));
          const maxY = Math.max(...validBoxes.map(b => b.y + b.height));

          const sourceWidth = Math.max(1, maxX - minX);
          const sourceHeight = Math.max(1, maxY - minY);

          const sidePadding = 40;
          const verticalPadding = 34;

          const scale = Math.min(
            (targetWidth - sidePadding * 2) / sourceWidth,
            (targetHeight - verticalPadding * 2) / sourceHeight
          );

          const finalWidth = sourceWidth * scale;
          const finalHeight = sourceHeight * scale;
          const offsetX = (targetWidth - finalWidth) / 2;
          const offsetY = (targetHeight - finalHeight) / 2;

          clone.setAttribute('width', targetWidth);
          clone.setAttribute('height', targetHeight);
          clone.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight}`);
          clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

          const geometryGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          geometryGroup.setAttribute(
            'transform',
            `translate(${offsetX} ${offsetY}) scale(${scale}) translate(${-minX} ${-minY})`
          );

          clonePaths.forEach(path => { geometryGroup.appendChild(path); });

          while (clone.firstChild) clone.removeChild(clone.firstChild);
          clone.appendChild(geometryGroup);

          const labelLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          labelLayer.setAttribute('class', 'rapor-harita-etiketleri');
          labelLayer.setAttribute('pointer-events', 'none');

          clonePaths.forEach((path, index) => {
            const feature = features[index];
            const eslesen = getFeatureLabelAndRow(feature);
            const b = boxes[index];

            if (!eslesen || !b) return;

            const x = offsetX + (b.cx - minX) * scale;
            const y = offsetY + (b.cy - minY) * scale;

            const labelText = String(eslesen.label || '').trim();
            const valueText = formatHaritaDegeri(eslesen.row.Değer);

            const nameSize = aktifDuzey === 3 ? '15' : '26';
            const valueSize = aktifDuzey === 3 ? '14' : '24';
            const valueYOffset = aktifDuzey === 3 ? 15 : 24;
            const strokeWidth = aktifDuzey === 3 ? '4' : '5';

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(x));
            text.setAttribute('y', String(y - 5));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
            text.setAttribute('font-size', nameSize);
            text.setAttribute('font-weight', '800');
            text.setAttribute('fill', '#243b53');
            text.setAttribute('stroke', '#ffffff');
            text.setAttribute('stroke-width', strokeWidth);
            text.setAttribute('stroke-linejoin', 'round');
            text.setAttribute('paint-order', 'stroke fill');
            text.textContent = labelText;

            const value = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            value.setAttribute('x', String(x));
            value.setAttribute('y', String(y + valueYOffset));
            value.setAttribute('text-anchor', 'middle');
            value.setAttribute('dominant-baseline', 'central');
            value.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
            value.setAttribute('font-size', valueSize);
            value.setAttribute('font-weight', '800');
            value.setAttribute('fill', '#4d9450');
            value.setAttribute('stroke', '#ffffff');
            value.setAttribute('stroke-width', strokeWidth);
            value.setAttribute('stroke-linejoin', 'round');
            value.setAttribute('paint-order', 'stroke fill');
            value.textContent = valueText;

            labelLayer.appendChild(text);
            labelLayer.appendChild(value);
          });

          clone.appendChild(labelLayer);
          mapSvg = new XMLSerializer().serializeToString(clone);
        }
        if (measureSvg.parentNode) measureSvg.parentNode.removeChild(measureSvg);
      }
    } catch (err) { console.warn('PNG harita SVG alınamadı:', err); }

    if (!mapSvg) {
      alert('Harita dışa aktarılamadı (Geometri hatası).');
      return;
    }

    const title = escapeXml(getExportTitle());
    const subtitle = escapeXml(turkceGoster(seciliVeri));
    const kategori = escapeXml(turkceGoster(seciliKategori));
    const yil = escapeXml(seciliYil || '');

    const exportSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">
        <rect x="0" y="0" width="${exportWidth}" height="${exportHeight}" fill="#ffffff"/>
        <text x="50" y="52" font-family="Arial, Helvetica, sans-serif" font-size="34px" font-weight="700" fill="#1f4263">${title}</text>
        <text x="50" y="92" font-family="Arial, Helvetica, sans-serif" font-size="26px" font-weight="700" fill="#356783">${subtitle}</text>
        <text x="50" y="126" font-family="Arial, Helvetica, sans-serif" font-size="16px" font-weight="400" fill="#6c757d">Kategori: ${kategori}  •  Yıl: ${yil}</text>
        <line x1="50" y1="158" x2="1350" y2="158" stroke="#294e70" stroke-width="3"/>
        <svg x="${mapX}" y="${mapY}" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}">
          ${mapSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}
        </svg>
      </svg>`;

    const svgBlob = new Blob([exportSvg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth * 2;
      canvas.height = exportHeight * 2;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        alert('Harita dışa aktarılamadı.');
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(svgUrl);

      canvas.toBlob(blob => {
        if (!blob) {
          alert('Harita PNG olarak oluşturulamadı.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${getExportFilePrefix()}_harita.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      alert('Harita PNG olarak dışa aktarılamadı.');
    };

    image.src = svgUrl;
  };

  const raporuPdfIndir = () => {
    const rows = getExportRows();
    if (!rows.length) {
      alert('Rapor oluşturmak için veri bulunamadı.');
      return;
    }

    const tarih = new Date().toLocaleDateString('tr-TR');
    const title = getExportTitle();
    const veriAdi = turkceGoster(seciliVeri);
    const kategoriAdi = turkceGoster(seciliKategori);
    const yil = String(seciliYil || '');

    const sayilar = rows
      .map(r => Number(r.Değer))
      .filter(v => Number.isFinite(v));

    const toplam = sayilar.reduce((a, b) => a + b, 0);
    const ortalama = sayilar.length ? toplam / sayilar.length : 0;

    const enYuksek = rows.reduce((best, row) =>
      Number(row.Değer) > Number(best.Değer) ? row : best,
      rows[0]
    );

    const enDusukPozitif = rows
      .filter(r => Number(r.Değer) > 0)
      .reduce((best, row) =>
        !best || Number(row.Değer) < Number(best.Değer) ? row : best,
        null
      );

    const formatDeger = value =>
      Number(value || 0).toLocaleString('tr-TR', {
        maximumFractionDigits: 4
      });

    const escapeHtml = value => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const kapsamaMetni = aktifDuzey === 1
      ? '12 Düzey 1 bölgesi'
      : aktifDuzey === 2
        ? '26 Düzey 2 bölgesi'
        : '81 il';

    let ozet1 = `${yil} yılına ait ${veriAdi} göstergesi, ${kapsamaMetni} kapsamında bölgesel dağılımı ortaya koymaktadır. `;
    let ozet2 = '';

    if (sayilar.length) {
      ozet1 += `Bu gösterge kapsamında en yüksek değer ${enYuksek?.Yer || enYuksek?.Kod || '-'} biriminde ${formatDeger(enYuksek?.Değer)} olarak görülmektedir. `;

      if (enDusukPozitif) {
        const oran = Number(enYuksek.Değer) / Number(enDusukPozitif.Değer);
        ozet2 = `Değerler karşılaştırıldığında ${enYuksek?.Yer || enYuksek?.Kod || '-'} ile pozitif değerler içindeki en düşük birim olan ${enDusukPozitif?.Yer || enDusukPozitif?.Kod || '-'} arasında yaklaşık ${Number(oran || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kat fark bulunmaktadır. `;
      } else {
        ozet2 = 'Pozitif değer bulunmadığı için birimler arasında anlamlı bir üst-alt karşılaştırması yapılamamaktadır. ';
      }

      ozet2 += `Dağılımın ortalama değeri ${formatDeger(ortalama)} olup, sonuçlar göstergenin mekânsal olarak eşit dağılmadığını / değerlerin birimler arasında farklılaştığını göstermektedir.`;
    }

    const tableRows = rows.map(row => `
      <tr>
        <td>${escapeHtml(row.Kod)}</td>
        <td>${escapeHtml(row.Yer)}</td>
        <td class="num">${escapeHtml(formatDeger(row.Değer))}</td>
      </tr>
    `).join('');

    /*
     * RAPOR HARİTASI
     * Rapor haritası aktif Leaflet görünümündeki pan/zoom konumundan
     * bağımsızdır. SVG içindeki Leaflet transformları tamamen temizlenir,
     * ardından gerçek path geometrileri kendi koordinat alanlarında ölçülür
     * ve sabit bir tuvale tam ortalanır. Böylece kullanıcı haritayı sitede
     * nereye sürüklerse sürüklesin rapordaki harita aynı yerde kalır.
     */
    let mapSvg = '';

    try {
      const wrapper = document.querySelector(`.analiz-harita-duzey-${aktifDuzey}`);
      const svg = wrapper?.querySelector('.leaflet-overlay-pane svg');

      if (svg) {
        const features = aktifDuzey === 1
          ? (geoDuzey1Data?.features || [])
          : aktifDuzey === 2
            ? (geoDuzey2Data?.features || [])
            : (geoData?.features || []);

        const getFeatureLabelAndRow = (feature) => {
          if (!feature) return null;

          if (aktifDuzey === 1) {
            const kod = getDuzey1Kod(feature);
            const row = rows.find(r =>
              harfTemizle(r.Kod) === harfTemizle(kod)
            );
            return row ? { label: row.Kod, row } : null;
          }

          if (aktifDuzey === 2) {
            const kod = getDuzey2Kod(feature);
            const row = rows.find(r =>
              harfTemizle(r.Kod) === harfTemizle(kod)
            );
            return row ? { label: row.Kod, row } : null;
          }

          const ad =
            feature.properties?.NAME_1 ||
            feature.properties?.VARNAME_1 ||
            feature.properties?.name ||
            '';

          const row = rows.find(r =>
            harfTemizle(r.Yer) === harfTemizle(ad)
          );

          return row ? { label: row.Yer, row } : null;
        };

        /*
         * Canlı SVG'yi klonla ve Leaflet'in tüm grup transformlarını kaldır.
         * Böylece pan/zoom kaynaklı ekran kaymaları rapora taşınmaz.
         */
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        clone.querySelectorAll('g').forEach(group => {
          group.removeAttribute('transform');
        });

        clone.querySelectorAll('path').forEach(path => {
          path.removeAttribute('transform');
          path.removeAttribute('tabindex');
        });

        const clonePaths = Array.from(clone.querySelectorAll('path'))
          .filter(path => path.getAttribute('d'));

        if (clonePaths.length) {
          /*
           * getBBox() yalnızca DOM'a bağlı SVG'de güvenilir olduğundan
           * klonu görünmez bir alana ekleyip gerçek geometri kutularını ölçüyoruz.
           */
          const measureSvg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
          );
          measureSvg.setAttribute('width', '1');
          measureSvg.setAttribute('height', '1');
          measureSvg.style.position = 'absolute';
          measureSvg.style.left = '-100000px';
          measureSvg.style.top = '-100000px';
          measureSvg.style.visibility = 'hidden';
          measureSvg.style.pointerEvents = 'none';
          document.body.appendChild(measureSvg);
          measureSvg.appendChild(clone);

          const boxes = clonePaths.map(path => {
            try {
              const b = path.getBBox();
              return {
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                cx: b.x + b.width / 2,
                cy: b.y + b.height / 2
              };
            } catch {
              return null;
            }
          });

          const validBoxes = boxes.filter(Boolean).filter(b =>
            b.width > 0 && b.height > 0
          );

          if (validBoxes.length) {
            const minX = Math.min(...validBoxes.map(b => b.x));
            const minY = Math.min(...validBoxes.map(b => b.y));
            const maxX = Math.max(...validBoxes.map(b => b.x + b.width));
            const maxY = Math.max(...validBoxes.map(b => b.y + b.height));

            const sourceWidth = Math.max(1, maxX - minX);
            const sourceHeight = Math.max(1, maxY - minY);

            const targetWidth = 1000;
            const targetHeight = 430;
            const sidePadding = 40;
            const verticalPadding = 34;

            const scale = Math.min(
              (targetWidth - sidePadding * 2) / sourceWidth,
              (targetHeight - verticalPadding * 2) / sourceHeight
            );

            const finalWidth = sourceWidth * scale;
            const finalHeight = sourceHeight * scale;
            const offsetX = (targetWidth - finalWidth) / 2;
            const offsetY = (targetHeight - finalHeight) / 2;

            clone.setAttribute('width', targetWidth);
            clone.setAttribute('height', targetHeight);
            clone.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight}`);

            const geometryGroup = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'g'
            );
            geometryGroup.setAttribute(
              'transform',
              `translate(${offsetX} ${offsetY}) scale(${scale}) translate(${-minX} ${-minY})`
            );

            /* Pathları ortak sabit transform altında tekrar grupla. */
            clonePaths.forEach(path => {
              geometryGroup.appendChild(path);
            });

            while (clone.firstChild) {
              clone.removeChild(clone.firstChild);
            }
            clone.appendChild(geometryGroup);

            const labelLayer = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'g'
            );
            labelLayer.setAttribute('class', 'rapor-harita-etiketleri');
            labelLayer.setAttribute('pointer-events', 'none');

            clonePaths.forEach((path, index) => {
              const feature = features[index];
              const eslesen = getFeatureLabelAndRow(feature);
              const b = boxes[index];

              if (!eslesen || !b) return;

              const x = offsetX + (b.cx - minX) * scale;
              const y = offsetY + (b.cy - minY) * scale;

              const labelText = String(eslesen.label || '').trim();
              const valueText = Number(eslesen.row.Değer || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });

              const nameSize = aktifDuzey === 3 ? '12' : '20';
              const valueSize = aktifDuzey === 3 ? '11' : '18';
              const valueYOffset = aktifDuzey === 3 ? 12 : 20;
              const strokeWidth = aktifDuzey === 3 ? '3.5' : '4.5';

              const text = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'text'
              );
              text.setAttribute('x', String(x));
              text.setAttribute('y', String(y - 4));
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('dominant-baseline', 'central');
              text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
              text.setAttribute('font-size', nameSize);
              text.setAttribute('font-weight', '800');
              text.setAttribute('fill', '#243b53');
              text.setAttribute('stroke', '#ffffff');
              text.setAttribute('stroke-width', strokeWidth);
              text.setAttribute('stroke-linejoin', 'round');
              text.setAttribute('paint-order', 'stroke fill');
              text.textContent = labelText;

              const value = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'text'
              );
              value.setAttribute('x', String(x));
              value.setAttribute('y', String(y + valueYOffset)); 
              value.setAttribute('text-anchor', 'middle');
              value.setAttribute('dominant-baseline', 'central');
              value.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
              value.setAttribute('font-size', valueSize);
              value.setAttribute('font-weight', '800');
              value.setAttribute('fill', '#4d9450');
              value.setAttribute('stroke', '#ffffff');
              value.setAttribute('stroke-width', strokeWidth);
              value.setAttribute('stroke-linejoin', 'round');
              value.setAttribute('paint-order', 'stroke fill');
              value.textContent = valueText;

              labelLayer.appendChild(text);
              labelLayer.appendChild(value);
            });

            clone.appendChild(labelLayer);
            mapSvg = new XMLSerializer().serializeToString(clone);
          }

          if (measureSvg.parentNode) {
            measureSvg.parentNode.removeChild(measureSvg);
          }
        }
      }
    } catch (err) {
      console.warn('Rapor haritası alınamadı:', err);
    }

    const mapSection = mapSvg
      ? `<section class="card map-card">
           <h2>Harita Görünümü</h2>
           <div class="map-wrap">${mapSvg}</div>
         </section>`
      : '';

    const win = window.open('', '_blank', 'width=1100,height=900');

    if (!win) {
      alert('Rapor penceresi açılamadı. Tarayıcı açılır pencereyi engellemiş olabilir.');
      return;
    }

    win.document.write(`<!doctype html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)} - ${escapeHtml(veriAdi)} - ${escapeHtml(yil)}</title>
        <style>
          * { box-sizing: border-box; }

          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            color: #263238;
            background: #ffffff;
          }

          .page {
            max-width: 1120px;
            margin: 0 auto;
            padding: 34px 38px 42px;
          }

          .brand {
            color: #173f66;
            font-size: 26px;
            font-weight: 700;
            margin: 0 0 8px;
          }

          .subtitle {
            color: #0a985c;
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 7px;
          }

          .meta-line {
            color: #687680;
            font-size: 12px;
            margin-bottom: 14px;
          }

          .rule {
            height: 3px;
            background: #173f66;
            margin-bottom: 24px;
          }

          .card {
            border: 1px solid #d9e1e6;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 20px;
          }

          .card h2 {
            color: #173f66;
            font-size: 15px;
            margin: 0 0 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5eaee;
          }

          .summary p {
            margin: 0 0 10px;
            font-size: 12px;
            line-height: 1.65;
            color: #4f5d66;
          }

          .summary p:last-child {
            margin-bottom: 0;
          }

          .map-wrap {
            width: 100%;
            min-height: 430px;
            height: 430px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #ffffff;
          }

          .map-wrap svg {
            display: block;
            width: 100%;
            height: 430px;
            max-width: 100%;
          }

          .table-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }

          .count {
            color: #6c757d;
            font-size: 11px;
            font-weight: 400;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 11px;
          }

          th, td {
            border: 1px solid #dfe5e9;
            padding: 7px 9px;
            vertical-align: middle;
          }

          th {
            background: #173f66;
            color: #ffffff;
            text-align: left;
            font-weight: 700;
          }

          td.num {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          tbody tr:nth-child(even) td {
            background: #f7f9fa;
          }

          th:first-child, td:first-child { width: 18%; }
          th:nth-child(2), td:nth-child(2) { width: 57%; }
          th:last-child, td:last-child { width: 25%; }

          .foot {
            margin-top: 18px;
            color: #7a858d;
            font-size: 10px;
            text-align: left;
          }

          @page {
            size: A4;
            margin: 12mm;
          }

          @media print {
            .page {
              max-width: none;
              padding: 0;
            }

            .card {
              break-inside: avoid;
            }

            .map-card {
              break-inside: avoid;
            }

            thead {
              display: table-header-group;
            }

            tr {
              break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <div class="page">

          <h1 class="brand">
            Türkiye Veri Analizleri
          </h1>

          <div class="subtitle">
            ${escapeHtml(title)}
          </div>

          <div class="meta-line">
            Gösterge:
            <strong>${escapeHtml(veriAdi)}</strong>
            &nbsp;&nbsp;•&nbsp;&nbsp;

            Kategori:
            <strong>${escapeHtml(kategoriAdi)}</strong>
            &nbsp;&nbsp;•&nbsp;&nbsp;

            Yıl:
            <strong>${escapeHtml(yil)}</strong>
            &nbsp;&nbsp;•&nbsp;&nbsp;

            Rapor tarihi:
            <strong>${escapeHtml(tarih)}</strong>
          </div>

          <div class="rule"></div>

          <section class="card summary">
            <h2>Kısa Değerlendirme</h2>
            <p>${escapeHtml(ozet1)}</p>
            <p>${escapeHtml(ozet2)}</p>
          </section>

          ${mapSection}

          <section class="card">
            <div class="table-title">
              <h2 style="border-bottom:none; padding-bottom:0; margin-bottom:10px;">
                Veri Dağılım Tablosu
              </h2>

              <div class="count">
                ${rows.length} kayıt
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Yer / Bölge</th>
                  <th>Değer</th>
                </tr>
              </thead>

              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </section>

          <div class="foot">
            Türkiye Veri Analizleri • Seçili gösterge raporu • Oluşturulma tarihi: ${escapeHtml(tarih)}
          </div>

        </div>
      </body>
      </html>`);

    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 400);
  };

  // YÖNETİCİ PANELİ İŞLEMLERİ
  const adminIstek = async (url, options = {}) => {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
      ...(!isFormData && options.body ? { "Content-Type": "application/json" } : {}),
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {})
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      try { sessionStorage.removeItem("adminToken"); } catch {}
      setAdminToken("");
      setAdminHata("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      throw new Error(data?.error || "İşlem gerçekleştirilemedi.");
    }

    return data;
  };

  const adminGirisYap = async (e) => {
    e.preventDefault();
    setAdminHata("");
    setAdminYukleniyor(true);

    try {
   const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminGiris)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token) {
        throw new Error(data?.error || "Kullanıcı adı veya şifre hatalı.");
      }

      setAdminToken(data.token);
      try { sessionStorage.setItem("adminToken", data.token); } catch {}
      setAdminGiris({ kullaniciAdi: "", sifre: "" });
      setAdminHata("");
    } catch (err) {
      setAdminHata(err.message || "Giriş yapılamadı.");
    } finally {
      setAdminYukleniyor(false);
    }
  };

  const adminCikisYap = () => {
    setAdminToken("");
    setAdminModu(false);
    setAdminVeriler([]);
    setAdminArama("");
    setAdminDuzenlenenId(null);
    setAdminHata("");
    try { sessionStorage.removeItem("adminToken"); } catch {}
  };

  const adminVerileriGetir = async () => {
    try {
      setAdminYukleniyor(true);
      setAdminHata("");
      const q = adminArama.trim() ? `?arama=${encodeURIComponent(adminArama.trim())}` : "";
    const data = await adminIstek(`${API_URL}/api/admin/veriler${q}`);
      setAdminVeriler(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.message !== "UNAUTHORIZED") {
        setAdminHata(err.message || "Veriler alınamadı.");
      }
    } finally {
      setAdminYukleniyor(false);
    }
  };

  useEffect(() => {
    if (adminModu && adminToken) {
      adminVerileriGetir();
    }
  }, [adminModu, adminToken]);

  const adminFormuTemizle = () => {
    setAdminForm({ il: "", duzey1_kod: "", duzey2_kod: "", baslik: "", kategori: "", yil: "", deger: "" });
    setAdminDuzenlenenId(null);
  };

  const adminDuzenle = (kayit) => {
    setAdminDuzenlenenId(kayit.id);
    setAdminForm({
      il: kayit.il ?? "",
      duzey1_kod: kayit.duzey1_kod ?? "",
      duzey2_kod: kayit.duzey2_kod ?? "",
      baslik: kayit.baslik ?? "",
      kategori: kayit.kategori ?? "",
      yil: kayit.yil ?? "",
      deger: kayit.deger ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const adminKaydet = async (e) => {
    e.preventDefault();
    setAdminHata("");
    setAdminYukleniyor(true);

    const payload = {
      il: String(adminForm.il || "").trim(),
      duzey1_kod: String(adminForm.duzey1_kod || "").trim(),
      duzey2_kod: String(adminForm.duzey2_kod || "").trim(),
      baslik: String(adminForm.baslik || "").trim(),
      kategori: String(adminForm.kategori || "").trim(),
      yil: Number(adminForm.yil),
      deger: adminForm.deger === "" ? 0 : Number(String(adminForm.deger).replace(/\s/g, "").replace(",", "."))
    };

    if (!payload.il || !payload.baslik || !payload.kategori || !Number.isFinite(payload.yil) || !Number.isFinite(payload.deger)) {
      setAdminHata("İl, kategori, başlık, yıl ve değer alanlarını kontrol edin.");
      setAdminYukleniyor(false);
      return;
    }

    try {
      const method = adminDuzenlenenId ? "PUT" : "POST";
const url = adminDuzenlenenId
  ? `${API_URL}/api/admin/veriler/${adminDuzenlenenId}`
  : `${API_URL}/api/admin/veriler`;
      await adminIstek(url, { method, body: JSON.stringify(payload) });
      adminFormuTemizle();
      await adminVerileriGetir();
    } catch (err) {
      if (err.message !== "UNAUTHORIZED") setAdminHata(err.message || "Kayıt kaydedilemedi.");
    } finally {
      setAdminYukleniyor(false);
    }
  };

  const adminExcelYukle = async () => {
    if (!adminExcelDosyasi) {
      setAdminExcelDurum("Önce bir Excel dosyası seçin.");
      return;
    }

    const uzanti = String(adminExcelDosyasi.name || "").toLowerCase();
    if (!uzanti.endsWith(".xlsx") && !uzanti.endsWith(".xls")) {
      setAdminExcelDurum("Lütfen .xlsx veya .xls uzantılı bir Excel dosyası seçin.");
      return;
    }

    const formData = new FormData();
    formData.append("dosya", adminExcelDosyasi);

    try {
      setAdminExcelYukleniyor(true);
      setAdminExcelDurum("");
      setAdminHata("");

const data = await adminIstek(
  `${API_URL}/api/admin/excel-yukle`,
  { method: "POST", body: formData }
);
      setAdminExcelDurum(
        `Excel tamamlandı: ${data.guncellenen || 0} kayıt güncellendi, ${data.eklenen || 0} yeni kayıt eklendi${data.atlanan ? `, ${data.atlanan} satır atlandı` : ""}.`
      );
      setAdminExcelDosyasi(null);

      const dosyaInput = document.getElementById("admin-excel-input");
      if (dosyaInput) dosyaInput.value = "";

      await adminVerileriGetir();
    } catch (err) {
      if (err.message !== "UNAUTHORIZED") {
        setAdminExcelDurum("");
        setAdminHata(err.message || "Excel yüklenemedi.");
      }
    } finally {
      setAdminExcelYukleniyor(false);
    }
  };

  const adminSil = async (id) => {
    if (!window.confirm("Bu veri kaydını silmek istediğinize emin misiniz?")) return;

    try {
      setAdminYukleniyor(true);
      setAdminHata("");
      await adminIstek(`${API_URL}/api/admin/veriler/${id}`, { method: "DELETE" });
      if (adminDuzenlenenId === id) adminFormuTemizle();
      await adminVerileriGetir();
    } catch (err) {
      if (err.message !== "UNAUTHORIZED") setAdminHata(err.message || "Kayıt silinemedi.");
    } finally {
      setAdminYukleniyor(false);
    }
  };

  if (adminModu) {
    return (
      <div style={{ minHeight: "100vh", width: "100vw", maxWidth: "none", backgroundColor: "#f4f7f6", display: "flex", margin: 0, padding: 0, boxSizing: "border-box" }}>
        <style>{`
          html, body, #root {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
          }
          html, body {
            overflow-x: hidden;
          }
        `}</style>
        <aside className="veri-panel-sidebar" style={{ width: "249px", minWidth: "249px", height: "100vh", position: "sticky", top: 0, backgroundColor: "#072b4e", color: "white", display: "flex", flexDirection: "column", boxSizing: "border-box", zIndex: 1100 }}>
          <div style={{ padding: "30px 18px 27px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.18)" }}>
            <div style={{ fontSize: "18px", lineHeight: "1.35", fontWeight: "700" }}>Trakya Kalkınma Ajansı</div>
            <div style={{ fontSize: "18px", lineHeight: "1.35", fontWeight: "700" }}>Türkiye Veri Analizleri</div>
          </div>
          <div style={{ padding: "18px 18px 0" }}>
            <button type="button" onClick={() => setAdminModu(false)} style={{ width: "100%", border: "none", background: "transparent", color: "white", textAlign: "left", padding: "14px 0", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>← Siteye Dön</button>
          </div>
          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.14)" }}>
            {adminToken && <button type="button" onClick={adminCikisYap} style={{ width: "100%", border: "none", background: "transparent", color: "white", textAlign: "left", padding: "18px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Çıkış Yap</button>}
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: "30px", boxSizing: "border-box", overflowY: "auto" }}>
          {!adminToken ? (
            <div style={{ maxWidth: "460px", margin: "70px auto", background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 2px 14px rgba(0,0,0,0.06)" }}>
              <h1 style={{ margin: "0 0 8px", color: "#326282", fontSize: "24px" }}>Yönetici Girişi</h1>
              <p style={{ margin: "0 0 24px", color: "#6c757d", fontSize: "14px" }}>Veri portalını güncellemek için giriş yapın.</p>
              <form onSubmit={adminGirisYap}>
                <label style={{ display: "block", marginBottom: "7px", fontSize: "13px", fontWeight: "600", color: "#495057" }}>Kullanıcı Adı</label>
                <input value={adminGiris.kullaniciAdi} onChange={e => setAdminGiris(v => ({ ...v, kullaniciAdi: e.target.value }))} autoComplete="username" style={{ width: "100%", padding: "11px 12px", border: "1px solid #ced4da", borderRadius: "7px", marginBottom: "16px", boxSizing: "border-box" }} />
                <label style={{ display: "block", marginBottom: "7px", fontSize: "13px", fontWeight: "600", color: "#495057" }}>Şifre</label>
                <input type="password" value={adminGiris.sifre} onChange={e => setAdminGiris(v => ({ ...v, sifre: e.target.value }))} autoComplete="current-password" style={{ width: "100%", padding: "11px 12px", border: "1px solid #ced4da", borderRadius: "7px", marginBottom: "16px", boxSizing: "border-box" }} />
                {adminHata && <div style={{ marginBottom: "14px", padding: "10px 12px", borderRadius: "7px", background: "#fff1f1", color: "#c92a2a", fontSize: "13px" }}>{adminHata}</div>}
                <button type="submit" disabled={adminYukleniyor} style={{ width: "100%", border: "none", borderRadius: "7px", padding: "11px 14px", background: "#6ca26c", color: "white", fontWeight: "700", cursor: "pointer" }}>{adminYukleniyor ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                <div>
                  <h1 style={{ margin: 0, color: "#326282", fontSize: "24px" }}>Yönetim Paneli</h1>
                  <p style={{ margin: "6px 0 0", color: "#6c757d", fontSize: "14px" }}>Verileri ekleyin, düzenleyin veya silin.</p>
                </div>
                <button type="button" onClick={adminCikisYap} style={{ border: "1px solid #ced4da", background: "white", color: "#495057", borderRadius: "7px", padding: "9px 14px", cursor: "pointer" }}>Çıkış Yap</button>
              </div>

              {adminHata && <div style={{ marginBottom: "18px", padding: "11px 14px", borderRadius: "8px", background: "#fff1f1", color: "#c92a2a", fontSize: "13px" }}>{adminHata}</div>}

              <div style={{ background: "white", borderRadius: "12px", padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "22px" }}>
                <div style={{ marginBottom: "14px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "#343a40" }}>Excel ile Toplu Veri Yükle</h2>
                  <p style={{ margin: "6px 0 0", color: "#6c757d", fontSize: "13px", lineHeight: "1.5" }}>
                    Yeni verileri ekler; aynı il + kategori + başlık + yıl kaydı varsa günceller. İlk çalışma sayfası okunur.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    id="admin-excel-input"
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={e => {
                      setAdminExcelDosyasi(e.target.files?.[0] || null);
                      setAdminExcelDurum("");
                    }}
                    style={{
                      flex: 1,
                      minWidth: "280px",
                      padding: "9px 10px",
                      border: "1px solid #ced4da",
                      borderRadius: "7px",
                      background: "#fff",
                      boxSizing: "border-box"
                    }}
                  />
                  <button
                    type="button"
                    onClick={adminExcelYukle}
                    disabled={adminExcelYukleniyor}
                    style={{
                      border: "none",
                      borderRadius: "7px",
                      padding: "10px 16px",
                      background: "#326282",
                      color: "white",
                      fontWeight: "700",
                      cursor: adminExcelYukleniyor ? "default" : "pointer",
                      opacity: adminExcelYukleniyor ? 0.7 : 1
                    }}
                  >
                    {adminExcelYukleniyor ? "Yükleniyor..." : "Excel'i Yükle"}
                  </button>
                </div>

                <div style={{ marginTop: "10px", fontSize: "12px", color: "#7a7f85", lineHeight: "1.5" }}>
                  Beklenen sütunlar: <b>il, duzey1_kod, duzey2_kod, baslik, kategori, yil, deger</b>.
                  &nbsp; <b>anabaslik, plaka_kodu, location_code</b> gibi ek sütunlar varsa göz ardı edilir.
                </div>

                {adminExcelDurum && (
                  <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "7px", background: "#eef8f0", color: "#2f6f3e", fontSize: "13px" }}>
                    {adminExcelDurum}
                  </div>
                )}
              </div>

              <form onSubmit={adminKaydet} style={{ background: "white", borderRadius: "12px", padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "#343a40" }}>{adminDuzenlenenId ? "Veriyi Düzenle" : "Yeni Veri Ekle"}</h2>
                  {adminDuzenlenenId && <button type="button" onClick={adminFormuTemizle} style={{ border: "none", background: "transparent", color: "#6c757d", cursor: "pointer" }}>İptal</button>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
                  {[
                    ["il", "İl", "Adana"],
                    ["duzey1_kod", "Düzey 1 Kodu", "TR6"],
                    ["duzey2_kod", "Düzey 2 Kodu", "TR62"],
                    ["kategori", "Kategori", "Sağlık"],
                    ["baslik", "Başlık", "Hastane ve yatak sayıları"],
                    ["yil", "Yıl", "2025"],
                    ["deger", "Değer", "0"]
                  ].map(([key, label, placeholder]) => (
                    <div key={key} style={{ gridColumn: key === "baslik" ? "span 2" : "span 1" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: "#495057" }}>{label}</label>
                      <input value={adminForm[key]} onChange={e => setAdminForm(v => ({ ...v, [key]: e.target.value }))} placeholder={placeholder} type={key === "yil" || key === "deger" ? "number" : "text"} step={key === "deger" ? "any" : undefined} style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #ced4da", borderRadius: "7px" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px", gap: "10px" }}>
                  <button type="submit" disabled={adminYukleniyor} style={{ border: "none", borderRadius: "7px", padding: "10px 16px", background: "#6ca26c", color: "white", fontWeight: "700", cursor: "pointer" }}>{adminYukleniyor ? "Kaydediliyor..." : adminDuzenlenenId ? "Güncelle" : "Veriyi Ekle"}</button>
                </div>
              </form>

              <div style={{ background: "white", borderRadius: "12px", padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <input value={adminArama} onChange={e => setAdminArama(e.target.value)} onKeyDown={e => { if (e.key === "Enter") adminVerileriGetir(); }} placeholder="İl, kategori veya başlık ara..." style={{ flex: 1, padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "7px" }} />
                  <button type="button" onClick={adminVerileriGetir} style={{ border: "none", borderRadius: "7px", padding: "10px 16px", background: "#326282", color: "white", fontWeight: "600", cursor: "pointer" }}>Ara</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr>{["ID", "İl", "D1", "D2", "Kategori", "Başlık", "Yıl", "Değer", "İşlem"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px", borderBottom: "2px solid #dee2e6", color: "#495057", whiteSpace: "nowrap" }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {adminVeriler.map(kayit => (
                        <tr key={kayit.id}>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee" }}>{kayit.id}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee" }}>{kayit.il}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee" }}>{kayit.duzey1_kod}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee" }}>{kayit.duzey2_kod}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee" }}>{kayit.kategori}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee", minWidth: "260px" }}>{kayit.baslik}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee" }}>{kayit.yil}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee" }}>{Number(kayit.deger ?? 0).toLocaleString("tr-TR")}</td>
                          <td style={{ padding: "9px 10px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                            <button type="button" onClick={() => adminDuzenle(kayit)} style={{ border: "1px solid #ced4da", background: "white", color: "#326282", borderRadius: "5px", padding: "5px 8px", marginRight: "5px", cursor: "pointer" }}>Düzenle</button>
                            <button type="button" onClick={() => adminSil(kayit.id)} style={{ border: "1px solid #f1b0b7", background: "#fff5f5", color: "#c92a2a", borderRadius: "5px", padding: "5px 8px", cursor: "pointer" }}>Sil</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {adminVeriler.length === 0 && !adminYukleniyor && <div style={{ padding: "25px", textAlign: "center", color: "#868e96" }}>Gösterilecek kayıt bulunamadı.</div>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (hata) {
    return (
      <div style={{ padding: "20px", color: "red", fontSize: "20px" }}>
        <b>Hata:</b> {hata}
      </div>
    );
  }

  if (!geoData || veriMetadata.length === 0 || !seciliVeri || !seciliYil || dbVerileri.length === 0) {
    return (
      <div style={{ padding: "20px", fontSize: "20px" }}>
        Veriler çekiliyor...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      backgroundColor: "#f4f7f6",
      display: "flex",
      flexDirection: "row",
      boxSizing: "border-box",
      margin: 0,
      padding: 0,
      overflowX: "hidden"
    }}>
            <button
        type="button"
        className="mobil-menu-button"
        aria-label={mobilMenuAcik ? "Menüyü kapat" : "Menüyü aç"}
        onClick={() => setMobilMenuAcik(v => !v)}
      >
        {mobilMenuAcik ? "×" : "☰"}
      </button>

      <div
        className={`mobil-menu-overlay ${mobilMenuAcik ? "acik" : ""}`}
        onClick={() => setMobilMenuAcik(false)}
        aria-hidden="true"
      />

<aside className={`veri-panel-sidebar ${mobilMenuAcik ? "mobil-acik" : ""}`} style={{
        width: "249px",
        minWidth: "249px",
        height: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        backgroundColor: "#072b4e",
        color: "white",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        zIndex: 1100,
        flexShrink: 0
      }}>
        <div style={{ padding: "30px 18px 27px 18px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.18)" }}>
          <div style={{ fontSize: "18px", lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.2px" }}>
            Trakya Kalkınma Ajansı
          </div>
          <div style={{ fontSize: "18px", lineHeight: "1.35", fontWeight: "700" }}>
            Türkiye Veri Analizleri
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", paddingTop: 0 }}>
          {[
            { id: 1, label: "TR Düzey 1 Bölgeleri Analizleri" },
            { id: 2, label: "TR Düzey 2 Bölgeleri Analizleri" },
            { id: 3, label: "TR Düzey 3 Bölgeleri Analizleri" }
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAktifDuzey(item.id);
                setMobilMenuAcik(false);
              }}
              style={{
                position: "relative",
                width: "100%",
                border: "none",
                borderRadius: 0,
                backgroundColor: aktifDuzey === item.id ? "#204160" : "transparent",
                color: "white",
                textAlign: "left",
                padding: "20px 20px",
                fontSize: "14px",
                fontWeight: aktifDuzey === item.id ? "700" : "500",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                boxSizing: "border-box"
              }}
            >
              {aktifDuzey === item.id && (
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: "#019350" }} />
              )}
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.14)" }}>
          <button
            type="button"
            onClick={() => { setAdminModu(true); setAdminHata(""); }}
            style={{ width: "100%", border: "none", background: adminModu ? "#204160" : "transparent", color: "white", textAlign: "left", padding: "18px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
          >
            Yönetici Girişi
          </button>
        </div>
      </aside>

      <div className="veri-panel-main" style={{ flex: 1, minWidth: 0, width: "calc(100% - 249px)", backgroundColor: "#f4f7f6", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

      <style>{`
        html, body, #root {
          width: 100%;
          min-width: 0;
          margin: 0;
          padding: 0;
          border: 0 !important;
          outline: 0 !important;
        }
        html, body {
          overflow-x: hidden;
        }
        #root {
          max-width: none;
        }
        .il-isim-etiketi {
          background-color: transparent;
          border: none;
          box-shadow: none;
          font-size: 10px;
          font-weight: 700;
          color: #212529;
          text-shadow: 1px 1px 2px #fff, -1px -1px 2px #fff, 1px -1px 2px #fff, -1px 1px 2px #fff;
        }
        .il-isim-etiketi::before { display: none; }
        .duzey2-isim-etiketi {
          background-color: transparent;
          border: none;
          box-shadow: none;
          font-size: 10px;
          font-weight: 700;
          color: #212529;
          text-shadow: 1px 1px 2px #fff, -1px -1px 2px #fff, 1px -1px 2px #fff, -1px 1px 2px #fff;
        }
        .duzey2-isim-etiketi::before { display: none; }
        .hover-popup {
          background-color: rgba(255, 255, 255, 0.95);
          border: 1px solid #dee2e6;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
                .mobil-menu-button,
        .mobil-menu-overlay {
          display: none;
        }

        @media (max-width: 768px) {
          .mobil-menu-button {
            display: flex !important;
            position: fixed !important;
            top: 14px !important;
            left: 14px !important;
            width: 42px !important;
            height: 42px !important;
            align-items: center !important;
            justify-content: center !important;
            border: none !important;
            border-radius: 10px !important;
            background: #072b4e !important;
            color: white !important;
            font-size: 24px !important;
            line-height: 1 !important;
            cursor: pointer !important;
            z-index: 1300 !important;
            box-shadow: 0 3px 12px rgba(0,0,0,0.16) !important;
          }

          .mobil-menu-overlay {
            position: fixed !important;
            inset: 0 !important;
            background: rgba(0,0,0,0.28) !important;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            z-index: 1190 !important;
          }

          .mobil-menu-overlay.acik {
            display: block !important;
            opacity: 1;
            pointer-events: auto;
          }

          .analiz-panelleri-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: none !important;
            min-height: auto !important;
            padding: 14px !important;
            gap: 14px !important;
          }

          .analiz-panelleri-grid > div {
            min-height: 320px !important;
          }

          .mobil-filtreler {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            width: 100% !important;
          }

          .mobil-filtreler > * {
            width: 100% !important;
          }

          .mobil-indirme-butonlari {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            width: 100% !important;
          }

          .mobil-indirme-butonlari > * {
            width: 100% !important;
          }

          .veri-panel-sidebar {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 280px !important;
            min-width: 280px !important;
            height: 100vh !important;
            transform: translateX(-105%);
            transition: transform 0.24s ease;
            z-index: 1200 !important;
            overflow-y: auto !important;
          }

          .veri-panel-sidebar.mobil-acik {
            transform: translateX(0);
          }
        }

          @media (max-width: 768px) {
            .veri-panel-main select,
            .veri-panel-main .veri-filtre-select {
              width: 100% !important;
              min-width: 0 !important;
            }

            .veri-panel-main input[type="date"],
            .veri-panel-main input[type="number"],
            .veri-panel-main input[type="text"] {
              max-width: 100% !important;
            }
          }

@media (max-width: 900px) {
          .veri-panel-sidebar {
            width: 210px !important;
            min-width: 210px !important;
          }
        }
      `}</style>

      {/* -------------------- DÜZEY 3 -------------------- */}
      {aktifDuzey === 3 && (
        <>
          <header style={{
            backgroundColor: "white",
            padding: "15px 30px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            zIndex: 1000,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <div>
              <h1 style={{ margin: "0", fontSize: "20px", color: "#6ca26c", textAlign: "left" }}>
                TR Düzey 3 Bölgeleri Analizleri
              </h1>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-start" }}>
              {kategoriler.map((kat, index) => (
                <button
                  key={`${kat}-${index}`}
                  onClick={() => setSeciliKategori(kat)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "none",
                    backgroundColor:
                      harfTemizle(seciliKategori) === harfTemizle(kat)
                        ? "#6ca26c" 
                        : "#e9ecef",
                    color:
                      harfTemizle(seciliKategori) === harfTemizle(kat)
                        ? "white"
                        : "#495057",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    transition: "0.2s"
                  }}
                >
                  {kat}
                </button>
              ))}
            </div>
          </header>

          <div style={{
            backgroundColor: "#ffffff",
            padding: "12px 30px",
            borderBottom: "1px solid #dee2e6",
            display: "flex",
            gap: "25px",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 999,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#495057" }}>Veri:</label>
              <select
                value={seciliVeri}
                onChange={(e) => setSeciliVeri(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  fontSize: "13px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  minWidth: "250px"
                }}
              >
                {veriListesi.map((v, index) => (
                  <option key={`${v}-${index}`} value={v}>{turkceGoster(v)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#495057" }}>Yıl:</label>
              <select
                value={seciliYil}
                onChange={(e) => setSeciliYil(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  fontSize: "13px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  minWidth: "100px"
                }}
              >
                {yilListesi.map((y, index) => (
                  <option key={`${y}-${index}`} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              marginLeft: "auto"
            }}>
              <button
                type="button"
                onClick={haritayiPngIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#072b4e",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Haritayı İndir (PNG)
              </button>
              <button
                type="button"
                onClick={veriyiExcelIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#072b4e",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Veriyi İndir (Excel)
              </button>
              <button
                type="button"
                onClick={raporuPdfIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#009b5f",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Raporu İndir (PDF)
              </button>
            </div>
          </div>




          <div className="analiz-panelleri-grid" style={{
            flex: 1,
            width: "100%",
            padding: "20px",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "20px",
            minHeight: "75vh"
          }}>
            <div style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                margin: "0 0 12px 0",
                color: "#343a40",
                fontSize: "16px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                textAlign: "left"
              }}>
                {turkceGoster(seciliVeri)}
              </h3>

              {istatistikOzeti.enYuksek && istatistikOzeti.enDusuk ? (
                <div style={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateRows: "1fr auto 1fr auto 1fr",
                  alignItems: "center"
                }}>
                  <p style={{
                    margin: "0",
                    gridRow: "2",
                    fontSize: "14px",
                    color: "#5f6368",
                    lineHeight: "1.5"
                  }}>
                    <b>{seciliYil}</b> yılında <b>{turkceGoster(seciliVeri)}</b> göstergesinde iller arasında belirgin farklılıklar görülmektedir.
                    {istatistikOzeti.farkKati !== null
                      ? <> En yüksek ve en düşük değer arasındaki fark yaklaşık <span style={{ color: "#4f8f4f", fontWeight: "700" }}>{formatOzetDegeri(istatistikOzeti.farkKati)} kat</span> düzeyindedir.</>
                      : <> Pozitif değer bulunmadığı için en düşük il karşılaştırması yapılamamaktadır.</>}
                    <span> Toplam <b>{istatistikOzeti.ilSayisi} il</b> üzerinden değerlendirme yapılmaktadır. En düşük il hesaplanırken 0 değerler değerlendirme dışı bırakılmıştır.</span>
                  </p>

                  <div style={{
                    display: "grid",
                    gridRow: "4",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "12px",
                    marginTop: "0",
                    width: "100%"
                  }}>
                    <div style={{
                      background: "linear-gradient(180deg, #f5faf4 0%, #edf6eb 100%)",
                      border: "1px solid #d9e9d6",
                      borderTop: "3px solid #6ca26c",
                      borderRadius: "10px",
                      padding: "13px 14px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      minHeight: "120px"
                    }}>
                      <div style={{ fontSize: "11px", color: "#6b7d6b", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>
                        EN YÜKSEK İL
                      </div>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#3f7f3f" }}>
                        {istatistikOzeti.enYuksek.il}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#495057", marginTop: "3px" }}>
                        {formatOzetDegeri(istatistikOzeti.enYuksek.deger)}
                      </div>
                    </div>

                    <div style={{
                      background: "linear-gradient(180deg, #f7fbf6 0%, #eef7ed 100%)",
                      border: "1px solid #d9e9d6",
                      borderTop: "3px solid #8abf86",
                      borderRadius: "10px",
                      padding: "13px 14px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      minHeight: "120px"
                    }}>
                      <div style={{ fontSize: "11px", color: "#718371", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>
                        EN DÜŞÜK İL
                      </div>
                      {istatistikOzeti.enDusuk ? (
                        <>
                          <div style={{ fontSize: "17px", fontWeight: "700", color: "#4f8f4f" }}>
                            {istatistikOzeti.enDusuk.il}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: "#495057", marginTop: "3px" }}>
                            {formatOzetDegeri(istatistikOzeti.enDusuk.deger)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: "#718371" }}>
                            Uygun değer yok
                          </div>
                          <div style={{ fontSize: "12px", color: "#8a9a89", marginTop: "4px" }}>
                            0 dışındaki değerler bulunamadı
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{
                      background: "linear-gradient(180deg, #f8fbf7 0%, #f0f7ef 100%)",
                      border: "1px solid #d9e9d6",
                      borderTop: "3px solid #a7cba2",
                      borderRadius: "10px",
                      padding: "13px 14px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      minHeight: "120px"
                    }}>
                      <div style={{ fontSize: "11px", color: "#718371", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>
                        TÜRKİYE ORTALAMASI
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "#4f8f4f" }}>
                        {formatOzetDegeri(istatistikOzeti.ortalama)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#7b827b", marginTop: "4px" }}>
                        {istatistikOzeti.ilSayisi} il üzerinden
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "#868e96", paddingTop: "12px" }}>
                  Gösterilecek istatistik bulunamadı.
                </div>
              )}
            </div>

            <div className="analiz-harita-duzey-3" style={{
              backgroundColor: "white",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              position: "relative"
            }}>
              <MapContainer
                center={[39.0, 35.0]}
                zoom={5.5}
                attributionControl={false}
                style={{ height: "100%", width: "100%", background: "transparent" }}
              >
                <GeoJSON
                  key={`${seciliKategori}-${seciliVeri}-${seciliYil}`}
                  data={geoData}
                  style={ilStili}
                  onEachFeature={onEachFeature}
                />
              </MapContainer>
            </div>

            <div style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                margin: "0 0 15px 0",
                color: "#343a40",
                fontSize: "15px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>En Yüksek 10 İl Dağılımı</span>
                <span style={{ fontSize: "12px", color: "#888", fontWeight: "normal" }}>
                  {seciliYil}
                </span>
              </h3>

              <div style={{ flex: 1, width: "100%", minHeight: "220px" }}>
                {grafikVerisi.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={grafikVerisi} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                      <XAxis dataKey="il" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#495057' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#495057' }} tickFormatter={(val) => Number(val).toLocaleString('tr-TR')} width={80} />
                      <RechartsTooltip content={<OzelTooltip />} cursor={{fill: '#f8f9fa'}} />
                      <Bar dataKey="deger" radius={[4, 4, 0, 0]}>
                        {grafikVerisi.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={grafikRenkleri[entry.deger]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#868e96", fontSize: "14px" }}>
                    Gösterilecek veri bulunamadı.
                  </div>
                )}
              </div>
            </div>

            <div style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                margin: "0 0 15px 0",
                color: "#343a40",
                fontSize: "15px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>En Yüksek 20 İlin Kendi İçindeki Oranı</span>
                <span style={{ fontSize: "12px", color: "#888", fontWeight: "normal" }}>
                  {seciliYil}
                </span>
              </h3>

              <div style={{ flex: 1, width: "100%", minHeight: "220px" }}>
                {treemapVerisi.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapVerisi}
                      dataKey="size"
                      aspectRatio={4 / 3}
                      content={<TreemapCustomContent />}
                    >
                      <RechartsTooltip content={<OzelTooltip />} />
                    </Treemap>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#868e96", fontSize: "14px" }}>
                    Gösterilecek veri bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* -------------------- DÜZEY 2 -------------------- */}
      {aktifDuzey === 2 && (
        <>
          <header style={{
            backgroundColor: "white",
            padding: "15px 30px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            zIndex: 1000,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <h1 style={{ margin: "0", fontSize: "20px", color: "#6ca26c", textAlign: "left" }}>
              TR Düzey 2 Bölgeleri Analizleri
            </h1>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-start" }}>
              {kategoriler.map((kat, index) => (
                <button
                  key={`duzey2-${kat}-${index}`}
                  onClick={() => setSeciliKategori(kat)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "none",
                    backgroundColor:
                      harfTemizle(seciliKategori) === harfTemizle(kat)
                        ? "#6ca26c"
                        : "#e9ecef",
                    color:
                      harfTemizle(seciliKategori) === harfTemizle(kat)
                        ? "white"
                        : "#495057",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    transition: "0.2s"
                  }}
                >
                  {kat}
                </button>
              ))}
            </div>
          </header>

          <div style={{
            backgroundColor: "#ffffff",
            padding: "12px 30px",
            borderBottom: "1px solid #dee2e6",
            display: "flex",
            gap: "25px",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 999,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#495057" }}>Veri:</label>
              <select
                value={seciliVeri}
                onChange={(e) => setSeciliVeri(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  fontSize: "13px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  minWidth: "250px"
                }}
              >
                {veriListesi.map((v, index) => (
                  <option key={`${v}-${index}`} value={v}>{turkceGoster(v)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#495057" }}>Yıl:</label>
              <select
                value={seciliYil}
                onChange={(e) => setSeciliYil(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  fontSize: "13px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  minWidth: "100px"
                }}
              >
                {yilListesi.map((y, index) => (
                  <option key={`${y}-${index}`} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              marginLeft: "auto"
            }}>
              <button
                type="button"
                onClick={haritayiPngIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#072b4e",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Haritayı İndir (PNG)
              </button>
              <button
                type="button"
                onClick={veriyiExcelIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#072b4e",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Veriyi İndir (Excel)
              </button>
              <button
                type="button"
                onClick={raporuPdfIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#009b5f",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Raporu İndir (PDF)
              </button>
            </div>
          </div>




          <div className="analiz-panelleri-grid" style={{
            flex: 1,
            width: "100%",
            padding: "20px",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "20px",
            minHeight: "75vh"
          }}>
            <div style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                margin: "0 0 12px 0",
                color: "#343a40",
                fontSize: "16px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                textAlign: "left"
              }}>
                {turkceGoster(seciliVeri)}
              </h3>

              {duzey2IstatistikOzeti.enYuksek && duzey2IstatistikOzeti.enDusuk ? (
                <div style={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateRows: "1fr auto 1fr auto 1fr",
                  alignItems: "center"
                }}>
                  <p style={{
                    margin: "0",
                    gridRow: "2",
                    fontSize: "14px",
                    color: "#5f6368",
                    lineHeight: "1.5"
                  }}>
                    <b>{seciliYil}</b> yılında <b>{turkceGoster(seciliVeri)}</b> göstergesinde Düzey 2 bölgeleri arasında belirgin farklılıklar görülmektedir.
                    {duzey2IstatistikOzeti.farkKati !== null
                      ? <> En yüksek ve en düşük değer arasındaki fark yaklaşık <span style={{ color: "#4f8f4f", fontWeight: "700" }}>{formatOzetDegeri(duzey2IstatistikOzeti.farkKati)} kat</span> düzeyindedir.</>
                      : null}
                    <span> Toplam <b>{duzey2IstatistikOzeti.bolgeSayisi} bölge</b> üzerinden değerlendirme yapılmaktadır. En düşük bölge hesaplanırken 0 değerler değerlendirme dışı bırakılmıştır.</span>
                  </p>

                  <div style={{
                    display: "grid",
                    gridRow: "4",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "12px",
                    marginTop: "0",
                    width: "100%"
                  }}>
                    <div style={{
                      background: "linear-gradient(180deg, #f5faf4 0%, #edf6eb 100%)",
                      border: "1px solid #d9e9d6",
                      borderTop: "3px solid #6ca26c",
                      borderRadius: "10px",
                      padding: "13px 14px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      minHeight: "120px"
                    }}>
                      <div style={{ fontSize: "11px", color: "#6b7d6b", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>EN YÜKSEK BÖLGE</div>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#3f7f3f" }}>{duzey2IstatistikOzeti.enYuksek.kod}</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#495057", marginTop: "3px" }}>{formatOzetDegeri(duzey2IstatistikOzeti.enYuksek.deger)}</div>
                    </div>

                    <div style={{
                      background: "linear-gradient(180deg, #f7fbf6 0%, #eef7ed 100%)",
                      border: "1px solid #d9e9d6",
                      borderTop: "3px solid #8abf86",
                      borderRadius: "10px",
                      padding: "13px 14px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      minHeight: "120px"
                    }}>
                      <div style={{ fontSize: "11px", color: "#718371", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>EN DÜŞÜK BÖLGE</div>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#4f8f4f" }}>{duzey2IstatistikOzeti.enDusuk.kod}</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#495057", marginTop: "3px" }}>{formatOzetDegeri(duzey2IstatistikOzeti.enDusuk.deger)}</div>
                    </div>

                    <div style={{
                      background: "linear-gradient(180deg, #f8fbf7 0%, #f0f7ef 100%)",
                      border: "1px solid #d9e9d6",
                      borderTop: "3px solid #a7cba2",
                      borderRadius: "10px",
                      padding: "13px 14px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      minHeight: "120px"
                    }}>
                      <div style={{ fontSize: "11px", color: "#718371", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>TÜRKİYE ORTALAMASI</div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "#4f8f4f" }}>{formatOzetDegeri(duzey2IstatistikOzeti.ortalama)}</div>
                      <div style={{ fontSize: "11px", color: "#7b827b", marginTop: "4px" }}>{duzey2IstatistikOzeti.bolgeSayisi} bölge üzerinden</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "#868e96", paddingTop: "12px" }}>Gösterilecek istatistik bulunamadı.</div>
              )}
            </div>

            <div className="analiz-harita-duzey-2" style={{
              backgroundColor: "white",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              position: "relative"
            }}>
              <MapContainer
                center={[39.0, 35.0]}
                zoom={5.4}
                attributionControl={false}
                style={{ height: "100%", width: "100%", background: "transparent" }}
              >
                {geoDuzey2Data && (
                  <GeoJSON
                    key={`duzey2-${seciliKategori}-${seciliVeri}-${seciliYil}`}
                    data={geoDuzey2Data}
                    style={duzey2Stili}
                    onEachFeature={onEachDuzey2Feature}
                  />
                )}
              </MapContainer>
            </div>

            <div style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                margin: "0 0 15px 0",
                color: "#343a40",
                fontSize: "15px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>En Yüksek 10 Bölge Dağılımı</span>
                <span style={{ fontSize: "12px", color: "#888", fontWeight: "normal" }}>
                  {seciliYil}
                </span>
              </h3>

              <div style={{ flex: 1, width: "100%", minHeight: "220px" }}>
                {duzey2GrafikVerisi.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={duzey2GrafikVerisi} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                      <XAxis dataKey="il" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#495057' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#495057' }} tickFormatter={(val) => Number(val).toLocaleString('tr-TR')} width={80} />
                      <RechartsTooltip content={<OzelTooltip />} cursor={{fill: '#f8f9fa'}} />
                      <Bar dataKey="deger" radius={[4, 4, 0, 0]}>
                        {duzey2GrafikVerisi.map((entry, index) => (
                          <Cell
                            key={`duzey2-cell-${index}`}
                            fill={duzey2GrafikRenkleri[entry.deger]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#868e96", fontSize: "14px" }}>
                    Gösterilecek veri bulunamadı.
                  </div>
                )}
              </div>
            </div>

            <div style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                margin: "0 0 15px 0",
                color: "#343a40",
                fontSize: "15px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>Tüm Düzey 2 Bölgelerinin Kendi İçindeki Oranı</span>
                <span style={{ fontSize: "12px", color: "#888", fontWeight: "normal" }}>
                  {seciliYil}
                </span>
              </h3>
              <div style={{ flex: 1, width: "100%", minHeight: "220px" }}>
                {duzey2TreemapVerisi.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={duzey2TreemapVerisi}
                      dataKey="size"
                      aspectRatio={4 / 3}
                      content={<Duzey2TreemapCustomContent />}
                    >
                      <RechartsTooltip content={<OzelTooltip />} />
                    </Treemap>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#868e96", fontSize: "14px" }}>
                    Gösterilecek veri bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* -------------------- DÜZEY 1 -------------------- */}
      {aktifDuzey === 1 && (
        <>
          <header style={{
            backgroundColor: "white",
            padding: "15px 30px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            zIndex: 1000,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <h1 style={{ margin: "0", fontSize: "20px", color: "#6ca26c", textAlign: "left" }}>
              TR Düzey 1 Bölgeleri Analizleri
            </h1>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-start" }}>
              {kategoriler.map((kat, index) => (
                <button
                  key={`duzey1-${kat}-${index}`}
                  onClick={() => setSeciliKategori(kat)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "none",
                    backgroundColor: harfTemizle(seciliKategori) === harfTemizle(kat) ? "#6ca26c" : "#e9ecef",
                    color: harfTemizle(seciliKategori) === harfTemizle(kat) ? "white" : "#495057",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    transition: "0.2s"
                  }}
                >
                  {kat}
                </button>
              ))}
            </div>
          </header>

          <div style={{
            backgroundColor: "#ffffff",
            padding: "12px 30px",
            borderBottom: "1px solid #dee2e6",
            display: "flex",
            gap: "25px",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 999,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#495057" }}>Veri:</label>
              <select value={seciliVeri} onChange={(e) => setSeciliVeri(e.target.value)} style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ced4da", fontSize: "13px", backgroundColor: "#fff", cursor: "pointer", minWidth: "250px" }}>
                {veriListesi.map((v, index) => <option key={`d1-veri-${v}-${index}`} value={v}>{turkceGoster(v)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#495057" }}>Yıl:</label>
              <select value={seciliYil} onChange={(e) => setSeciliYil(e.target.value)} style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ced4da", fontSize: "13px", backgroundColor: "#fff", cursor: "pointer", minWidth: "100px" }}>
                {yilListesi.map((y, index) => <option key={`d1-yil-${y}-${index}`} value={y}>{y}</option>)}
              </select>
            </div>

            <div style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              marginLeft: "auto"
            }}>
              <button
                type="button"
                onClick={haritayiPngIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#072b4e",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Haritayı İndir (PNG)
              </button>
              <button
                type="button"
                onClick={veriyiExcelIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#072b4e",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Veriyi İndir (Excel)
              </button>
              <button
                type="button"
                onClick={raporuPdfIndir}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "7px",
                  backgroundColor: "#009b5f",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Raporu İndir (PDF)
              </button>
            </div>
          </div>




          <div className="analiz-panelleri-grid" style={{ flex: 1, width: "100%", padding: "20px", boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "20px", minHeight: "75vh" }}>
            <div style={{ backgroundColor: "white", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#343a40", fontSize: "16px", borderBottom: "1px solid #eee", paddingBottom: "10px", textAlign: "left" }}>
                {turkceGoster(seciliVeri)}
              </h3>
              {duzey1IstatistikOzeti.enYuksek && duzey1IstatistikOzeti.enDusuk ? (
                <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "1fr auto 1fr auto 1fr", alignItems: "center" }}>
                  <p style={{ margin: "0", gridRow: "2", fontSize: "14px", color: "#5f6368", lineHeight: "1.5" }}>
                    <b>{seciliYil}</b> yılında <b>{turkceGoster(seciliVeri)}</b> göstergesinde Düzey 1 bölgeleri arasında farklılıklar görülmektedir.
                    {duzey1IstatistikOzeti.farkKati !== null && <> En yüksek ve en düşük değer arasındaki fark yaklaşık <span style={{ color: "#4f8f4f", fontWeight: "700" }}>{formatOzetDegeri(duzey1IstatistikOzeti.farkKati)} kat</span> düzeyindedir.</>}
                    <span> Toplam <b>{duzey1IstatistikOzeti.bolgeSayisi} bölge</b> üzerinden değerlendirme yapılmaktadır.</span>
                  </p>
                  <div style={{ display: "grid", gridRow: "4", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", width: "100%" }}>
                    <div style={{ background: "linear-gradient(180deg, #f5faf4 0%, #edf6eb 100%)", border: "1px solid #d9e9d6", borderTop: "3px solid #6ca26c", borderRadius: "10px", padding: "13px 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "120px" }}>
                      <div style={{ fontSize: "11px", color: "#6b7d6b", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>EN YÜKSEK BÖLGE</div>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#3f7f3f" }}>{duzey1IstatistikOzeti.enYuksek.kod}</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#495057", marginTop: "3px" }}>{formatOzetDegeri(duzey1IstatistikOzeti.enYuksek.deger)}</div>
                    </div>
                    <div style={{ background: "linear-gradient(180deg, #f7fbf6 0%, #eef7ed 100%)", border: "1px solid #d9e9d6", borderTop: "3px solid #8abf86", borderRadius: "10px", padding: "13px 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "120px" }}>
                      <div style={{ fontSize: "11px", color: "#718371", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>EN DÜŞÜK BÖLGE</div>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#4f8f4f" }}>{duzey1IstatistikOzeti.enDusuk.kod}</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#495057", marginTop: "3px" }}>{formatOzetDegeri(duzey1IstatistikOzeti.enDusuk.deger)}</div>
                    </div>
                    <div style={{ background: "linear-gradient(180deg, #f8fbf7 0%, #f0f7ef 100%)", border: "1px solid #d9e9d6", borderTop: "3px solid #a7cba2", borderRadius: "10px", padding: "13px 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "120px" }}>
                      <div style={{ fontSize: "11px", color: "#718371", fontWeight: "700", letterSpacing: "0.4px", marginBottom: "6px" }}>TÜRKİYE ORTALAMASI</div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "#4f8f4f" }}>{formatOzetDegeri(duzey1IstatistikOzeti.ortalama)}</div>
                      <div style={{ fontSize: "11px", color: "#7b827b", marginTop: "4px" }}>{duzey1IstatistikOzeti.bolgeSayisi} bölge üzerinden</div>
                    </div>
                  </div>
                </div>
              ) : <div style={{ fontSize: "14px", color: "#868e96", paddingTop: "12px" }}>Gösterilecek istatistik bulunamadı.</div>}
            </div>

            <div className="analiz-harita-duzey-1" style={{ backgroundColor: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", position: "relative" }}>
              <MapContainer center={[39.0, 35.0]} zoom={5.4} attributionControl={false} style={{ height: "100%", width: "100%", background: "transparent" }}>
                {geoDuzey1Data && (
                  <GeoJSON
                    key={`duzey1-${seciliKategori}-${seciliVeri}-${seciliYil}`}
                    data={geoDuzey1Data}
                    style={d1HaritaStili}
                    onEachFeature={onEachDuzey1Feature}
                  />
                )}
              </MapContainer>
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#343a40", fontSize: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                <span>En Yüksek 10 Bölge Dağılımı</span>
                <span style={{ fontSize: "12px", color: "#888", fontWeight: "normal" }}>{seciliYil}</span>
              </h3>
              <div style={{ flex: 1, width: "100%", minHeight: "220px" }}>
                {duzey1GrafikVerisi.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={duzey1GrafikVerisi} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                      <XAxis dataKey="il" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#495057' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#495057' }} tickFormatter={(val) => Number(val).toLocaleString('tr-TR')} width={80} />
                      <RechartsTooltip content={<Duzey1OzelTooltip />} cursor={{fill: '#f8f9fa'}} />
                      <Bar dataKey="deger" radius={[4, 4, 0, 0]}>
                        {duzey1GrafikVerisi.map((entry, index) => <Cell key={`d1-cell-${index}`} fill={duzey1GrafikRenkleri[entry.deger]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#868e96", fontSize: "14px" }}>Gösterilecek veri bulunamadı.</div>}
              </div>
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#343a40", fontSize: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                <span>Tüm Düzey 1 Bölgelerinin Kendi İçindeki Oranı</span>
                <span style={{ fontSize: "12px", color: "#888", fontWeight: "normal" }}>{seciliYil}</span>
              </h3>
              <div style={{ flex: 1, width: "100%", minHeight: "220px" }}>
                {duzey1TreemapVerisi.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap data={duzey1TreemapVerisi} dataKey="size" aspectRatio={4 / 3} content={<Duzey1TreemapCustomContent />}>
                      <RechartsTooltip content={<Duzey1OzelTooltip />} />
                    </Treemap>
                  </ResponsiveContainer>
                ) : <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#868e96", fontSize: "14px" }}>Gösterilecek veri bulunamadı.</div>}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default App;