export type ChapterColor = "paper" | "stone" | "fog" | "sage" | "night";

export interface Chapter {
  id: string;
  num: number;
  title: string;
  titleHindi?: string;
  year: string;
  color: ChapterColor;
  tags: string[];
  text: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  imagePosition?: "left" | "right";
  pullQuote?: string;
}

export interface Institution {
  id: string;
  name: string;
  hindiName?: string;
  location: string;
  year: number;
  description: string;
  image?: string;
  imageAlt?: string;
  url?: string;
}

export interface Award {
  id: string;
  year: number;
  title: string;
  presenter: string;
  category: "professional" | "literature";
  image?: string;
  imageAlt?: string;
}

export interface Wish {
  id: string;
  name: string;
  department?: string;
  message: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  name: string;
  department?: string;
  message: string;
  timestamp: number;
}

export interface Quote {
  id: string;
  text: string;
  attribution: string;
  role?: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  aspect?: "landscape" | "portrait" | "square";
}

export const BIRTHDAY_DATE = new Date("2026-09-22T00:00:00");
export const BIRTH_YEAR = 1955;
export const AGE = 71;

export const chapters: Chapter[] = [
  {
    id: "origins",
    num: 1,
    title: "Origins",
    titleHindi: "उत्पत्ति",
    year: "1955",
    color: "paper",
    tags: ["Khandwa", "Family", "Early Life"],
    text: "Born on 22nd September 1955 in Khandwa, Madhya Pradesh, to Mr. J.P. Choubey and Mrs. Sharda Choubey. Attended Government Multipurpose Higher Secondary School, Khandwa — a small town that would shape his lifelong commitment to India's underserved hinterlands.",
    image: "/images/history31.webp",
    imageAlt: "Mr. J.P. Chaubey and Mrs. Sharda Chaubey",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "right",
  },
  {
    id: "formation",
    num: 2,
    title: "Formation",
    titleHindi: "संस्कार",
    year: "1977",
    color: "stone",
    tags: ["MANIT", "Engineering", "Civil Services"],
    text: "Selected for Bachelor of Engineering in Electronics & Communication at MANIT, Bhopal. Later selected for both the Indian Engineering Services and the Indian Civil Services — but chose to walk a far more uncertain path, one that led him into the underserved heartland of the country.",
    image: "/images/history27.webp",
    imageAlt: "Santosh Choubey early career",
    imagePosition: "left",
  },
  {
    id: "aisect",
    num: 3,
    title: "AISECT",
    titleHindi: "AISECT की स्थापना",
    year: "1985",
    color: "fog",
    tags: ["Digital Divide", "Rural India", "Mission"],
    text: "In 1985, he founded AISECT — All India Society for Electronics and Computer Technology — with a bold mission: to bridge the digital and knowledge divide between India's cities and its villages. At a time when technology was unfamiliar to most rural communities, Choubey believed national progress could only be achieved if opportunity reached the last mile.",
    image: "/images/history22.webp",
    imageAlt: "AISECT founding",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "right",
  },
  {
    id: "writer",
    num: 4,
    title: "The Writer",
    titleHindi: "लेखक",
    year: "1986",
    color: "paper",
    tags: ["First Book", "Electroniki", "Science Writing"],
    text: "Published his first book on computers in Hindi — 'कंप्यूटर एक परिचय' — winning the Meghnad Saha Award for Science Writing. In 1989, launched Electroniki, the first Indian magazine on electronics and computers in Hindi, published continuously for over 35 years. Has since authored over 70 literary works and 100 books on science and technology.",
    image: "/images/history21.webp",
    imageAlt: "First book on computers in Hindi",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "left",
  },
  {
    id: "literacy",
    num: 5,
    title: "Literacy & Culture",
    titleHindi: "साक्षरता एवं संस्कृति",
    year: "1992",
    color: "sage",
    tags: ["Literacy Campaigns", "Vanmali", "Art Forms"],
    text: "Made leading contributions to the Indian literacy movement through campaigns in undivided Madhya Pradesh, using art forms for the promotion of science and literacy in rural areas. In 1991, established Vanmali Srijan Peeth and over 114 Vanmali Srijan Kendras — grassroots cultural initiatives providing platforms to local talents across the state.",
    image: "/images/history20.webp",
    imageAlt: "Literacy campaigns in rural Madhya Pradesh",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "right",
  },
  {
    id: "recognition",
    num: 6,
    title: "Recognition",
    titleHindi: "मान्यता",
    year: "2005",
    color: "stone",
    tags: ["World Bank", "Dr. Kalam", "NASSCOM"],
    text: "AISECT's Multipurpose IT Centre model was acknowledged and published in IIM-Ahmedabad and World Bank reports. Received the Indian Innovation Award and NASSCOM I.T. Innovation Award from President Dr. A.P.J. Abdul Kalam — recognition that rural IT delivery could scale nationally.",
    image: "/images/history14.webp",
    imageAlt: "Indian Innovation Award from Dr. Kalam",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "left",
  },
  {
    id: "scale",
    num: 7,
    title: "Scale",
    titleHindi: "विस्तार",
    year: "2012",
    color: "fog",
    tags: ["58,000 Centres", "Financial Inclusion", "Pan-India"],
    text: "From a single room in 1985 to 58,000 centres and offices across 655 districts in 28 states. AISECT became India's leading IT training network, a prominent financial inclusion network engaging in banking, insurance, and UID activities with leading banks — training over 36 lakh people and impacting 50 lakh lives.",
    image: "/images/network-map.webp",
    imageAlt: "AISECT network across India",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "right",
  },
  {
    id: "universities",
    num: 8,
    title: "Universities",
    titleHindi: "विश्वविद्यालय",
    year: "2010",
    color: "paper",
    tags: ["RNTU", "CVRU", "SCOPE", "NEP"],
    text: "Established a network of universities: Rabindranath Tagore University in Raisen (2010) — Central India's first private university in an underdeveloped district; Dr. C.V. Raman University in Bilaspur (2006), Bihar (2017), and his birthplace Khandwa (2018); AISECT University in Hazaribagh (2016); and SCOPE Global Skills University in Bhopal (2023) — Central India's first NEP and NSQF aligned skills university.",
    image: "/images/rntu-inogration.webp",
    imageAlt: "Rabindranath Tagore University inauguration",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "left",
  },
  {
    id: "culture",
    num: 9,
    title: "Culture & Arts",
    titleHindi: "संस्कृति एवं कला",
    year: "2019",
    color: "sage",
    tags: ["Vishwarang", "Drama", "Mauritius"],
    text: "Vishwarang — a global cultural festival celebrating Indian literature, art, music, and cinema — was launched in 2019 at RNTU. Its 6th edition in Mauritius (2024) brought together 300 delegates from 21 countries across five continents. Established the Tagore National School of Drama in 2021 — the first drama academy run by a private university.",
    image: "/images/vishwarang-mauritius.webp",
    imageAlt: "Vishwarang International, Mauritius",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "right",
  },
  {
    id: "legacy",
    num: 10,
    title: "Literary Legacy",
    titleHindi: "साहित्यिक विरासत",
    year: "2026",
    color: "night",
    tags: ["70+ Works", "Awards", "Poetry"],
    text: "Over 70 literary works spanning novels, poetry, science writing, and cultural criticism. Recipient of the Bharat Gaurav Award (Paris), International Max Muller Award, Madhya Pradesh Ratna, Schwab Foundation Award, and lifetime achievement honors from MANIT, CSIR-AMPRI, and the Prafulla Chandra Ray Foundation. His novels — Jaltarang, Moscow Diary, Sapno ki Duniya mein Black Hole — have won multiple national and international literary awards.",
    image: "/images/gallery-1.webp",
    imageAlt: "Santosh Choubey",
    imageCaption: "Photographs: santoshchoubey.com",
    imagePosition: "right",
    pullQuote: "आना जब मेरे अच्छे दिन हों. जब दिल में निष्कपट ज्योति की तरह जलती हो तुम्हारी क्षीण याद.",
  },
];

