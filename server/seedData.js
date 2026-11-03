import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Appointment from './models/Appointment.js';
import Hospital from './models/Hospital.js';
import { CITIES_BY_STATE } from './utils/indianCities.js';

// All seeded doctors are fictional sample profiles (isDemo: true, registration numbers start with "DEMO-").

const weekdays = (windows, days = [1, 2, 3, 4, 5]) =>
  days.flatMap((day) => windows.map(([start, end]) => ({ day, start, end })));

const DOCTORS = [
  {
    name: 'Dr. Ananya Sharma',
    email: 'ananya.sharma@medicare.dev',
    gender: 'female',
    specialization: 'Cardiologist',
    qualifications: 'MBBS, MD (Medicine), DM (Cardiology)',
    experience: 12,
    fees: 800,
    about: 'Interventional cardiologist focused on preventive heart care, hypertension and post-MI rehabilitation.',
    clinicAddress: 'HeartCare Clinic, Andheri West',
    state: 'Maharashtra',
    city: 'Mumbai',
    pincode: '400058',
    availability: weekdays([['10:00', '13:00'], ['16:00', '19:00']]),
  },
  {
    name: 'Dr. Rohan Mehta',
    email: 'rohan.mehta@medicare.dev',
    gender: 'male',
    specialization: 'Dermatologist',
    qualifications: 'MBBS, MD (Dermatology)',
    experience: 8,
    fees: 600,
    about: 'Treats acne, eczema, psoriasis, hair loss and performs minor cosmetic procedures.',
    clinicAddress: 'SkinFirst Clinic, Koramangala',
    state: 'Karnataka',
    city: 'Bengaluru',
    pincode: '560034',
    availability: weekdays([['11:00', '14:00'], ['17:00', '20:00']], [1, 2, 3, 4, 5, 6]),
  },
  {
    name: 'Dr. Priya Nair',
    email: 'priya.nair@medicare.dev',
    gender: 'female',
    specialization: 'Pediatrician',
    qualifications: 'MBBS, DCH, MD (Pediatrics)',
    experience: 10,
    fees: 500,
    about: 'Child health specialist covering vaccinations, growth monitoring and newborn care.',
    clinicAddress: 'Little Steps Children Clinic',
    state: 'Kerala',
    city: 'Kochi',
    pincode: '682011',
    availability: weekdays([['09:00', '13:00']], [1, 2, 3, 4, 5, 6]),
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@medicare.dev',
    gender: 'male',
    specialization: 'Orthopedic Surgeon',
    qualifications: 'MBBS, MS (Orthopaedics)',
    experience: 15,
    fees: 900,
    about: 'Joint replacement and sports injury specialist with 15 years of surgical experience.',
    clinicAddress: 'BoneCare Hospital, Sector 18',
    state: 'Uttar Pradesh',
    city: 'Noida',
    pincode: '201301',
    slotDuration: 20,
    availability: weekdays([['10:00', '14:00']]),
  },
  {
    name: 'Dr. Sneha Kapoor',
    email: 'sneha.kapoor@medicare.dev',
    gender: 'female',
    specialization: 'General Physician',
    qualifications: 'MBBS, MD (General Medicine)',
    experience: 6,
    fees: 400,
    about: 'Primary care for fever, infections, diabetes, thyroid and lifestyle disorders.',
    clinicAddress: 'CityCare Clinic, Connaught Place',
    state: 'Delhi',
    city: 'New Delhi',
    pincode: '110001',
    slotDuration: 15,
    availability: weekdays([['09:00', '12:00'], ['17:00', '21:00']], [0, 1, 2, 3, 4, 5, 6]),
  },
  {
    name: 'Dr. Arjun Iyer',
    email: 'arjun.iyer@medicare.dev',
    gender: 'male',
    specialization: 'Neurologist',
    qualifications: 'MBBS, MD, DM (Neurology)',
    experience: 11,
    fees: 1000,
    about: 'Manages migraine, epilepsy, stroke recovery and neuropathy.',
    clinicAddress: 'NeuroLife Centre, T. Nagar',
    state: 'Tamil Nadu',
    city: 'Chennai',
    pincode: '600017',
    slotDuration: 45,
    availability: weekdays([['14:00', '19:00']], [1, 3, 5]),
  },
];

