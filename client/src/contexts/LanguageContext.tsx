import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "hi" | "te";

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  decisionSupport: string;
  startHere: string;
  moreWorkspaces: string;
  
  // Navigation items
  dashboard: string;
  map: string;
  riskAssessment: string;
  siteCapacity: string;
  relocation: string;
  datasetLab: string;
  historicalReplay: string;
  whatIfSimulation: string;
  caseStudies: string;
  reports: string;
  
  // Header & Search
  searchPlaceholder: string;
  resetLocation: string;
  openReports: string;
  languageSelect: string;
  
  // Metrics
  assessmentAreas: string;
  criticalAreas: string;
  highPriorityActions: string;
  populationExposed: string;
  people: string;
  unavailable: string;
  
  // Map & Controls
  layers: string;
  baseStyle: string;
  muted: string;
  terrain: string;
  mode2d: string;
  mode3d: string;
  mode3dUnavailable: string;
  zoomIn: string;
  zoomOut: string;
  recenter: string;
  resetNorth: string;
  overlayOpacity: string;
  
  // Map Legend
  mapLegend: string;
  redZoneVulnerable: string;
  orangeZoneWarning: string;
  greenZoneSafeHaven: string;
  evacuationRoute: string;
  osmFacilities: string;
  statusVerified: string;
  statusSimulated: string;
  statusUnavailable: string;
  
  // Risk Metrics (Phase 9 clarity)
  geographicVulnerability: string;
  activeWeatherStress: string;
  responsePriority: string;
  screeningRisk: string;
  
  // Weather & Forecast
  weatherForecast7Day: string;
  currentConditions: string;
  temperature: string;
  precipitation: string;
  airQuality: string;
  windSpeed: string;
  liveWeatherFeed: string;
  
  // Facility & Relocation
  facilities: string;
  facilityUnavailableReason: string;
  evacuationDestinations: string;
  drivingDistance: string;
  estimatedTravelTime: string;
  routeUnavailableReason: string;
  
  // SOS & Emergency (Phase 4 & 5)
  sosButton: string;
  sosTitle: string;
  sosSubtitle: string;
  emergencyCategory: string;
  catMedical: string;
  catFlood: string;
  catLandslide: string;
  catCyclone: string;
  catEvacuation: string;
  catOther: string;
  sendSos: string;
  sendingSos: string;
  cancel: string;
  close: string;
  sosSent: string;
  sosAcknowledged: string;
  sosResolved: string;
  sosFailed: string;
  localBeepPlayed: string;
  localBeepNotice: string;
  responderDeliveryNotice: string;
  demoSimulationBadge: string;
  locationPermissionDenied: string;
  networkUnavailable: string;
  responderDashboard: string;
  acknowledgeDispatch: string;
  resolveDispatch: string;
  
  // AI Assistant (Phase 3)
  aiAssistantTitle: string;
  aiAssistantSubtitle: string;
  aiDisclaimer: string;
  askAssistantPlaceholder: string;
  aiQuestionPrimaryHazard: string;
  aiQuestionSecondaryHazards: string;
  aiQuestionWhyClassified: string;
  aiQuestionExposedHabitation: string;
  aiQuestionRelocationPriority: string;
  aiQuestionFacilitiesAvailable: string;
  aiQuestionFacilityCapacity: string;
  aiQuestionSelectedDestination: string;
  aiQuestionRouteAvailable: string;
  aiQuestionUnavailableData: string;
  aiQuestionResponderNextSteps: string;
  aiFallbackNotice: string;
  
  // Common Data Status Badges
  badgeLive: string;
  badgeSimulated: string;
  badgeReference: string;
  badgeDerived: string;
  badgeUnavailable: string;
}