export const institutions: Institution[] = [
  {
    id: "rntu",
    name: "Rabindranath Tagore University",
    hindiName: "रबीन्द्रनाथ टैगोर विश्वविद्यालय",
    location: "Bhopal, M.P.",
    year: 2010,
    description: "1st private university in central India in an underdeveloped district of Raisen. Focuses on Arts, Humanities and Liberal arts. First to implement NEP in Madhya Pradesh.",
    image: "/images/tagore.webp",
    imageAlt: "Rabindranath Tagore University",
    url: "https://rntu.ac.in/",
  },
  {
    id: "aisect-university",
    name: "AISECT University",
    hindiName: "AISECT विश्वविद्यालय",
    location: "Hazaribagh, Jharkhand",
    year: 2016,
    description: "Region's first private University and the first Skills University of the State. A change maker in this LWE district.",
    image: "/images/aisect-university.webp",
    imageAlt: "AISECT University",
    url: "https://www.aisectuniversityjharkhand.ac.in/",
  },
  {
    id: "cvru-bihar",
    name: "Dr. C.V. Raman University, Bihar",
    hindiName: "डॉ. सी.वी. रमन विश्वविद्यालय, बिहार",
    location: "Vaishali, Bihar",
    year: 2017,
    description: "First private university in the region of North Bihar. Known for Engineering and Skill education. Also has a Buddhist study Centre.",
    image: "/images/raman2.webp",
    imageAlt: "Dr. C.V. Raman University, Bihar",
    url: "https://www.cvrubihar.ac.in/",
  },
  {
    id: "cvru-mp",
    name: "Dr. C.V. Raman University, M.P.",
    hindiName: "डॉ. सी.वी. रमन विश्वविद्यालय, म.प्र.",
    location: "Khandwa, M.P.",
    year: 2018,
    description: "Established in his birthplace Khandwa. Focuses on Agriculture Education and Research, Social Work and Rural Development. First to send students to Germany.",
    image: "/images/raman2-1.webp",
    imageAlt: "Dr. C.V. Raman University, Khandwa",
    url: "https://www.cvrump.ac.in/",
  },
  {
    id: "scope",
    name: "SCOPE Global Skill University",
    hindiName: "स्कोप ग्लोबल स्किल्स यूनिवर्सिटी",
    location: "Bhopal, M.P.",
    year: 2023,
    description: "Central India's First NEP and NSQF Aligned Skills University. Has over ten centres of Excellence on Campus with leading Industries.",
    image: "/images/scope.webp",
    imageAlt: "SCOPE Global Skill University",
    url: "https://sgsuniversity.ac.in/",
  },
  {
    id: "cvru-cg",
    name: "Dr. C.V. Raman University, C.G.",
    hindiName: "डॉ. सी.वी. रमन विश्वविद्यालय, छ.ग.",
    location: "Bilaspur, C.G.",
    year: 2006,
    description: "Set up in a scheduled tribal block. Named after Nobel laureate Sir C.V. Raman. Focuses on Science and Technology education, skill development, sports.",
    image: "/images/cvru-cg.webp",
    imageAlt: "Dr. C.V. Raman University, C.G.",
    url: "https://cvru.ac.in/",
  },
];