// Known head-post-office pincodes for some cities; other generated doctors leave the pincode empty
// rather than guess one.
const PINCODES = {
  'Port Blair': '744101', Visakhapatnam: '530002', Vijayawada: '520010', Itanagar: '791111', Guwahati: '781005',
  Patna: '800001', Gaya: '823001', Chandigarh: '160017', Raipur: '492001', Silvassa: '396230', Dwarka: '110075',
  Panaji: '403001', Ahmedabad: '380009', Surat: '395003', Gurugram: '122001', Shimla: '171001', Srinagar: '190001',
  Ranchi: '834001', Mysuru: '570001', Thiruvananthapuram: '695001', Leh: '194101', Kavaratti: '682555', Bhopal: '462001',
  Indore: '452001', Pune: '411001', Nagpur: '440001', Imphal: '795001', Shillong: '793001', Aizawl: '796001',
  Kohima: '797001', Bhubaneswar: '751001', Puducherry: '605001', Ludhiana: '141001', Amritsar: '143001',
  Jaipur: '302001', Udaipur: '313001', Gangtok: '737101', Coimbatore: '641001', Hyderabad: '500034',
  Agartala: '799001', Lucknow: '226001', Varanasi: '221001', Dehradun: '248001', Kolkata: '700016', Siliguri: '734001',
};

// Every city gets one doctor of each of these specialties.
export const SPECIALTIES = [
  ['General Physician', 'MBBS, MD (General Medicine)'],
  ['Pediatrician', 'MBBS, MD (Pediatrics)'],
  ['Gynecologist', 'MBBS, MS (Obstetrics & Gynaecology)'],
  ['Cardiologist', 'MBBS, MD, DM (Cardiology)'],
  ['Dermatologist', 'MBBS, MD (Dermatology)'],
  ['Orthopedic Surgeon', 'MBBS, MS (Orthopaedics)'],
  ['ENT Specialist', 'MBBS, MS (ENT)'],
  ['Psychiatrist', 'MBBS, MD (Psychiatry)'],
  ['Ophthalmologist', 'MBBS, MS (Ophthalmology)'],
  ['Dentist', 'BDS, MDS'],
  ['Neurologist', 'MBBS, MD, DM (Neurology)'],
  ['Diabetologist', 'MBBS, MD (Medicine), Fellowship in Diabetology'],
  ['Endocrinologist', 'MBBS, MD, DM (Endocrinology)'],
  ['Gastroenterologist', 'MBBS, MD, DM (Gastroenterology)'],
  ['Pulmonologist', 'MBBS, MD (Respiratory Medicine)'],
  ['Nephrologist', 'MBBS, MD, DM (Nephrology)'],
  ['Urologist', 'MBBS, MS, MCh (Urology)'],
  ['Oncologist', 'MBBS, MD, DM (Medical Oncology)'],
  ['General Surgeon', 'MBBS, MS (General Surgery)'],
  ['Neurosurgeon', 'MBBS, MS, MCh (Neurosurgery)'],
  ['Plastic Surgeon', 'MBBS, MS, MCh (Plastic Surgery)'],
  ['Cardiothoracic Surgeon', 'MBBS, MS, MCh (Cardiothoracic & Vascular Surgery)'],
  ['Pediatric Surgeon', 'MBBS, MS, MCh (Paediatric Surgery)'],
  ['Rheumatologist', 'MBBS, MD, DM (Rheumatology)'],
  ['Hematologist', 'MBBS, MD, DM (Clinical Haematology)'],
  ['Infertility Specialist', 'MBBS, MS (Obstetrics & Gynaecology), Fellowship in Reproductive Medicine'],
  ['Neonatologist', 'MBBS, MD (Pediatrics), DM (Neonatology)'],
  ['Geriatrician', 'MBBS, MD (Geriatric Medicine)'],
  ['Sports Medicine Specialist', 'MBBS, MD (Sports Medicine)'],
  ['Infectious Disease Specialist', 'MBBS, MD (Medicine), Fellowship in Infectious Diseases'],
];