const en: TranslationDictionary = {
  appName: "ResQ",
  tagline: "Disaster Intelligence & Vulnerability Assessment",
  decisionSupport: "Decision Support",
  startHere: "Start Here",
  moreWorkspaces: "More Workspaces",
  
  dashboard: "Dashboard",
  map: "Map Command",
  riskAssessment: "Risk Assessment",
  siteCapacity: "Site Capacity",
  relocation: "Relocation Queue",
  datasetLab: "Dataset Lab",
  historicalReplay: "Historical Replay",
  whatIfSimulation: "What-If Simulation",
  caseStudies: "Case Studies",
  reports: "Permanent Reports",
  
  searchPlaceholder: "Search India: state, district, city, or area",
  resetLocation: "Reset India Location",
  openReports: "Open Persistent Reports",
  languageSelect: "Language",
  
  assessmentAreas: "Assessment Areas",
  criticalAreas: "Critical Hazard Areas",
  highPriorityActions: "Immediate Relocations",
  populationExposed: "Exposed Population",
  people: "people",
  unavailable: "Unavailable",
  
  layers: "Map Layers",
  baseStyle: "Base Style",
  muted: "Muted",
  terrain: "Terrain",
  mode2d: "2D Map",
  mode3d: "3D Elevation",
  mode3dUnavailable: "3D terrain data unavailable (using 2D fallback)",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  recenter: "Recenter on area",
  resetNorth: "Reset north",
  overlayOpacity: "Overlay opacity",
  
  mapLegend: "Persistent Map Legend",
  redZoneVulnerable: "Red Zone: Vulnerable Habitation (High Exposure)",
  orangeZoneWarning: "Orange Zone: Warning / Elevated Concern",
  greenZoneSafeHaven: "Green Zone: Safe Relocation Destination",
  evacuationRoute: "Road Evacuation Route (OSRM Turn-by-Turn)",
  osmFacilities: "Nearby Facilities (OpenStreetMap)",
  statusVerified: "VERIFIED",
  statusSimulated: "SIMULATED",
  statusUnavailable: "UNAVAILABLE",
  
  geographicVulnerability: "Geographic Vulnerability",
  activeWeatherStress: "Active Weather Stress Index",
  responsePriority: "Overall Response Priority",
  screeningRisk: "Screening Index",
  
  weatherForecast7Day: "7-Day Weather Forecast",
  currentConditions: "Current Meteorological Conditions",
  temperature: "Temperature",
  precipitation: "Precipitation",
  airQuality: "Air Quality",
  windSpeed: "Wind Speed",
  liveWeatherFeed: "LIVE WEATHER FEED",
  
  facilities: "Emergency Facilities",
  facilityUnavailableReason: "No verified facility records returned for this extent. OpenStreetMap coverage varies.",
  evacuationDestinations: "Safe Evacuation Destinations",
  drivingDistance: "Driving distance",
  estimatedTravelTime: "Estimated driving time",
  routeUnavailableReason: "No verified road route could be calculated between origin and destination.",
  
  sosButton: "EMERGENCY SOS",
  sosTitle: "Emergency SOS Dispatch",
  sosSubtitle: "Transmit high-priority distress alert with verified coordinates",
  emergencyCategory: "Emergency Category",
  catMedical: "Medical Emergency",
  catFlood: "Flash Flood / Inundation",
  catLandslide: "Landslide / Slope Failure",
  catCyclone: "High Wind / Cyclone",
  catEvacuation: "Stranded / Immediate Evacuation",
  catOther: "Other Life Safety Threat",
  sendSos: "TRANSMIT SOS ALERT",
  sendingSos: "Transmitting emergency dispatch…",
  cancel: "Cancel",
  close: "Close",
  sosSent: "SENT TO DISPATCH",
  sosAcknowledged: "ACKNOWLEDGED BY RESPONDERS",
  sosResolved: "DISPATCH RESOLVED",
  sosFailed: "DELIVERY UNAVAILABLE / FAILED",
  localBeepPlayed: "Local confirmation beep sounded on device",
  localBeepNotice: "Note: A local beep is NOT proof that responders have received this SOS. Check delivery status.",
  responderDeliveryNotice: "Responder delivery confirmation pending over live telemetry.",
  demoSimulationBadge: "DEMO / SIMULATED RESPONDER",
  locationPermissionDenied: "Device location permission was denied. Coordinate tracking is unavailable.",
  networkUnavailable: "Network connection is offline. Alert saved locally on device; remote delivery unconfirmed.",
  responderDashboard: "Responder SOS Command",
  acknowledgeDispatch: "Acknowledge SOS",
  resolveDispatch: "Mark Resolved",
  
  aiAssistantTitle: "ResQ AI Assistant",
  aiAssistantSubtitle: "Structured Decision-Support Intelligence",
  aiDisclaimer: "AI-generated explanation grounded exclusively in verified ResQ analysis. Not official government warning or advice.",
  askAssistantPlaceholder: "Ask about hazards, habitations, routes, or facilities…",
  aiQuestionPrimaryHazard: "What is the primary hazard at this location?",
  aiQuestionSecondaryHazards: "What are the secondary hazards?",
  aiQuestionWhyClassified: "Why is this location classified this way?",
  aiQuestionExposedHabitation: "Which habitation is exposed?",
  aiQuestionRelocationPriority: "What is the relocation priority?",
  aiQuestionFacilitiesAvailable: "What facilities are available?",
  aiQuestionFacilityCapacity: "Is facility capacity verified?",
  aiQuestionSelectedDestination: "What destination was selected?",
  aiQuestionRouteAvailable: "What road route is available?",
  aiQuestionUnavailableData: "What data is currently unavailable?",
  aiQuestionResponderNextSteps: "What should a responder check next?",
  aiFallbackNotice: "Deterministic grounded reasoning active (LLM offline or unavailable).",
  
  badgeLive: "LIVE",
  badgeSimulated: "SIMULATED",
  badgeReference: "STATIC / REFERENCE",
  badgeDerived: "DERIVED",
  badgeUnavailable: "UNAVAILABLE",
};