export const culturalInstitutions = [
  {
    id: "vanmali",
    name: "Vanmali Srijan Peeth",
    hindiName: "वनमाली सृजन पीठ",
    description: "Grassroots level literary and cultural initiative. Over 114 VSKs promote local arts and culture and provide platform to local talents.",
    image: "/images/vanmali-srijan-peet.webp",
  },
  {
    id: "tnsd",
    name: "Tagore National School of Drama",
    hindiName: "टैगोर राष्ट्रीय नाट्य विद्यालय",
    description: "First drama academy run by a private university, established in July 2021.",
    image: "/images/drama.webp",
  },
  {
    id: "vishwarang-foundation",
    name: "Vishwarang Foundation",
    hindiName: "विश्वरंग फाउंडेशन",
    description: "Global literary and arts festival celebrating India's multilingual and multicultural heritage.",
    image: "/images/foundation.webp",
  },
];

export const awards: Award[] = [
  { id: "a1", year: 2024, title: "Bharat Gaurav Award", presenter: "Paris, France", category: "professional" },
  { id: "a2", year: 2024, title: "Vishwa Hindi Shikhar Samman", presenter: "Singapore", category: "professional" },
  { id: "a3", year: 2024, title: "Prafulla Chandra Ray Life Time Achievement Award", presenter: "for Science Communication", category: "professional" },
  { id: "a4", year: 2020, title: "Rashtriya Gunakar Muley Samman", presenter: "for Science in Hindi", category: "professional" },
  { id: "a5", year: 2019, title: "Madhya Pradesh Ratna Award", presenter: "from CM, M.P.", category: "professional" },
  { id: "a6", year: 2019, title: "CSIR-AMPRI Life Time Achievement Award", presenter: "for Science Communication", category: "professional" },
  { id: "a7", year: 2017, title: "World Education Summit Award", presenter: "Dubai", category: "professional" },
  { id: "a8", year: 2017, title: "ASSOCHAM India Leadership Award", presenter: "for Social Entrepreneurship", category: "professional" },
  { id: "a9", year: 2015, title: "Excellence in Skill Development Award", presenter: "By NSDC (GOI)", category: "professional" },
  { id: "a10", year: 2014, title: "ASSOCHAM Skill India Award", presenter: "for Skill Education", category: "professional" },
  { id: "a11", year: 2013, title: "SKOCH Renaissance Award", presenter: "for Skills Education", category: "professional" },
  { id: "a12", year: 2013, title: "Life Time Achievement Award", presenter: "by MANIT (NIT, MHRD)", category: "professional" },
  { id: "a13", year: 2011, title: "Senior Ashoka Fellowship Award", presenter: "for Social Entrepreneurship", category: "professional" },
  { id: "a14", year: 2010, title: "Schwab Foundation Award", presenter: "for Social Entrepreneurship", category: "professional" },
  { id: "a15", year: 2009, title: "NASSCOM Emerge 50 Leader Award", presenter: "in IT by NASSCOM", category: "professional" },
  { id: "a16", year: 2007, title: "Asian Forum i4d IT for Development Award", presenter: "Kualalumpur, Malaysia", category: "professional" },
  { id: "a17", year: 2006, title: "NASSCOM I.T. Innovation Award", presenter: "by President Dr. A.P.J. Abdul Kalam", category: "professional", image: "/images/award-nasscom-2006.webp" },
  { id: "a18", year: 2005, title: "Indian Innovation Award", presenter: "by President Dr. A.P.J. Abdul Kalam", category: "professional", image: "/images/award-innovation-2005.webp" },
  { id: "a19", year: 1987, title: "National Award for Science Communication", presenter: "", category: "professional" },
  { id: "a20", year: 1986, title: "Meghnad Saha Award", presenter: "for Science Writing", category: "professional", image: "/images/award-meghnad-saha.webp" },
  { id: "l1", year: 2026, title: "Karmaveer Samman", presenter: "", category: "literature" },
  { id: "l2", year: 2026, title: "National Shabd Nirantar Samman", presenter: "", category: "literature" },
  { id: "l3", year: 2026, title: "Ati Vishisht Sahitya Vibhushan Samman", presenter: "", category: "literature" },
  { id: "l4", year: 2026, title: "Mahatma Hansraj National Award", presenter: "", category: "literature" },
  { id: "l5", year: 2025, title: "International Max Müller Award", presenter: "by Saajha Sansar Foundation", category: "literature" },
  { id: "l6", year: 2025, title: "Sudirgh Seva Samman", presenter: "", category: "literature" },
  { id: "l7", year: 2025, title: "Ravirang Sahitya Sadhna Samman", presenter: "", category: "literature" },
  { id: "l8", year: 2024, title: "Param Vishishth Sahitya Vibhushan Samman", presenter: "Mahakavi Kalidas Samman", category: "literature" },
  { id: "l9", year: 2024, title: "Draksharatna Award", presenter: "for Novel 'Sapno ki duniya me black hole'", category: "literature" },
  { id: "l10", year: 2024, title: "Shatabdi Samman", presenter: "by Madhya Bharat Hindi Sahitya Samiti, Indore", category: "literature" },
  { id: "l11", year: 2023, title: "'Vatayan UK' Shikhar Samman", presenter: "London", category: "literature", image: "/images/award-vatayan-2023.webp" },
  { id: "l12", year: 2023, title: "'Pandit Tilak Raj Sharma Niyas Shikhar Samman", presenter: "New York", category: "literature" },
  { id: "l13", year: 2022, title: "Chanakya Award", presenter: "from Higher Education Minister", category: "literature" },
  { id: "l14", year: 2020, title: "Rashtriya Dushyant Alankaran", presenter: "for Life Time Achievements in literature", category: "literature" },
  { id: "l15", year: 2020, title: "Rashtriya Shiv Mangal Singh Suman Samman", presenter: "for promotion of Arts and Literature", category: "literature" },
  { id: "l16", year: 2017, title: "Shailesh Matiyani Award", presenter: "for novel Jaltarang", category: "literature" },
  { id: "l17", year: 2016, title: "Valley of Words Award", presenter: "for novel Jaltarang", category: "literature" },
  { id: "l18", year: 1995, title: "Hazarilal Raghuvanshi Award", presenter: "for Moscow Diary", category: "literature" },
  { id: "l19", year: 1990, title: "Dushyant Kumar Award", presenter: "for Poetry, MP Sahitya Academy", category: "literature" },
];

