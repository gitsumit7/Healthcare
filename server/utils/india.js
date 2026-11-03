// The 28 states and 8 union territories of India, plus each one's medical council for doctor registration.
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

// Doctors register either with the National Medical Commission or a state medical council.
export const MEDICAL_COUNCILS = ['National Medical Commission', ...INDIAN_STATES.map((s) => `${s} Medical Council`)];

export const PINCODE = /^[1-9]\d{5}$/;
// ABDM HPR ID: 14 digits (optionally hyphenated 2-4-4-4) or the name@hpr.abdm address.
export const HPR_ID = /^(\d{2}-?\d{4}-?\d{4}-?\d{4}|[a-z0-9._]+@hpr\.abdm)$/i;