const hi: TranslationDictionary = {
  appName: "ResQ",
  tagline: "आपदा आसूचना एवं सुभेद्यता मूल्यांकन",
  decisionSupport: "निर्णय समर्थन",
  startHere: "यहाँ से शुरू करें",
  moreWorkspaces: "अन्य कार्यक्षेत्र",
  
  dashboard: "डैशबोर्ड",
  map: "मानचित्र कमान",
  riskAssessment: "जोखिम मूल्यांकन",
  siteCapacity: "स्थल क्षमता",
  relocation: "पुनर्वास कतार",
  datasetLab: "डेटासेट लैब",
  historicalReplay: "ऐतिहासिक रीप्ले",
  whatIfSimulation: "सिमुलेशन (व्हाट-इफ)",
  caseStudies: "केस स्टडीज",
  reports: "स्थायी रिपोर्ट",
  
  searchPlaceholder: "भारत में खोजें: राज्य, ज़िला, शहर या क्षेत्र",
  resetLocation: "स्थान रीसेट करें",
  openReports: "स्थायी रिपोर्ट खोलें",
  languageSelect: "भाषा",
  
  assessmentAreas: "मूल्यांकन क्षेत्र",
  criticalAreas: "गंभीर आपदा क्षेत्र",
  highPriorityActions: "तत्काल स्थानांतरण",
  populationExposed: "प्रभावित जनसंख्या",
  people: "लोग",
  unavailable: "अनुपलब्ध",
  
  layers: "मानचित्र परतें",
  baseStyle: "आधार शैली",
  muted: "शांत",
  terrain: "भूभाग",
  mode2d: "2D मानचित्र",
  mode3d: "3D ऊंचाई",
  mode3dUnavailable: "3D भूभाग डेटा अनुपलब्ध है (2D पर वापस)",
  zoomIn: "ज़ूम इन",
  zoomOut: "ज़ूम आउट",
  recenter: "केंद्रित करें",
  resetNorth: "उत्तर दिशा रीसेट करें",
  overlayOpacity: "परत अपारदर्शिता",
  
  mapLegend: "मानचित्र संकेतिका",
  redZoneVulnerable: "लाल क्षेत्र: सुभेद्य बस्ती (उच्च जोखिम)",
  orangeZoneWarning: "नारंगी क्षेत्र: चेतावनी / सतर्कता आवश्यक",
  greenZoneSafeHaven: "हरा क्षेत्र: सुरक्षित आश्रय स्थल",
  evacuationRoute: "सड़क निकासी मार्ग (OSRM नेविगेशन)",
  osmFacilities: "आसपास की सुविधाएं (OpenStreetMap)",
  statusVerified: "सत्यापित",
  statusSimulated: "सिम्युलेटेड",
  statusUnavailable: "अनुपलब्ध",
  
  geographicVulnerability: "भौगोलिक सुभेद्यता",
  activeWeatherStress: "सक्रिय मौसम दबाव सूचकांक",
  responsePriority: "समग्र प्रतिक्रिया प्राथमिकता",
  screeningRisk: "स्क्रीनिंग सूचकांक",
  
  weatherForecast7Day: "7-दिवसीय मौसम पूर्वानुमान",
  currentConditions: "वर्तमान मौसम स्थितियां",
  temperature: "तापमान",
  precipitation: "वर्षा",
  airQuality: "वायु गुणवत्ता",
  windSpeed: "हवा की गति",
  liveWeatherFeed: "लाइव मौसम फीड",
  
  facilities: "आपातकालीन सुविधाएं",
  facilityUnavailableReason: "इस क्षेत्र के लिए कोई सत्यापित सुविधा रिकॉर्ड प्राप्त नहीं हुआ।",
  evacuationDestinations: "सुरक्षित निकासी गंतव्य",
  drivingDistance: "ड्राइविंग दूरी",
  estimatedTravelTime: "अनुमानित ड्राइविंग समय",
  routeUnavailableReason: "प्रारंभिक बिंदु और गंतव्य के बीच कोई सत्यापित सड़क मार्ग नहीं मिला।",
  
  sosButton: "आपातकालीन SOS",
  sosTitle: "आपातकालीन SOS प्रेषण",
  sosSubtitle: "सत्यापित निर्देशांकों के साथ उच्च प्राथमिकता संकट चेतावनी भेजें",
  emergencyCategory: "आपातकालीन श्रेणी",
  catMedical: "चिकित्सा आपातकाल",
  catFlood: "आकस्मिक बाढ़ / जलभराव",
  catLandslide: "भूस्खलन",
  catCyclone: "तेज आंधी / चक्रवात",
  catEvacuation: "फंसे हुए लोग / तत्काल निकासी",
  catOther: "अन्य जीवन रक्षा खतरा",
  sendSos: "SOS चेतावनी भेजें",
  sendingSos: "आपातकालीन चेतावनी भेजी जा रही है…",
  cancel: "रद्द करें",
  close: "बंद करें",
  sosSent: "प्रेषित",
  sosAcknowledged: "स्वीकृत (रिस्पॉन्डर)",
  sosResolved: "हल किया गया",
  sosFailed: "वितरण अनुपलब्ध / विफल",
  localBeepPlayed: "डिवाइस पर स्थानीय पुष्टि बीप बजी",
  localBeepNotice: "ध्यान दें: स्थानीय बीप इस बात का प्रमाण नहीं है कि आपातकालीन दल को संदेश मिल गया है।",
  responderDeliveryNotice: "लाइव नेटवर्क पर आपातकालीन दल को डिलीवरी की पुष्टि लंबित है।",
  demoSimulationBadge: "डेमो / सिम्युलेटेड रिस्पॉन्डर",
  locationPermissionDenied: "डिवाइस स्थान अनुमति अस्वीकृत कर दी गई।",
  networkUnavailable: "नेटवर्क ऑफलाइन है। चेतावनी डिवाइस पर स्थानीय रूप से सुरक्षित की गई है।",
  responderDashboard: "रिस्पॉन्डर SOS कमान",
  acknowledgeDispatch: "स्वीकार करें",
  resolveDispatch: "पूर्ण चिह्नित करें",
  
  aiAssistantTitle: "ResQ AI सहायक",
  aiAssistantSubtitle: "संरचित निर्णय-समर्थन आसूचना",
  aiDisclaimer: "ResQ के सत्यापित विश्लेषण पर आधारित AI व्याख्या। यह आधिकारिक सरकारी सलाह नहीं है।",
  askAssistantPlaceholder: "आपदाओं, बस्तियों, मार्गों या सुविधाओं के बारे में पूछें…",
  aiQuestionPrimaryHazard: "इस स्थान पर प्राथमिक खतरा क्या है?",
  aiQuestionSecondaryHazards: "द्वितीयक खतरे कौन-से हैं?",
  aiQuestionWhyClassified: "इस स्थान को इस प्रकार क्यों वर्गीकृत किया गया है?",
  aiQuestionExposedHabitation: "कौन-सी बस्ती प्रभावित है?",
  aiQuestionRelocationPriority: "स्थानांतरण प्राथमिकता क्या है?",
  aiQuestionFacilitiesAvailable: "कौन-सी सुविधाएं उपलब्ध हैं?",
  aiQuestionFacilityCapacity: "क्या सुविधा क्षमता सत्यापित है?",
  aiQuestionSelectedDestination: "कौन-सा सुरक्षित गंतव्य चुना गया?",
  aiQuestionRouteAvailable: "कौन-सा सड़क निकासी मार्ग उपलब्ध है?",
  aiQuestionUnavailableData: "वर्तमान में कौन-सा डेटा अनुपलब्ध है?",
  aiQuestionResponderNextSteps: "राहत दल को आगे क्या जांचना चाहिए?",
  aiFallbackNotice: "नियतकालिक विश्लेषण सक्रिय (LLM अनुपलब्ध)।",
  
  badgeLive: "लाइव",
  badgeSimulated: "सिम्युलेटेड",
  badgeReference: "स्थिर / संदर्भ",
  badgeDerived: "व्युत्पन्न",
  badgeUnavailable: "अनुपलब्ध",
};