// 40 first names x 40 surnames; a city's 30 doctors always have different first names.
const FIRST = [
  ['Aarav', 'male'], ['Meera', 'female'], ['Kabir', 'male'], ['Isha', 'female'], ['Rahul', 'male'],
  ['Pooja', 'female'], ['Siddharth', 'male'], ['Neha', 'female'], ['Aditya', 'male'], ['Kavya', 'female'],
  ['Farhan', 'male'], ['Ritu', 'female'], ['Manish', 'male'], ['Lakshmi', 'female'], ['Tenzin', 'male'],
  ['Anjali', 'female'], ['Gaurav', 'male'], ['Shreya', 'female'], ['Imran', 'male'], ['Divya', 'female'],
  ['Harsh', 'male'], ['Nandini', 'female'], ['Vivek', 'male'], ['Sana', 'female'], ['Karan', 'male'],
  ['Aditi', 'female'], ['Rohit', 'male'], ['Fatima', 'female'], ['Suresh', 'male'], ['Ira', 'female'],
  ['Arjun', 'male'], ['Priyanka', 'female'], ['Deepak', 'male'], ['Zoya', 'female'], ['Nikhil', 'male'],
  ['Swati', 'female'], ['Abhishek', 'male'], ['Rekha', 'female'], ['Lalit', 'male'], ['Mehak', 'female'],
];
const LAST = [
  'Verma', 'Reddy', 'Das', 'Joshi', 'Patel', 'Menon', 'Bose', 'Khan', 'Gupta', 'Rao',
  'Singh', 'Chatterjee', 'Pillai', 'Shah', 'Nair', 'Mishra', 'Hussain', 'Kulkarni', 'Sangma', 'Thakur',
  'Agarwal', 'Bhat', 'Chauhan', 'Dutta', 'Gill', 'Jain', 'Kaur', 'Naidu', 'Pandey', 'Yadav',
  'Banerjee', 'Desai', 'Iyengar', 'Lepcha', 'Mehta', 'Negi', 'Saikia', 'Tripathi', 'Varghese', 'Zaidi',
];
const SCHEDULES = [
  { slotDuration: 30, availability: weekdays([['10:00', '13:00'], ['17:00', '20:00']]) },
  { slotDuration: 20, availability: weekdays([['09:00', '13:00']], [1, 2, 3, 4, 5, 6]) },
  { slotDuration: 15, availability: weekdays([['16:00', '21:00']], [0, 1, 2, 3, 4, 5, 6]) },
];

const stateCode = (state) =>
  state
    .split(/\s+/)
    .filter((w) => !['and', 'of'].includes(w.toLowerCase()))
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

/**
 * A sample doctor of every specialty in every city of the built-in list, except where one of the named
 * doctors above already covers that city + specialty.
 */
export function generatedDoctors() {
  const covered = new Set(DOCTORS.map((d) => `${d.state}|${d.city}|${d.specialization}`));
  const slots = Object.entries(CITIES_BY_STATE)
    .flatMap(([state, list]) => list.flatMap((city) => SPECIALTIES.map((s) => ({ state, city, s }))))
    .filter(({ state, city, s }) => !covered.has(`${state}|${city}|${s[0]}`));

  return slots.map(({ state, city, s: [specialization, qualifications] }, i) => {
    const [firstName, gender] = FIRST[i % FIRST.length];
    // Steps of 7 vary surnames between neighbours; the "+ round" term spreads first/last pairs evenly.
    const lastName = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length];
    const experience = 3 + ((i * 7) % 26);
    return {
      name: `Dr. ${firstName} ${lastName}`,
      email: `demo.doctor${i + 1}@medicare.dev`,
      gender,
      specialization,
      qualifications,
      experience,
      fees: 300 + ((i * 130) % 900),
      about: `${specialization} practising in ${city}, ${state}. (Sample profile for demonstration.)`,
      clinicAddress: `${lastName} Health Clinic, ${city}`,
      state,
      city,
      pincode: PINCODES[city],
      ...SCHEDULES[i % SCHEDULES.length],
    };
  });
}

// Waiting for admin review, so the admin page has something to show.
const PENDING = [
  {
    name: 'Dr. Kavya Reddy',
    email: 'pending.doctor1@medicare.dev',
    gender: 'female',
    specialization: 'Gynecologist',
    qualifications: 'MBBS, MS (Obstetrics & Gynaecology)',
    experience: 7,
    fees: 700,
    clinicAddress: 'Banjara Hills',
    state: 'Telangana',
    city: 'Hyderabad',
    pincode: '500034',
    hprId: '71-0000-0000-0001',
    availability: weekdays([['10:00', '14:00']]),
  },
  {
    name: 'Dr. Nikhil Bose',
    email: 'pending.doctor2@medicare.dev',
    gender: 'male',
    specialization: 'Psychiatrist',
    qualifications: 'MBBS, MD (Psychiatry)',
    experience: 5,
    fees: 900,
    clinicAddress: 'Salt Lake',
    state: 'West Bengal',
    city: 'Kolkata',
    pincode: '700091',
    availability: weekdays([['15:00', '19:00']]),
  },
];