export const quotes: Quote[] = [
  {
    id: "q1",
    text: "यह जानकर प्रसन्नता हुई है कि विश्व हिन्दी सचिवालय की भारत एवं मॉरीशस इकाइयों एवं रबीन्द्रनाथ टैगोर विश्वविद्यालय, भोपाल द्वारा मॉरीशस में विश्व रंग महोत्सव का आयोजन किया जा रहा है। भाषा, साहित्य, कला एवं संस्कृति को बढ़ावा देते हुए इस वार्षिक कार्यक्रम का आयोजन सराहनीय है।",
    attribution: "नरेन्द्र मोदी",
    role: "प्रधानमंत्री, भारत",
  },
  {
    id: "q2",
    text: "I appreciate the AISECT's efforts in taking IT to people.",
    attribution: "Dr. A.P.J. Abdul Kalam",
    role: "President, GoI in Indian Innovation Awards, 2006",
  },
  {
    id: "q3",
    text: "I would like to congratulate the Chancellor, Rabindranath Tagore University, for promoting Indian Culture in Global Arena in the name of Gurudev Rabindranath Tagore.",
    attribution: "Pranab Mukherjee",
    role: "former President, GoI in Vishwa Rang 2019",
  },
  {
    id: "q4",
    text: "I am thankful to Shri Santosh Choubey and to Vishwa Rang Committee for bringing Vishwa Rang festival to Mauritius.",
    attribution: "Pravin Jagnauth",
    role: "Prime Minister of Mauritius at Vishwa Rang 2024",
  },
  {
    id: "q5",
    text: "Vishwa Rang is the largest cultural festival of Asia, promoted by Rabindranath Tagore University.",
    attribution: "Lalji Tandon",
    role: "Hon. Governor of M.P.",
  },
];