const te: TranslationDictionary = {
  appName: "ResQ",
  tagline: "విపత్తు నిఘా మరియు ప్రమాద తీవ్రత విశ్లేషణ",
  decisionSupport: "నిర్ణయ మద్దతు",
  startHere: "ఇక్కడి నుండి ప్రారంభించండి",
  moreWorkspaces: "మరిన్ని వర్క్‌స్పేస్‌లు",
  
  dashboard: "డ్యాష్‌బోర్డ్",
  map: "మ్యాప్ కమాండ్",
  riskAssessment: "ప్రమాద అంచనా",
  siteCapacity: "కేంద్రాల సామర్థ్యం",
  relocation: "పునరావాస ప్రాధాన్యత",
  datasetLab: "డేటాసెట్ ల్యాబ్",
  historicalReplay: "గత సంఘటనల రీప్లే",
  whatIfSimulation: "సిమ్యులేషన్ (వాట్-ఇఫ్)",
  caseStudies: "కేస్ స్టడీస్",
  reports: "శాశ్వత నివేదికలు",
  
  searchPlaceholder: "భారతదేశంలో వెతకండి: రాష్ట్రం, జిల్లా, నగరం లేదా ప్రాంతం",
  resetLocation: "ప్రాంతాన్ని రీసెట్ చేయండి",
  openReports: "నివేదికలు చూడండి",
  languageSelect: "భాష",
  
  assessmentAreas: "అంచనా ప్రాంతాలు",
  criticalAreas: "తీవ్ర విపత్తు ప్రాంతాలు",
  highPriorityActions: "తక్షణ తరలింపు చర్యలు",
  populationExposed: "ప్రభావిత జనాభా",
  people: "మంది",
  unavailable: "అందుబాటులో లేదు",
  
  layers: "మ్యాప్ లేయర్లు",
  baseStyle: "బేస్ శైలి",
  muted: "మ్యూటెడ్",
  terrain: "భూభాగం",
  mode2d: "2D మ్యాప్",
  mode3d: "3D ఎలివేషన్",
  mode3dUnavailable: "3D భూభాగ డేటా అందుబాటులో లేదు (2D మ్యాప్ వాడుకలో ఉంది)",
  zoomIn: "జూమ్ ఇన్",
  zoomOut: "జూమ్ అవుట్",
  recenter: "మ్యాప్ కేంద్రీకరించు",
  resetNorth: "ఉత్తరం వైపు రీసెట్",
  overlayOpacity: "లేయర్ పారదర్శకత",
  
  mapLegend: "మ్యాప్ సూచిక",
  redZoneVulnerable: "రెడ్ జోన్: అత్యంత ప్రమాదంలో ఉన్న నివాస ప్రాంతం",
  orangeZoneWarning: "ఆరెంజ్ జోన్: హెచ్చరిక / జాగ్రత్త అవసరం",
  greenZoneSafeHaven: "గ్రీన్ జోన్: సురక్షిత పునరావాస కేంద్రం",
  evacuationRoute: "రోడ్డు తరలింపు మార్గం (OSRM నావిగేషన్)",
  osmFacilities: "సమీప సౌకర్యాలు (OpenStreetMap)",
  statusVerified: "ధృవీకరించబడింది",
  statusSimulated: "సిమ్యులేటెడ్",
  statusUnavailable: "అందుబాటులో లేదు",
  
  geographicVulnerability: "భౌగోళిక ప్రమాద తీవ్రత",
  activeWeatherStress: "ప్రస్తుత వాతావరణ ఒత్తిడి సూచిక",
  responsePriority: "సహాయక చర్యల ప్రాధాన్యత",
  screeningRisk: "ప్రాథమిక ప్రమాద సూచిక",
  
  weatherForecast7Day: "7 రోజుల వాతావరణ సూచన",
  currentConditions: "ప్రస్తుత వాతావరణ పరిస్థితులు",
  temperature: "ఉష్ణోగ్రత",
  precipitation: "వర్షపాతం",
  airQuality: "గాలి నాణ్యత",
  windSpeed: "గాలి వేగం",
  liveWeatherFeed: "లైవ్ వాతావరణ సమాచారం",
  
  facilities: "అత్యవసర వసతులు",
  facilityUnavailableReason: "ఈ ప్రాంతానికి ధృవీకరించిన వసతుల సమాచారం లభించలేదు.",
  evacuationDestinations: "సురక్షిత పునరావాస గమ్యస్థానాలు",
  drivingDistance: "ప్రయాణ దూరం",
  estimatedTravelTime: "అంచనా ప్రయాణ సమయం",
  routeUnavailableReason: "ప్రారంభం నుండి గమ్యస్థానానికి ధృవీకరించిన రోడ్డు మార్గం లభించలేదు.",
  
  sosButton: "అత్యవసర SOS",
  sosTitle: "అత్యవసర SOS సందేశం",
  sosSubtitle: "ఖచ్చితమైన లొకేషన్‌తో తక్షణ అత్యవసర సహాయం కోరండి",
  emergencyCategory: "అత్యవసర వర్గం",
  catMedical: "వైద్య అత్యవసరం",
  catFlood: "వరద ముంపు",
  catLandslide: "కొండచరియలు విరిగిపడటం",
  catCyclone: "తీవ్ర తుఫాను / ఈదురు గాలులు",
  catEvacuation: "చిక్కుకుపోయిన ప్రజలు / తక్షణ తరలింపు",
  catOther: "ఇతర ప్రాణాపాయం",
  sendSos: "SOS సందేశం పంపండి",
  sendingSos: "సందేశం పంపబడుతోంది…",
  cancel: "రద్దు చేయండి",
  close: "మూసివేయి",
  sosSent: "పంపబడింది",
  sosAcknowledged: "అత్యవసర సిబ్బంది స్వీకరించారు",
  sosResolved: "సమస్య పరిష్కరించబడింది",
  sosFailed: "సందేశం చేరలేదు / విఫలమైంది",
  localBeepPlayed: "పరికరంలో నిర్ధారణ శబ్దం (బీప్) మోగింది",
  localBeepNotice: "గమనిక: పరికరంలో బీప్ మోగినంత మాత్రాన సిబ్బందికి చేరినట్లు కాదు. స్టేటస్ గమనించండి.",
  responderDeliveryNotice: "లైవ్ నెట్‌వర్క్ ద్వారా సిబ్బందికి చేరడం పరిశీలనలో ఉంది.",
  demoSimulationBadge: "డెమో / సిమ్యులేటెడ్ రిస్పాండర్",
  locationPermissionDenied: "పరికర లొకేషన్ అనుమతి నిరాకరించబడింది.",
  networkUnavailable: "నెట్‌వర్క్ అందుబాటులో లేదు. అలర్ట్ పరికరంలో సేవ్ చేయబడింది.",
  responderDashboard: "రెస్పాండర్ SOS కమాండ్",
  acknowledgeDispatch: "స్వీకరించండి",
  resolveDispatch: "పూర్తయినట్లు గుర్తించండి",
  
  aiAssistantTitle: "ResQ AI సహాయకుడు",
  aiAssistantSubtitle: "నిర్ణయ మద్దతు విశ్లేషణ",
  aiDisclaimer: "ResQ ధృవీకరించిన విశ్లేషణ ఆధారంగా రూపొందించిన వివరణ. ఇది అధికారిక ప్రభుత్వ ఆదేశం కాదు.",
  askAssistantPlaceholder: "ప్రమాదాలు, నివాసాలు లేదా సురక్షిత మార్గాల గురించి అడగండి…",
  aiQuestionPrimaryHazard: "ఈ ప్రదేశంలో ప్రధాన ప్రమాదం ఏమిటి?",
  aiQuestionSecondaryHazards: "ఇతర ప్రమాదాలు ఏమిటి?",
  aiQuestionWhyClassified: "ఈ ప్రాంతాన్ని ఈ విధంగా ఎందుకు వర్గీకరించారు?",
  aiQuestionExposedHabitation: "ఏ నివాస ప్రాంతం ప్రమాదంలో ఉంది?",
  aiQuestionRelocationPriority: "తరలింపు ప్రాధాన్యత ఎంత?",
  aiQuestionFacilitiesAvailable: "ఏ వసతులు అందుబాటులో ఉన్నాయి?",
  aiQuestionFacilityCapacity: "వసతుల సామర్థ్యం ధృవీకరించబడిందా?",
  aiQuestionSelectedDestination: "ఏ సురక్షిత గమ్యస్థానం ఎంపిక చేయబడింది?",
  aiQuestionRouteAvailable: "ఏ రోడ్డు తరలింపు మార్గం అందుబాటులో ఉంది?",
  aiQuestionUnavailableData: "ప్రస్తుతం ఏ సమాచారం అందుబాటులో లేదు?",
  aiQuestionResponderNextSteps: "సహాయక బృందాలు మొదట ఏమి తనిఖీ చేయాలి?",
  aiFallbackNotice: "నిర్ధారిత విశ్లేషణ వాడుకలో ఉంది (AI ఆఫ్‌లైన్).",
  
  badgeLive: "లైవ్",
  badgeSimulated: "సిమ్యులేటెడ్",
  badgeReference: "స్థిర / సూచన",
  badgeDerived: "గణించినది",
  badgeUnavailable: "అందుబాటులో లేదు",
};

const dictionaries: Record<Language, TranslationDictionary> = { en, hi, te };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("resq_language");
      if (stored === "en" || stored === "hi" || stored === "te") return stored;
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("resq_language", lang);
    }
  };

  const t = dictionaries[language] ?? en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