// ---- Demo hospitals: one per city, until the real directory is imported from data.gov.in ----

const HOSPITAL_PREFIXES = [
  'Sanjeevani', 'Aarogya', 'Jeevan Jyoti', 'Shanti', 'Lifeline', 'Sparsh', 'Navjeevan', 'Suraksha', 'Swasthya',
  'Amrit', 'Kalyan', 'Dhanvantari', 'Sahyog', 'Prakash', 'Seva Sadan',
];
const ALL_SPECIALTIES = SPECIALTIES.map(([s]) => s);
const HOSPITAL_TYPES = [
  // [name suffix, category, care type, systems of medicine, specialties text, beds, departments (doctor specialties)]
  ['Multispeciality Hospital', 'Private', 'Hospital', 'Allopathy', 'Cardiology, Neurology, Oncology, Nephrology, Orthopaedics, General Surgery, Gynaecology, Paediatrics', 120, ALL_SPECIALTIES],
  ['Community Health Centre', 'Public', 'Community Health Centre', 'Allopathy', 'General Medicine, Maternity, Paediatrics, Dental, Emergency', 30,
    ['General Physician', 'Pediatrician', 'Gynecologist', 'Dentist']],
  ['General Hospital', 'Public', 'Hospital', 'Allopathy', 'General Medicine, General Surgery, Obstetrics, Orthopaedics, Psychiatry, Emergency, Radiology', 200,
    ['General Physician', 'General Surgeon', 'Gynecologist', 'Pediatrician', 'Orthopedic Surgeon', 'Pulmonologist', 'Psychiatrist',
      'Dermatologist', 'ENT Specialist', 'Ophthalmologist', 'Infectious Disease Specialist', 'Geriatrician']],
  ['Children & Maternity Hospital', 'Private', 'Hospital', 'Allopathy', 'Obstetrics & Gynaecology, Neonatology, Paediatrics, Paediatric Surgery, IVF', 60,
    ['Pediatrician', 'Gynecologist', 'Neonatologist', 'Pediatric Surgeon', 'Infertility Specialist']],
  ['Eye & ENT Hospital', 'Private', 'Hospital', 'Allopathy', 'Ophthalmology, ENT, Audiology', 40, ['Ophthalmologist', 'ENT Specialist']],
  // AYUSH hospitals have no departments for the allopathic specialties doctors here practise.
  ['Ayurveda Hospital', 'Public', 'Hospital', 'Ayurveda', 'Panchakarma, Kayachikitsa, Shalya Tantra', 50, []],
  ['Heart & Diabetes Centre', 'Private', 'Hospital', 'Allopathy', 'Cardiology, Cardiac Surgery, Diabetology, Endocrinology, Nephrology', 80,
    ['Cardiologist', 'Cardiothoracic Surgeon', 'Diabetologist', 'Endocrinologist', 'Nephrologist']],
  ['Homoeopathy Hospital', 'Public', 'Dispensary', 'Homoeopathy', 'Homoeopathic Medicine, Paediatrics, Dermatology', 25, []],
];

export function demoHospitals() {
  return Object.entries(CITIES_BY_STATE)
    .flatMap(([state, list]) => list.map((city) => ({ state, city })))
    .map(({ state, city }, i) => {
      const [suffix, category, careType, systemsOfMedicine, specialties, beds, departments] = HOSPITAL_TYPES[i % HOSPITAL_TYPES.length];
      const name = `${HOSPITAL_PREFIXES[(i * 4) % HOSPITAL_PREFIXES.length]} ${suffix}`;
      return {
        _id: new mongoose.Types.ObjectId(),
        name,
        category,
        careType,
        systemsOfMedicine,
        specialties,
        departments,
        beds: beds + ((i * 13) % 40),
        address: `${name}, ${city}`,
        state,
        district: city,
        pincode: PINCODES[city],
        // 108 is India's national emergency ambulance number - real and valid everywhere. No invented phone numbers.
        emergencyPhone: '108',
        source: 'demo',
        isDemo: true,
        sourceId: `demo:${state}:${city}`,
      };
    });
}