export const galleryImages: GalleryImage[] = [
  { id: "g1", src: "/images/gallery-1.webp", alt: "Santosh Choubey at an event", caption: "Photographs: santoshchoubey.com", aspect: "landscape" },
  { id: "g2", src: "/images/gallery-2.webp", alt: "Addressing students", caption: "Photographs: santoshchoubey.com", aspect: "portrait" },
  { id: "g3", src: "/images/gallery-3.webp", alt: "At a cultural event", caption: "Photographs: santoshchoubey.com", aspect: "square" },
  { id: "g4", src: "/images/gallery-4.webp", alt: "At Vishwarang Festival", caption: "Photographs: santoshchoubey.com", aspect: "landscape" },
  { id: "g5", src: "/images/gallery-5.webp", alt: "Receiving an award", caption: "Photographs: santoshchoubey.com", aspect: "portrait" },
  { id: "g6", src: "/images/gallery-6.webp", alt: "With colleagues", caption: "Photographs: santoshchoubey.com", aspect: "landscape" },
  { id: "g7", src: "/images/vishwarang-mauritius.webp", alt: "Vishwarang Mauritius", caption: "Vishwarang International, Mauritius. Photographs: santoshchoubey.com", aspect: "landscape" },
  { id: "g8", src: "/images/profile-with-book.webp", alt: "With publications", caption: "Photographs: santoshchoubey.com", aspect: "portrait" },
];

export const impactStats: Array<{
  id: string;
  number: number;
  label: string;
  suffix?: string;
  formattedValue?: string;
  source: string;
}> = [
  { id: "centres", number: 58000, label: "Centers and Offices", source: "santoshchoubey.com" },
  { id: "districts", number: 655, label: "Districts", source: "santoshchoubey.com" },
  { id: "states", number: 28, label: "States", source: "santoshchoubey.com" },
  { id: "trained", number: 3600000, label: "People Trained", formattedValue: "36 lakh+", source: "santoshchoubey.com" },
  { id: "impacted", number: 5000000, label: "Lives Impacted", formattedValue: "50 lakh+", source: "santoshchoubey.com" },
  { id: "books", number: 70, label: "Literary Works", source: "santoshchoubey.com" },
];

export const poem = {
  title: "आना जब मेरे अच्छे दिन हों",
  lines: [
    "आना जब मेरे अच्छे दिन हों.",
    "जब दिल में निष्कपट ज्योति की तरह",
    "जलती हो तुम्हारी क्षीण याद",
    "और नीली लौ की तरह",
    "कभी कभी चुभती हो इच्छा.",
    "",
    "जब मन के अछूते कोने में",
    "सहेजे तुम्हारे चित्र पर",
    "चढ़ी न हो धूल की परत",
    "आना जैसे बारिश में अचानक",
    "आ जाए कोई अच्छी सी पुस्तक हाथ",
    "या कि गर्मी में छत पर सोते हुए",
    "दिखे कोई अच्छा सा सपना।",
  ],
  collection: "घर-बाहर संग्रह से",
};
