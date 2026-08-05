require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Student = require('../models/Student');

const maleFirstNames = [
  'Aarav', 'Vihaan', 'Arjun', 'Sai', 'Aditya', 'Ishan', 'Krishna', 'Pranav', 'Raghav', 'Shaurya', 
  'Tejas', 'Yash', 'Vivaan', 'Kabir', 'Aryan', 'Dev', 'Harish', 'Kiran', 'Madhav', 'Rohan', 
  'Sandeep', 'Sanjay', 'Suresh', 'Vijay', 'Vikram', 'Rithvik', 'Anirudh', 'Ganesh', 'Kartik', 
  'Manish', 'Nikhil', 'Piyush', 'Rahul', 'Sameer', 'Tarun', 'Varun', 'Abhishek', 'Deepak'
];

const femaleFirstNames = [
  'Aadya', 'Diya', 'Isha', 'Kavya', 'Meera', 'Neha', 'Pooja', 'Riya', 'Shruti', 'Tanvi', 
  'Ananya', 'Priya', 'Sneha', 'Swati', 'Vidya', 'Aditi', 'Divya', 'Harini', 'Meenakshi', 
  'Preethi', 'Sowmya', 'Aishwarya', 'Deepika', 'Kriti', 'Nisha', 'Rupa', 'Sandhya', 'Shalini',
  'Uma', 'Yamini', 'Anjali', 'Archana', 'Bhavana', 'Geetha', 'Kavitha', 'Nandhini', 'Pavithra'
];

const lastNames = [
  'Kumar', 'Sharma', 'Patel', 'Verma', 'Gupta', 'Iyer', 'Reddy', 'Nair', 'Rao', 'Singh', 
  'Joshi', 'Das', 'Sen', 'Murthy', 'Pillai', 'Bhat', 'Bose', 'Chatterjee', 'Deshmukh', 
  'Kulkarni', 'Patil', 'Choudhury', 'Mehta', 'Narang', 'Pande', 'Srinivasan', 'Subramanian',
  'Venkat', 'Venkataraman', 'Dubey', 'Dwivedi', 'Mishra', 'Pandey', 'Trivedi', 'Tripathi'
];

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const deptCodes = {
  'CSE': 'CSE',
  'ECE': 'ECE',
  'EEE': 'EEE',
  'MECH': 'MEC',
  'CIVIL': 'CIV',
  'IT': 'IT',
  'AI&DS': 'AID'
};

const batches = [
  { year: 2021, academicYear: 4, semester: 7 },
  { year: 2022, academicYear: 3, semester: 5 },
  { year: 2023, academicYear: 2, semester: 3 },
  { year: 2024, academicYear: 1, semester: 1 }
];

const generatePhone = () => {
  const prefixes = ['9840', '9884', '9444', '9940', '9790', '9003', '9841', '8939', '7358'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const remaining = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${remaining}`;
};

const generateDob = (batchYear) => {
  // e.g. for batch 2023 (entered college at 18 in 2023, born ~2005)
  const birthYear = batchYear - 18;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(birthYear, month, day);
};

const getRandomMark = (type) => {
  const rand = Math.random();
  // We want a realistic distribution
  // 5% toppers (high marks)
  // 85% average (passing marks)
  // 10% lower or failing marks
  if (type === 'topper') {
    return {
      internal: Math.floor(35 + Math.random() * 6), // 35-40
      external: Math.floor(52 + Math.random() * 9)  // 52-60
    };
  } else if (type === 'fail') {
    return {
      internal: Math.floor(12 + Math.random() * 10), // 12-21
      external: Math.floor(15 + Math.random() * 18)  // 15-32
    };
  } else {
    // average
    return {
      internal: Math.floor(24 + Math.random() * 12), // 24-35
      external: Math.floor(32 + Math.random() * 21)  // 32-52
    };
  }
};

const seedDatabase = async () => {
  await connectDB();

  try {
    console.log('Clearing existing students...');
    await Student.deleteMany({});

    console.log('Generating 300 realistic students...');
    const studentsData = [];

    // Track department roll numbers to prevent duplicate register numbers
    // e.g. deptRegCounters['23CSE'] = 1, 2, 3...
    const deptRegCounters = {};

    const Subject = require('../models/Subject');
    const existingSubjects = await Subject.find({ isActive: true });

    for (let i = 0; i < 300; i++) {
      const gender = Math.random() > 0.5 ? 'Male' : 'Female';
      const firstName = gender === 'Male' 
        ? maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]
        : femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;

      const dept = departments[Math.floor(Math.random() * departments.length)];
      const batchInfo = batches[Math.floor(Math.random() * batches.length)];
      
      const batchYearShort = String(batchInfo.year).slice(-2);
      const deptCode = deptCodes[dept];
      const counterKey = `${batchYearShort}${deptCode}`;
      
      if (!deptRegCounters[counterKey]) {
        deptRegCounters[counterKey] = 1;
      } else {
        deptRegCounters[counterKey]++;
      }

      const rollNumberStr = String(deptRegCounters[counterKey]).padStart(3, '0');
      const registerNumber = `${batchYearShort}${deptCode}${rollNumberStr}`;

      const studentId = `S${String(i + 1).padStart(4, '0')}`;
      const section = Math.random() > 0.6 ? 'B' : 'A';
      const dob = generateDob(batchInfo.year);
      const phone = generatePhone();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@college.edu`;
      const address = `${Math.floor(10 + Math.random() * 150)}, ${['Gandhi Street', 'Nehru Nagar', 'Anna Salai', 'Temple Road', 'Kamaraj Street'][Math.floor(Math.random() * 5)]}, Chennai - 6000${Math.floor(10 + Math.random() * 80)}`;

      let profile = 'average';
      if (i === 0) {
        profile = 'topper';
      } else if (i === 1 || i === 2) {
        profile = 'fail';
      } else {
        const rand = Math.random();
        if (rand < 0.08) {
          profile = 'topper';
        } else if (rand < 0.16) {
          profile = 'fail';
        }
      }

      const generateSubjectMarks = () => getRandomMark(profile);

      const studentMarks = {};
      existingSubjects.forEach(subDoc => {
        studentMarks[subDoc.subjectCode] = (i === 0 && profile === 'topper')
          ? { internal: 38, external: 58 }
          : generateSubjectMarks();
      });

      studentsData.push({
        studentId,
        registerNumber,
        name,
        gender,
        department: dept,
        batchYear: batchInfo.year,
        academicYear: batchInfo.academicYear,
        semester: batchInfo.semester,
        section,
        dob,
        phone,
        email,
        address,
        marks: studentMarks
      });
    }

    console.log('Inserting students into database...');
    // We insert individually or use save hook. Note: Student.create(Array) runs pre-save hooks on each doc.
    const createdStudents = await Student.create(studentsData);
    console.log(`Successfully saved ${createdStudents.length} students.`);

    console.log('Recalculating ranks college-wide...');
    await Student.recalculateRanks();
    console.log('Ranks recalculated successfully!');

    // Fetch college topper and check
    const topper = await Student.findOne().sort({ rank: 1 });
    console.log(`College Topper: ${topper.name} (${topper.registerNumber}) - CGPA: ${topper.cgpa}, Total: ${topper.totalMarks}`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

seedDatabase();