export const DEMO_PASSWORDS ={ doctor: 'doctor123', patient: 'patient123', admin: 'admin123' };

/**
 * Creates the doctor accounts in bulk. insertMany skips the per-document password hook, so the shared demo
 * password is hashed once here - hashing it ~850 times would add a minute to every in-memory start.
 */
async function insertDoctors(entries) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORDS.doctor, 10);
  const now = new Date();
  // ~25k generated records are written as plain documents straight to the collections: hydrating each through
  // Mongoose (casting its weekly schedule etc.) would add 10-30 seconds to every in-memory start. The schema
  // defaults these documents rely on are therefore spelled out here.
  const users = entries.map(({ doctor: { name, email, gender } }) => ({
    _id: new mongoose.Types.ObjectId(),
    name,
    email: email.toLowerCase(),
    gender: gender || '',
    password: passwordHash,
    role: 'doctor',
    phone: '9876543210',
    bloodGroup: '',
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  }));
  const doctors = entries.map(({ doctor: { name, email, gender, ...profile }, status }, i) => ({
    _id: new mongoose.Types.ObjectId(),
    user: users[i]._id,
    experience: 0,
    fees: 0,
    slotDuration: 30,
    isAvailable: true,
    ...profile,
    registrationNumber: `DEMO-${stateCode(profile.state)}-${String(10000 + i * 37).padStart(6, '0')}`,
    medicalCouncil: `${profile.state} Medical Council`,
    registrationYear: 2026 - profile.experience - 1,
    isDemo: true,
    verification: status === 'verified' ? { status, method: 'seed', verifiedAt: now } : { status },
    createdAt: now,
    updatedAt: now,
  }));

  // The hand-written records are few, so validate them through the schema to catch mistakes in this file.
  for (const doc of [...doctors.slice(0, DOCTORS.length), ...doctors.slice(-PENDING.length)]) {
    await new Doctor(doc).validate();
  }

  const BATCH = 5000;
  for (let i = 0; i < users.length; i += BATCH) {
    await User.collection.insertMany(users.slice(i, i + BATCH), { ordered: false });
    await Doctor.collection.insertMany(doctors.slice(i, i + BATCH), { ordered: false });
  }
}

export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await Promise.all([User.deleteMany({}), Doctor.deleteMany({}), Appointment.deleteMany({})]);
  }

  // Demo hospitals only fill an empty directory; real data.gov.in hospitals are never mixed with or overwritten by them.
  const hospitals = (await Hospital.exists({ isDemo: { $ne: true } })) ? [] : demoHospitals();
  if (hospitals.length) {
    await Hospital.deleteMany({ isDemo: true });
    await Hospital.insertMany(hospitals);
  }

  // A doctor joins their city's demo hospital when it has a department for their specialty.
  const hospitalByCity = new Map(hospitals.map((h) => [`${h.state}|${h.district}`, h]));
  const withHospital = (d) => {
    const h = hospitalByCity.get(`${d.state}|${d.city}`);
    return h?.departments.includes(d.specialization) ? { ...d, hospital: h._id, clinicAddress: `${h.name}, ${d.city}` } : d;
  };

  const verified = [...DOCTORS, ...generatedDoctors()].map(withHospital);
  await insertDoctors([
    ...verified.map((doctor) => ({ doctor, status: 'verified' })),
    ...PENDING.map((doctor) => ({ doctor, status: 'pending' })),
  ]);

  await User.create({
    name: 'Rahul Verma',
    email: 'patient@medicare.dev',
    password: DEMO_PASSWORDS.patient,
    role: 'patient',
    phone: '9123456780',
    gender: 'male',
    bloodGroup: 'B+',
    dateOfBirth: new Date('1995-06-15'),
    address: 'Pune, Maharashtra',
  });

  await User.create({ name: 'MediCare Admin', email: 'admin@medicare.dev', password: DEMO_PASSWORDS.admin, role: 'admin' });

  const linked = verified.filter((d) => d.hospital).length;
  const cities = new Set(verified.map((d) => `${d.state}|${d.city}`)).size;
  const states = new Set(verified.map((d) => d.state)).size;
  console.log(
    `Seeded ${verified.length} verified demo doctors in ${cities} cities across ${states} states/UTs, ${PENDING.length} pending, 1 patient, 1 admin` +
      (hospitals.length ? `, ${hospitals.length} demo hospitals (${linked} doctors attached to one)` : '')
  );
}
