const Groq = require("groq-sdk");

const AUTHORITY_MAP = {
  water: {
    authority: "Municipal Water Supply Department / Jal Board",
    platform: "Jal Jeevan Mission App / Local Municipal Portal / 1916 helpline",
    steps: [
      "Photograph the issue clearly as evidence",
      "Call water helpline 1916 immediately",
      "Visit nearest ward/municipal office with photos",
      "File written complaint, get receipt number",
      "Follow up after 7 days with complaint number",
      "Escalate to District Collector if unresolved in 14 days",
    ],
  },
  road: {
    authority: "Public Works Department (PWD) / NHAI for Highways",
    platform: "MyGov Portal / CPGRAMS (cpgrams.gov.in) / State PWD website",
    steps: [
      "Photograph road damage with landmarks visible",
      "Note exact GPS location and nearest landmark",
      "File on CPGRAMS portal or PWD website",
      "Contact local Ward Councillor for faster action",
      "Quote Motor Vehicles Act if accident risk exists",
      "Follow up weekly with complaint reference number",
    ],
  },
  electricity: {
    authority: "State Electricity Distribution Company (DISCOM)",
    platform: "DISCOM app / State Electricity Board portal / 1912 emergency",
    steps: [
      "Call 1912 immediately for dangerous electrical situations",
      "Note the transformer number or pole number nearby",
      "Lodge complaint on official DISCOM app",
      "Get complaint reference number via SMS",
      "Request meter inspection if billing issue",
      "Approach State Electricity Regulatory Commission if needed",
    ],
  },
  garbage: {
    authority: "Municipal Solid Waste Management Dept / Ward Sanitation Officer",
    platform: "Swachh Bharat Mission App / Local Corporation Portal",
    steps: [
      "Report on Swachh Bharat app with GPS location",
      "Contact ward sanitation officer directly",
      "File complaint at municipal office with photos",
      "Request regular pickup schedule in writing",
      "Involve local RWA/colony association",
      "Escalate to District Collector for chronic issues",
    ],
  },
  flood: {
    authority: "District Disaster Management Authority (DDMA)",
    platform: "NDMA Portal / State Disaster Response Portal / 1070 helpline",
    steps: [
      "Call National Disaster helpline 1070 immediately",
      "Contact District Collector / District Magistrate office",
      "Contact local police if evacuation is needed",
      "Register at nearest relief camp if displaced",
      "Apply for compensation via SDRF fund",
      "Document all damage with photos for claims",
    ],
  },
  pollution: {
    authority: "State Pollution Control Board (SPCB) / CPCB",
    platform: "CPCB Sameer App / State PCB Portal / National Green Tribunal",
    steps: [
      "Document pollution: photos, videos, time & date",
      "File complaint at State Pollution Control Board",
      "Report on CPCB Sameer mobile app with location",
      "Approach National Green Tribunal for serious cases",
      "File RTI for pollution data and action status",
      "Contact local media to amplify if chronic issue",
    ],
  },
  health: {
    authority: "District Health Officer / Chief Medical Officer (CMO)",
    platform: "Swasthya Seva / National Health Portal / 104 helpline",
    steps: [
      "Call health helpline 104 for immediate guidance",
      "Visit nearest government health center",
      "Contact District Medical Officer (DMO)",
      "Apply for free treatment under Ayushman Bharat scheme",
      "Report disease outbreaks to ICMR if needed",
      "Contact State Health Department for area-wide issues",
    ],
  },
  education: {
    authority: "District Education Officer (DEO) / Block Education Officer (BEO)",
    platform: "UDISE+ Portal / State Education Dept / MHRD Portal / NCPCR",
    steps: [
      "Contact School Management Committee (SMC) first",
      "Visit Block Education Officer (BEO) office",
      "File complaint with District Education Officer",
      "Use Right to Education (RTE) Act provisions",
      "Contact NCPCR for child rights violations",
      "File on CPGRAMS portal for central school issues",
    ],
  },
  default: {
    authority: "District Collector / Grievance Redressal Cell",
    platform: "CPGRAMS (cpgrams.gov.in) / State CM Helpline / Lokayukt",
    steps: [
      "Gather evidence: photos, documents, dates, witnesses",
      "Visit nearest government office related to your issue",
      "File written complaint, get acknowledgment receipt",
      "Use CPGRAMS portal for central government issues",
      "Use State CM Helpline for state government issues",
      "Approach Consumer Forum or Lokayukt if needed",
      "File RTI if information is being withheld",
    ],
  },
};

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/(water|pipe|drain|sewer|tap|borewell|leak)/i.test(t))    return "water";
  if (/(road|pothole|street|highway|bridge|footpath|pavement)/i.test(t)) return "road";
  if (/(electri|power|light|transformer|voltage|blackout|outage|wire)/i.test(t)) return "electricity";
  if (/(garbage|waste|trash|dump|litter|sanit|sweep|bin)/i.test(t)) return "garbage";
  if (/(flood|rain|waterlog|inundat)/i.test(t))                  return "flood";
  if (/(pollut|smoke|dust|air quality|noise|chemical|effluent)/i.test(t)) return "pollution";
  if (/(health|hospital|doctor|disease|medical|sick|clinic|ambulance)/i.test(t)) return "health";
  if (/(school|education|teacher|student|college|study|fees)/i.test(t)) return "education";
  return "default";
}

