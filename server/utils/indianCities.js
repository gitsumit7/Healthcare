// Mirrors client/src/data/indianCities.js (keep the two in sync).
// District headquarters and major cities/towns of every Indian state and union territory, used for
// city suggestions. Not exhaustive: city inputs also accept any typed name.
export const CITIES_BY_STATE = {
  'Andaman and Nicobar Islands': ['Port Blair', 'Car Nicobar', 'Diglipur', 'Mayabunder', 'Rangat', 'Swaraj Dweep', 'Campbell Bay'],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Rajahmundry', 'Tirupati', 'Kadapa',
    'Anantapur', 'Eluru', 'Ongole', 'Vizianagaram', 'Srikakulam', 'Machilipatnam', 'Chittoor', 'Proddatur', 'Nandyal',
    'Adoni', 'Tenali', 'Hindupur', 'Bhimavaram', 'Madanapalle', 'Guntakal', 'Dharmavaram', 'Gudivada', 'Narasaraopet',
    'Tadepalligudem', 'Amaravati', 'Puttaparthi', 'Bapatla', 'Paderu', 'Rayachoti', 'Amalapuram', 'Parvathipuram', 'Anakapalli',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Aalo', 'Tezu', 'Roing', 'Khonsa', 'Changlang',
    'Daporijo', 'Seppa', 'Namsai', 'Yingkiong', 'Anini',
  ],
  Assam: [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu',
    'North Lakhimpur', 'Karimganj', 'Sivasagar', 'Goalpara', 'Barpeta', 'Golaghat', 'Mangaldoi', 'Nalbari', 'Kokrajhar',
    'Hailakandi', 'Morigaon', 'Haflong', 'Hojai', 'Dhemaji', 'Biswanath Chariali', 'Majuli', 'Hatsingimari', 'Udalguri',
    'Kajalgaon', 'Mushalpur',
  ],
  Bihar: [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai', 'Katihar', 'Munger',
    'Chhapra', 'Bihar Sharif', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan', 'Motihari', 'Nawada', 'Bettiah', 'Saharsa',
    'Kishanganj', 'Jamalpur', 'Buxar', 'Jehanabad', 'Aurangabad', 'Madhubani', 'Samastipur', 'Sitamarhi', 'Supaul',
    'Araria', 'Madhepura', 'Khagaria', 'Lakhisarai', 'Sheikhpura', 'Jamui', 'Banka', 'Gopalganj', 'Sheohar', 'Arwal', 'Bhabua',
  ],
  Chandigarh: ['Chandigarh'],
  Chhattisgarh: [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur', 'Dhamtari',
    'Mahasamund', 'Kanker', 'Kawardha', 'Janjgir', 'Champa', 'Bemetara', 'Balod', 'Baloda Bazar', 'Mungeli', 'Gariaband',
    'Kondagaon', 'Narayanpur', 'Bijapur', 'Dantewada', 'Sukma', 'Jashpur Nagar', 'Surajpur', 'Balrampur', 'Baikunthpur',
  ],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
  Delhi: [
    'New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh', 'Janakpuri', 'Lajpat Nagar', 'Pitampura', 'Shahdara',
    'Mayur Vihar', 'Vasant Kunj', 'Narela', 'Najafgarh', 'Connaught Place', 'Preet Vihar', 'Rajouri Garden', 'Okhla',
  ],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Canacona', 'Quepem', 'Pernem'],
  Gujarat: [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari',
    'Morbi', 'Nadiad', 'Surendranagar', 'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar', 'Palanpur', 'Valsad', 'Vapi', 'Godhra',
    'Patan', 'Dahod', 'Botad', 'Amreli', 'Himmatnagar', 'Veraval', 'Gandhidham', 'Modasa', 'Lunawada', 'Rajpipla', 'Vyara',
    'Ahwa', 'Chhota Udaipur', 'Khambhalia',
  ],
  Haryana: [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula',
    'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Kurukshetra', 'Kaithal', 'Rewari', 'Palwal', 'Fatehabad', 'Jhajjar',
    'Narnaul', 'Charkhi Dadri', 'Nuh',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Kullu', 'Manali', 'Hamirpur', 'Una', 'Bilaspur', 'Chamba', 'Nahan',
    'Palampur', 'Kangra', 'Keylong', 'Reckong Peo', 'Baddi',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur', 'Rajouri', 'Poonch', 'Pulwama',
    'Kupwara', 'Budgam', 'Ganderbal', 'Bandipora', 'Shopian', 'Kulgam', 'Doda', 'Kishtwar', 'Ramban', 'Reasi', 'Samba',
  ],
  Jharkhand: [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Phusro',
    'Medininagar', 'Chaibasa', 'Dumka', 'Godda', 'Sahebganj', 'Pakur', 'Jamtara', 'Koderma', 'Chatra', 'Latehar',
    'Lohardaga', 'Gumla', 'Simdega', 'Khunti', 'Seraikela', 'Garhwa',
  ],
  Karnataka: [
    'Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari', 'Vijayapura',
    'Shivamogga', 'Tumakuru', 'Davanagere', 'Raichur', 'Bidar', 'Hassan', 'Udupi', 'Chitradurga', 'Kolar', 'Mandya',
    'Chikkamagaluru', 'Bagalkot', 'Gadag', 'Haveri', 'Karwar', 'Koppal', 'Yadgir', 'Chamarajanagar', 'Madikeri',
    'Ramanagara', 'Chikkaballapur', 'Hosapete', 'Bhadravati', 'Gangavati',
  ],
  Kerala: [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad',
    'Malappuram', 'Kasaragod', 'Pathanamthitta', 'Painavu', 'Kalpetta', 'Thodupuzha', 'Manjeri', 'Tirur', 'Kayamkulam',
    'Vadakara', 'Ponnani', 'Guruvayur',
  ],
  Ladakh: ['Leh', 'Kargil'],
  Lakshadweep: ['Kavaratti', 'Agatti', 'Minicoy', 'Amini', 'Andrott'],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Katni', 'Singrauli',
    'Burhanpur', 'Khandwa', 'Morena', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Chhatarpur', 'Damoh',
    'Mandsaur', 'Khargone', 'Neemuch', 'Pithampur', 'Narmadapuram', 'Itarsi', 'Sehore', 'Betul', 'Seoni', 'Datia', 'Nagda',
    'Dhar', 'Balaghat', 'Mandla', 'Shahdol', 'Tikamgarh', 'Panna', 'Raisen', 'Rajgarh', 'Shajapur', 'Barwani', 'Jhabua',
    'Alirajpur', 'Anuppur', 'Umaria', 'Dindori', 'Sidhi', 'Harda', 'Narsinghpur', 'Ashoknagar', 'Sheopur', 'Agar Malwa', 'Niwari',
  ],
  Maharashtra: [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar', 'Aurangabad', 'Solapur', 'Navi Mumbai',
    'Kalyan', 'Vasai-Virar', 'Kolhapur', 'Amravati', 'Sangli', 'Malegaon', 'Jalgaon', 'Akola', 'Latur', 'Dhule',
    'Ahilyanagar', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Bhiwandi', 'Panvel', 'Satara', 'Beed',
    'Yavatmal', 'Nanded', 'Dharashiv', 'Wardha', 'Gondia', 'Bhandara', 'Ratnagiri', 'Oros', 'Alibag', 'Palghar',
    'Nandurbar', 'Washim', 'Hingoli', 'Buldhana', 'Gadchiroli', 'Baramati', 'Pimpri-Chinchwad', 'Lonavala',
  ],
  Manipur: [
    'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul', 'Senapati', 'Tamenglong', 'Chandel', 'Kakching',
    'Jiribam', 'Kangpokpi', 'Moreh',
  ],
  Meghalaya: [
    'Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar', 'Baghmara', 'Nongpoh', 'Mairang', 'Resubelpara',
    'Khliehriat', 'Ampati', 'Mawkyrwat',
  ],
  Mizoram: ['Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip', 'Lawngtlai', 'Saiha', 'Mamit', 'Khawzawl', 'Hnahthial', 'Saitual'],
  Nagaland: [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek', 'Kiphire', 'Longleng', 'Peren',
    'Chumoukedima', 'Noklak',
  ],
  Odisha: [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada',
    'Jharsuguda', 'Jeypore', 'Bargarh', 'Angul', 'Dhenkanal', 'Kendrapara', 'Jajpur', 'Keonjhar', 'Koraput', 'Rayagada',
    'Bolangir', 'Bhawanipatna', 'Sundargarh', 'Phulbani', 'Paralakhemundi', 'Nabarangpur', 'Malkangiri', 'Nuapada',
    'Sonepur', 'Boudh', 'Deogarh', 'Nayagarh', 'Jagatsinghpur', 'Khordha', 'Talcher',
  ],
  Puducherry: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  Punjab: [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Pathankot', 'Moga', 'Batala',
    'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Sri Muktsar Sahib', 'Barnala', 'Rajpura', 'Firozpur', 'Kapurthala',
    'Faridkot', 'Sangrur', 'Gurdaspur', 'Fazilka', 'Mansa', 'Rupnagar', 'Nawanshahr', 'Tarn Taran', 'Fatehgarh Sahib',
  ],
  Rajasthan: [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali',
    'Sri Ganganagar', 'Tonk', 'Kishangarh', 'Beawar', 'Hanumangarh', 'Dholpur', 'Gangapur City', 'Sawai Madhopur', 'Churu',
    'Jhunjhunu', 'Baran', 'Bundi', 'Chittorgarh', 'Barmer', 'Jaisalmer', 'Nagaur', 'Banswara', 'Dungarpur', 'Rajsamand',
    'Sirohi', 'Jalore', 'Pratapgarh', 'Karauli', 'Dausa', 'Jhalawar', 'Mount Abu',
  ],
  Sikkim: ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Jorethang', 'Singtam', 'Pakyong', 'Soreng'],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode',
    'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Ooty', 'Hosur', 'Nagercoil', 'Kanchipuram',
    'Kumbakonam', 'Cuddalore', 'Tiruvannamalai', 'Pollachi', 'Rajapalayam', 'Pudukkottai', 'Namakkal', 'Krishnagiri',
    'Dharmapuri', 'Villupuram', 'Nagapattinam', 'Ramanathapuram', 'Sivaganga', 'Virudhunagar', 'Theni', 'Ariyalur',
    'Perambalur', 'Tiruvallur', 'Chengalpattu', 'Kallakurichi', 'Tenkasi', 'Tirupattur', 'Mayiladuthurai', 'Tiruvarur', 'Karaikudi',
  ],
  Telangana: [
    'Hyderabad', 'Secunderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar',
    'Nalgonda', 'Adilabad', 'Suryapet', 'Siddipet', 'Miryalaguda', 'Jagtial', 'Mancherial', 'Kothagudem', 'Sangareddy',
    'Medak', 'Vikarabad', 'Wanaparthy', 'Nagarkurnool', 'Gadwal', 'Kamareddy', 'Nirmal', 'Peddapalli', 'Bhupalpally',
    'Mahabubabad', 'Jangaon', 'Bhongir', 'Narayanpet', 'Mulugu', 'Asifabad', 'Sircilla',
  ],
  Tripura: [
    'Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia', 'Ambassa', 'Khowai', 'Teliamura', 'Bishalgarh',
    'Sabroom', 'Sonamura', 'Kamalpur',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad',
    'Saharanpur', 'Gorakhpur', 'Noida', 'Greater Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Ayodhya',
    'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha',
    'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur',
    'Hathras', 'Banda', 'Pilibhit', 'Barabanki', 'Khurja', 'Gonda', 'Mainpuri', 'Lalitpur', 'Etah', 'Deoria', 'Ghazipur',
    'Sultanpur', 'Azamgarh', 'Bijnor', 'Basti', 'Ballia', 'Budaun', 'Kannauj', 'Chandauli', 'Robertsganj', 'Mahoba',
    'Hamirpur', 'Chitrakoot', 'Kaushambi', 'Pratapgarh', 'Amethi', 'Akbarpur', 'Bhadohi', 'Padrauna', 'Maharajganj',
    'Siddharthnagar', 'Khalilabad', 'Shravasti', 'Balrampur', 'Auraiya', 'Kasganj', 'Shamli', 'Baghpat',
  ],
  Uttarakhand: [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Almora',
    'Pithoragarh', 'Mussoorie', 'Kotdwar', 'Pauri', 'New Tehri', 'Uttarkashi', 'Gopeshwar', 'Rudraprayag', 'Bageshwar', 'Champawat',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'English Bazar', 'Kharagpur', 'Haldia',
    'Baharampur', 'Krishnanagar', 'Barasat', 'Bally', 'Habra', 'Raiganj', 'Jalpaiguri', 'Cooch Behar', 'Darjeeling',
    'Kalimpong', 'Alipurduar', 'Balurghat', 'Bankura', 'Purulia', 'Midnapore', 'Tamluk', 'Contai', 'Bolpur', 'Suri',
    'Chinsurah', 'Serampore', 'Barrackpore', 'Kalyani', 'Bidhannagar', 'Diamond Harbour', 'Jhargram', 'Islampur',
  ],
};

/** Every city with the states it appears in, sorted by name (a name can exist in several states). */
export const ALL_CITIES = Object.entries(CITIES_BY_STATE)
  .flatMap(([state, cities]) => cities.map((city) => ({ city, state })))
  .sort((a, b) => a.city.localeCompare(b.city));