async function generateSolution(text, cat) {
  const getFallbackSolution = (cat) => {
    const solutions = {
      water: `**Problem Analysis:** Water supply issues are among the most common civic problems and are typically resolved within 2–7 days once properly escalated.\n\n**Root Cause:** Usually caused by pipeline leakage, pump failure, valve issues, or unauthorized connections in the area.\n\n**Immediate Action:** Check if your overhead tank valve is open. Confirm with neighbors if it's a localized or area-wide problem. Call 1916 helpline right now.\n\n**Long-Term Fix:** Request the Municipal dept to conduct a full pipeline audit. Push for 24×7 water supply under Amrit 2.0 scheme. Demand installation of water meters to reduce wastage.\n\n**Legal Angle:** Access to clean water is a fundamental right under Article 21. Authorities are legally bound to act.`,
      road: `**Problem Analysis:** Road damage is a public safety hazard and authorities have legal obligation to repair it promptly.\n\n**Root Cause:** Potholes form due to poor drainage, overloaded vehicles, aging bitumen surfaces, or substandard construction materials.\n\n**Immediate Action:** Alert local police to place warning cones if accident-prone. File complaint on CPGRAMS with exact GPS coordinates and photos.\n\n**Long-Term Fix:** Demand construction using CC (Cement Concrete) roads instead of bitumen for permanent solution. Push for proper drainage channels alongside road repair.\n\n**Legal Angle:** Under Motor Vehicles Act, if an accident occurs due to a pothole, the responsible authority can be held liable for negligence. Use this as leverage in your complaint.`,
      electricity: `**Problem Analysis:** Power supply issues require immediate attention, especially if there's a safety risk.\n\n**Root Cause:** Outages caused by transformer overload, cable faults, equipment failure, or scheduled maintenance. Billing issues usually arise from meter malfunction.\n\n**Immediate Action:** Call 1912 emergency helpline. Check your MCB/fuse box first. Check DISCOM's website/app for scheduled outage info in your area.\n\n**Long-Term Fix:** Request meter audit and calibration test. Demand proper earthing and surge protection infrastructure. Push for underground cabling to prevent frequent storm-related disruptions.\n\n**Consumer Rights:** You are entitled to compensation for prolonged unscheduled outages under the Electricity Consumer Rights Regulations of your state.`,
      garbage: `**Problem Analysis:** Regular garbage collection is a basic municipal service — it's your legal right as a taxpaying citizen.\n\n**Root Cause:** Irregular collection usually due to staff shortage, vehicle breakdown, route mismanagement, or lack of accountability from sanitation supervisors.\n\n**Immediate Action:** Form a WhatsApp group with 10+ neighbors and file the same complaint collectively — group complaints get priority response. Contact your local Ward Councillor directly.\n\n**Long-Term Fix:** Push for door-to-door segregated collection (wet/dry waste separation). Request a fixed daily time schedule in writing. Demand community composting unit installation.\n\n**Smart Move:** File on Swachh Bharat Mission app — complaints with GPS location tags get fastest municipal response due to real-time monitoring.`,
      default: `**Problem Analysis:** Your problem has been categorized and a structured solution plan has been created.\n\n**Root Cause:** Civic problems typically arise from lack of accountability, resource constraints, or communication gaps between citizens and authorities.\n\n**Immediate Action:** Document everything with timestamps, photos, and witness contacts. Rally at least 5–10 neighbors to file the same complaint — collective complaints are prioritized.\n\n**Escalation Strategy:** Local Office → District Collector → State Grievance Portal → National CPGRAMS. Each escalation level typically gets 3× faster response.\n\n**Power Tools:** (1) RTI — Right to Information Act to track inaction. (2) Consumer Forum for service failures. (3) Lokayukt for government negligence. Always get a complaint number and follow up in writing every 7 days.`,
    };
    return solutions[cat] || solutions["default"];
  };

  if (!process.env.GROQ_API_KEY) {
    console.log("No GROQ_API_KEY found, using fallback dictionary.");
    return getFallbackSolution(cat);
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `You are an expert civic problem solver and legal advisor. 
A user has submitted a civic problem. Provide a structured solution plan using EXACTLY these bold headers:
**Problem Analysis:** [Briefly analyze the issue]
**Root Cause:** [Explain typical root causes]
**Immediate Action:** [What the user should do immediately]
**Long-Term Fix:** [How to permanently resolve this]
**Legal Angle/Consumer Rights:** [Relevant laws, acts, or rights the user can leverage]

User's Problem Description: ${text}
Category: ${cat}

Keep the response concise, actionable, and extremely practical. Do not include introductory or concluding remarks. Just output the bold headers and their content.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 1024,
    });

    return chatCompletion.choices[0]?.message?.content || getFallbackSolution(cat);
  } catch (error) {
    console.error("Groq API error:", error.message);
    return getFallbackSolution(cat);
  }
}

function findSimilar(text, problems) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let best = null, bestScore = 0;
  for (const p of problems) {
    const pWords = (p.title + " " + p.description).toLowerCase().split(/\s+/);
    const common = words.filter(w => pWords.includes(w));
    const score = common.length / Math.max(words.length, 1);
    if (score > 0.35 && score > bestScore) { bestScore = score; best = p; }
  }
  return best;
}

module.exports = { AUTHORITY_MAP, detectCategory, generateSolution, findSimilar };
