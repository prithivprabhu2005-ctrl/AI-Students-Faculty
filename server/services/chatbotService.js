const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const llmService = require('./llmService');

// In-memory session history store mapped by session key / regNo
const sessionHistoryStore = new Map();

/**
 * Escapes regex special characters
 */
function escapeRegex(str) {
  return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates Levenshtein Distance between two strings for fuzzy matching
 */
function getLevenshteinDistance(a, b) {
  const str1 = (a || '').toLowerCase().trim();
  const str2 = (b || '').toLowerCase().trim();
  if (str1 === str2) return 0;
  if (!str1.length) return str2.length;
  if (!str2.length) return str1.length;

  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

/**
 * Subject detection using active Subject documents from MongoDB
 */
async function detectSubject(text) {
  const t = (text || '').toLowerCase();
  
  // Check default subjects first
  if (/\b(math|maths|mathematics|mat)\b/i.test(t)) return 'mathematics';
  if (/\b(db|database|sql|dbms)\b/i.test(t)) return 'database';
  if (/\b(os|operating system|operating systems)\b/i.test(t)) return 'operatingSystems';
  if (/\b(cn|network|networks|computer network|computer networks)\b/i.test(t)) return 'computerNetworks';
  if (/\b(prog|programming|python|coding|code|c\+\+)\b/i.test(t)) return 'programming';
  if (/\b(eng|english)\b/i.test(t)) return 'english';

  // Check dynamic MongoDB subjects
  try {
    const activeSubjects = await Subject.find({ isActive: true }).lean();
    for (const sub of activeSubjects) {
      const code = (sub.subjectCode || '').toLowerCase();
      const name = (sub.subjectName || '').toLowerCase();
      if (code && t.includes(code)) return sub.subjectName || sub.subjectCode;
      if (name && t.includes(name)) return sub.subjectName || sub.subjectCode;
    }
  } catch (err) {
    console.error('Error detecting subject from DB:', err);
  }
  return null;
}

/**
 * Helper to detect Department from user text
 */
function detectDepartment(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('ai&ds') || t.includes('aids') || t.includes('ai & ds') || t.includes('artificial intelligence')) return 'AI&DS';
  if (t.includes('cse') || t.includes('computer science')) return 'CSE';
  if (t.includes('ece') || t.includes('electronics')) return 'ECE';
  if (t.includes('eee') || t.includes('electrical')) return 'EEE';
  if (t.includes('mech') || t.includes('mechanical')) return 'MECH';
  if (t.includes('civil')) return 'CIVIL';
  if (t.includes('it') || t.includes('information tech')) return 'IT';
  return null;
}

/**
 * Helper to detect Gender from user text
 */
function detectGender(text) {
  const t = (text || '').toLowerCase();
  if (/\b(girl|girls|female|women)\b/i.test(t)) return 'Female';
  if (/\b(boy|boys|male|men)\b/i.test(t)) return 'Male';
  return null;
}

/**
 * Ignore Words set for extracting clean student names
 */
const IGNORE_WORDS = new Set([
  // Action & filler words
  'show', 'tell', 'give', 'get', 'view', 'find', 'search', 'check', 'please', 'can', 'you',
  'is', 'the', 'of', 'for', 'in', 'on', 'what', 'who', 'how', 'which', 'many', 'a', 'an',
  // Metrics & attributes
  'mark', 'marks', 'marksheet', 'sheet', 'marku', 'cgpa', 'gpa', 'rank', 'ranks', 'result', 'results', 'resut',
  'total', 'average', 'avg', 'percentage', 'percent', 'arrear', 'arrears', 'grade',
  'details', 'detail', 'info', 'information', 'profile', 'status', 'pass', 'fail', 'passed',
  'failed', 'score', 'scored', 'points', 'eval', 'report', 'reports',
  // Academic & Module 2 terms
  'attendance', 'assignment', 'assignments', 'class', 'classes', 'present', 'absent',
  'student', 'students', 'studentoda', 'department', 'dept', 'sem', 'semester', 'batch', 'year', 'section',
  // Tanglish / Tamil fillers & pronouns
  'oda', 'sollu', 'solu', 'solunga', 'evlo', 'evvalavu', 'ethanai', 'ethini', 'enna',
  'ah', 'nu', 'da', 'pa', 'ku', 'avanoda', 'avan', 'avaloda', 'aval', 'ithu', 'idhu',
  'intha', 'indha', 'his', 'her', 'their', 'this', 'that', 'with'
]);

/**
 * Extracts student name string and tokens from raw user message
 */
function extractNameFromMessage(message) {
  const words = (message || '')
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const cleanWords = words.filter(word => !IGNORE_WORDS.has(word.toLowerCase()));

  if (cleanWords.length === 0) {
    return { candidateNameStr: '', nameTokens: [] };
  }

  const candidateNameStr = cleanWords.join(' ').trim();
  return {
    candidateNameStr,
    nameTokens: cleanWords
  };
}

/**
 * Formats student object with clean schema for LLM
 */
function formatStudentData(s) {
  if (!s) return null;
  const formattedMarks = {};
  if (s.marks) {
    Object.keys(s.marks).forEach(k => {
      const m = s.marks[k];
      if (m) {
        formattedMarks[k] = { total: m.total, grade: m.grade, result: m.result };
      }
    });
  }
  return {
    registerNumber: s.registerNumber,
    name: s.name,
    department: s.department,
    batchYear: s.batchYear,
    semester: s.semester,
    section: s.section,
    gender: s.gender,
    cgpa: s.cgpa,
    rank: s.rank,
    totalMarks: s.totalMarks,
    averageMarks: s.averageMarks,
    percentage: s.percentage,
    arrears: s.arrears,
    result: s.result,
    marks: formattedMarks
  };
}

/**
 * Fetches Attendance & Assignment details for a specific student
 */
async function fetchStudentAcademicSummary(studentId, registerNumber) {
  const summary = {};

  try {
    const attendanceRecords = await Attendance.find({
      $or: [{ student: studentId }, { registerNumber: registerNumber }]
    }).populate('subject', 'subjectName subjectCode').lean();

    if (attendanceRecords.length > 0) {
      const total = attendanceRecords.length;
      const present = attendanceRecords.filter(a => a.status === 'Present').length;
      const pct = ((present / total) * 100).toFixed(1);
      summary.attendance = {
        totalClasses: total,
        attendedClasses: present,
        absentClasses: total - present,
        percentage: `${pct}%`,
        records: attendanceRecords.map(a => ({
          subject: a.subject?.subjectName || a.subjectCode,
          date: a.date,
          status: a.status
        }))
      };
    }

    const assignmentRecords = await Assignment.find({
      $or: [{ student: studentId }, { registerNumber: registerNumber }]
    }).populate('subject', 'subjectName subjectCode').lean();

    if (assignmentRecords.length > 0) {
      summary.assignments = assignmentRecords.map(a => ({
        subject: a.subject?.subjectName || a.subjectCode,
        title: a.assignmentTitle,
        obtainedMarks: a.obtainedMarks,
        totalMarks: a.totalMarks,
        percentage: `${((a.obtainedMarks / a.totalMarks) * 100).toFixed(1)}%`,
        remarks: a.remarks
      }));
    }
  } catch (err) {
    console.error('Error fetching student academic summary:', err);
  }

  return summary;
}

/**
 * Priority-Ranked Student Search in MongoDB:
 * Priority 1: Exact full name (case-insensitive)
 * Priority 2: Full name contains all query words
 * Priority 3: Register Number
 * Priority 4: Student ID
 * Priority 5: Partial name match (contains ANY query word)
 * Priority 6: Fuzzy (Levenshtein distance)
 */
async function searchStudentByName(candidateNameStr, nameTokens, rawMessage = '') {
  if (!candidateNameStr && (!nameTokens || nameTokens.length === 0)) {
    return [];
  }

  const candLower = (candidateNameStr || '').toLowerCase().trim();

  // Priority 1: Exact full name (case-insensitive)
  if (candLower) {
    const exactMatches = await Student.find({
      name: { $regex: `^${escapeRegex(candLower)}$`, $options: 'i' }
    }).lean();

    if (exactMatches.length > 0) {
      return exactMatches;
    }
  }

  // Priority 2: Full name contains all query words
  if (nameTokens && nameTokens.length > 0) {
    const andConds = nameTokens.map(token => ({
      name: { $regex: escapeRegex(token), $options: 'i' }
    }));
    const containsAllMatches = await Student.find({ $and: andConds }).lean();

    if (containsAllMatches.length > 0) {
      return containsAllMatches;
    }
  }

  // Priority 3: Register Number
  const regNoMatch = (rawMessage || '').match(/\b\d{2}[A-Z]{2,4}\d{3}\b/i);
  if (regNoMatch) {
    const regMatches = await Student.find({
      registerNumber: { $regex: `^${escapeRegex(regNoMatch[0])}$`, $options: 'i' }
    }).lean();

    if (regMatches.length > 0) {
      return regMatches;
    }
  }

  // Priority 4: Student ID
  const stuIdMatch = (rawMessage || '').match(/\bSTU\d+\b/i) || (rawMessage || '').match(/\bS\d{4}\b/i);
  if (stuIdMatch) {
    const stuMatches = await Student.find({
      studentId: { $regex: `^${escapeRegex(stuIdMatch[0])}$`, $options: 'i' }
    }).lean();

    if (stuMatches.length > 0) {
      return stuMatches;
    }
  }

  // Priority 5: Partial name match (contains ANY query word)
  if (nameTokens && nameTokens.length > 0) {
    const orConds = nameTokens.map(token => ({
      name: { $regex: escapeRegex(token), $options: 'i' }
    }));
    const partialMatches = await Student.find({ $or: orConds }).lean();

    if (partialMatches.length > 0) {
      return partialMatches;
    }
  }

  // Priority 6: Fuzzy (Levenshtein distance)
  const allStudents = await Student.find({}, { _id: 1, name: 1, registerNumber: 1, studentId: 1 }).lean();
  const fuzzyMatchIds = new Set();

  for (const s of allStudents) {
    const dbNameLower = (s.name || '').toLowerCase();

    // Full name edit distance check
    if (candLower) {
      const fullDist = getLevenshteinDistance(candLower, dbNameLower);
      const maxFullAllowed = Math.max(1, Math.floor(dbNameLower.length * 0.35));

      if (fullDist <= maxFullAllowed) {
        fuzzyMatchIds.add(s._id.toString());
        continue;
      }
    }

    // Token-level edit distance check
    if (nameTokens && nameTokens.length > 0) {
      const dbParts = dbNameLower.split(/\s+/);
      for (const token of nameTokens) {
        const tokLower = token.toLowerCase();
        for (const part of dbParts) {
          const dist = getLevenshteinDistance(tokLower, part);
          const maxAllowed = Math.max(1, Math.floor(part.length * 0.35));
          if (dist <= maxAllowed) {
            fuzzyMatchIds.add(s._id.toString());
            break;
          }
        }
      }
    }
  }

  if (fuzzyMatchIds.size > 0) {
    const fuzzyMatches = await Student.find({
      _id: { $in: Array.from(fuzzyMatchIds) }
    }).lean();
    return fuzzyMatches;
  }

  return [];
}

/**
 * Main NLQ processing function with multi-step search & targeted MongoDB retrieval
 */
async function processNLQ(message, contextRegNo = null) {
  try {
    const trimmedMessage = (message || '').trim();
    const lowerMsg = trimmedMessage.toLowerCase();
    let dbContextData = null;
    let activeRegNo = contextRegNo || null;
    let queryHandled = false;

    // Detect Department, Subject, and Gender
    const detectedDept = detectDepartment(lowerMsg);
    const detectedSubject = await detectSubject(lowerMsg);
    const detectedGender = detectGender(lowerMsg);

    // 1. Direct Register Number or Student ID exact search (e.g. 21CS045 or S1001)
    const regNoMatch = trimmedMessage.match(/\b\d{2}[A-Z]{2,4}\d{3}\b/i) || trimmedMessage.match(/\bS\d{4}\b/i);
    if (regNoMatch) {
      const searchId = regNoMatch[0].toUpperCase();
      const student = await Student.findOne({
        $or: [{ registerNumber: searchId }, { studentId: searchId }]
      }).lean();

      if (student) {
        activeRegNo = student.registerNumber;
        const extra = await fetchStudentAcademicSummary(student._id, student.registerNumber);
        dbContextData = {
          intent: "DIRECT_STUDENT_LOOKUP",
          activeStudent: { ...formatStudentData(student), ...extra },
          requestedSubject: detectedSubject || undefined
        };
        queryHandled = true;
      }
    }

    // 2. College / Department Topper Queries
    if (!queryHandled && (lowerMsg.includes('topper') || lowerMsg.includes('rank 1') || lowerMsg.includes('first rank'))) {
      if (detectedDept) {
        const deptTopper = await Student.findOne({ department: detectedDept }).sort({ rank: 1 }).lean();
        if (deptTopper) {
          activeRegNo = deptTopper.registerNumber;
          dbContextData = {
            intent: "DEPARTMENT_TOPPER",
            department: detectedDept,
            topper: formatStudentData(deptTopper)
          };
        }
      } else {
        const collegeTopper = await Student.findOne().sort({ rank: 1 }).lean();
        if (collegeTopper) {
          activeRegNo = collegeTopper.registerNumber;
          dbContextData = {
            intent: "COLLEGE_TOPPER",
            topper: formatStudentData(collegeTopper)
          };
        }
      }
      queryHandled = true;
    }

    // 3. Top N Students Query (e.g. "Top 10 students")
    if (!queryHandled && (lowerMsg.includes('top ') || lowerMsg.includes('first ') || lowerMsg.includes('rankers'))) {
      const limitMatch = lowerMsg.match(/(?:top|first)\s+(\d+)/);
      const limit = limitMatch ? Math.min(parseInt(limitMatch[1], 10), 10) : 10;
      const filter = detectedDept ? { department: detectedDept } : {};
      const topList = await Student.find(filter).sort({ rank: 1 }).limit(limit).lean();
      dbContextData = {
        intent: "TOP_STUDENTS_LIST",
        count: topList.length,
        students: topList.map(s => formatStudentData(s))
      };
      queryHandled = true;
    }

    // 4. Centum / 100 Marks Query
    if (!queryHandled && (lowerMsg.includes('100') || lowerMsg.includes('full mark') || lowerMsg.includes('centum'))) {
      const subject = detectedSubject;
      let centumList = [];
      if (subject) {
        const queryCond = {};
        queryCond[`marks.${subject}.total`] = 100;
        centumList = await Student.find(queryCond).limit(10).lean();
      } else {
        centumList = await Student.find({ percentage: 100 }).limit(10).lean();
      }
      dbContextData = {
        intent: "SUBJECT_CENTUM_STUDENTS",
        subject: subject || "Overall",
        count: centumList.length,
        students: centumList.map(s => formatStudentData(s))
      };
      queryHandled = true;
    }

    // 5. Failures or Arrears Query
    if (!queryHandled && (lowerMsg.includes('fail') || lowerMsg.includes('arrear') || lowerMsg.includes('failed'))) {
      if (lowerMsg.includes('count')) {
        const failCount = await Student.countDocuments({ result: 'Fail' });
        dbContextData = { intent: "FAIL_COUNT", failCount };
      } else if (detectedSubject) {
        const queryCond = {};
        queryCond[`marks.${detectedSubject}.result`] = 'Fail';
        const failedList = await Student.find(queryCond).limit(10).lean();
        dbContextData = {
          intent: "FAILED_SUBJECT_STUDENTS",
          subject: detectedSubject,
          count: failedList.length,
          students: failedList.map(s => formatStudentData(s))
        };
      } else {
        const arrearList = await Student.find({ arrears: { $gt: 0 } }).limit(10).lean();
        dbContextData = {
          intent: "STUDENTS_WITH_ARREARS",
          count: arrearList.length,
          students: arrearList.map(s => formatStudentData(s))
        };
      }
      queryHandled = true;
    }

    // 6. Pass Count Query
    if (!queryHandled && (lowerMsg.includes('pass count') || lowerMsg.includes('how many passed') || lowerMsg.includes('passed count'))) {
      const passCount = await Student.countDocuments({ result: 'Pass' });
      dbContextData = { intent: "PASS_COUNT", passCount };
      queryHandled = true;
    }

    // 7. Gender & Department Count Query
    if (!queryHandled && detectedGender && (detectedDept || lowerMsg.includes('count') || lowerMsg.includes('how many'))) {
      const queryCond = { gender: detectedGender };
      if (detectedDept) queryCond.department = detectedDept;
      const genderCount = await Student.countDocuments(queryCond);
      dbContextData = {
        intent: "GENDER_DEPARTMENT_COUNT",
        gender: detectedGender,
        department: detectedDept || "ALL",
        count: genderCount
      };
      queryHandled = true;
    }

    // 8. Department Statistics / Average CGPA
    if (!queryHandled && (lowerMsg.includes('department') || lowerMsg.includes('stats') || lowerMsg.includes('statistics') || lowerMsg.includes('average cgpa') || lowerMsg.includes('avg cgpa'))) {
      if (lowerMsg.includes('average') || lowerMsg.includes('avg')) {
        const matchCond = detectedDept ? { $match: { department: detectedDept } } : { $match: {} };
        const avgStats = await Student.aggregate([
          matchCond,
          { $group: { _id: "$department", avgCgpa: { $avg: "$cgpa" } } }
        ]);
        dbContextData = {
          intent: "AVERAGE_CGPA_STATS",
          department: detectedDept || "ALL",
          stats: avgStats.map(s => ({ department: s._id, averageCgpa: Number(s.avgCgpa.toFixed(2)) }))
        };
      } else {
        const deptStats = await Student.aggregate([
          {
            $group: {
              _id: "$department",
              totalCount: { $sum: 1 },
              passCount: { $sum: { $cond: [{ $eq: ["$result", "Pass"] }, 1, 0] } },
              failCount: { $sum: { $cond: [{ $eq: ["$result", "Fail"] }, 1, 0] } },
              averageCgpa: { $avg: "$cgpa" }
            }
          }
        ]);
        dbContextData = {
          intent: "DEPARTMENT_STATISTICS",
          statistics: deptStats.map(s => ({
            department: s._id,
            totalCount: s.totalCount,
            passCount: s.passCount,
            failCount: s.failCount,
            averageCgpa: Number(s.averageCgpa.toFixed(2))
          }))
        };
      }
      queryHandled = true;
    }

    // 9. Extract Student Name & Query Student Collection
    if (!queryHandled) {
      const { candidateNameStr, nameTokens } = extractNameFromMessage(trimmedMessage);

      if (candidateNameStr && nameTokens.length > 0) {
        const matchedStudents = await searchStudentByName(candidateNameStr, nameTokens, trimmedMessage);

        if (matchedStudents.length === 1) {
          // Requirement 7: Exactly ONE student matches -> retrieve ONLY that student's record
          const student = matchedStudents[0];
          activeRegNo = student.registerNumber;
          const extra = await fetchStudentAcademicSummary(student._id, student.registerNumber);

          dbContextData = {
            intent: "STUDENT_RECORD_FOUND",
            activeStudent: {
              ...formatStudentData(student),
              ...extra
            },
            requestedSubject: detectedSubject || undefined
          };
          queryHandled = true;
        } else if (matchedStudents.length > 1) {
          // Requirement 8: MULTIPLE students match -> show matching students & ask user to choose
          const formattedList = matchedStudents.map(s => `• ${s.name} (Reg No: ${s.registerNumber}, Dept: ${s.department})`).join('\n');
          return {
            responseText: `Multiple students matched your search for "${candidateNameStr}":\n\n${formattedList}\n\nPlease specify the Register Number or full name of the student you would like to query.`,
            contextRegNo: activeRegNo
          };
        }
      }
    }

    // 10. Active Context Fallback (for follow-ups e.g. "avanoda mark sollu", "cgpa evlo", "attendance evlo")
    if (!queryHandled || !dbContextData) {
      if (activeRegNo) {
        const prevStudent = await Student.findOne({ registerNumber: activeRegNo }).lean();
        if (prevStudent) {
          const extra = await fetchStudentAcademicSummary(prevStudent._id, prevStudent.registerNumber);
          dbContextData = {
            intent: "CONTEXT_STUDENT_ACTIVE",
            activeStudent: {
              ...formatStudentData(prevStudent),
              ...extra
            },
            requestedSubject: detectedSubject || undefined
          };
          queryHandled = true;
        }
      }
    }

    // 11. Requirement 9: If NO student matches and no context, return exact error string
    if (!dbContextData || (!dbContextData.activeStudent && !dbContextData.students && !dbContextData.topper && !dbContextData.statistics && !dbContextData.failCount && !dbContextData.passCount && !dbContextData.count)) {
      return {
        responseText: "The requested information is not available in the database.",
        contextRegNo: activeRegNo
      };
    }

    // 12. Retrieve session conversation history
    const sessionKey = activeRegNo || 'global_session';
    const history = sessionHistoryStore.get(sessionKey) || [];

    // Call OpenRouter Gemini LLM Service with ONLY the target student context
    const responseText = await llmService.generateResponse(trimmedMessage, dbContextData, history);

    // 13. Save turn into session history
    history.push({ role: 'user', content: trimmedMessage });
    history.push({ role: 'assistant', content: responseText });
    if (history.length > 8) {
      history.splice(0, history.length - 8);
    }
    sessionHistoryStore.set(sessionKey, history);

    return {
      responseText,
      contextRegNo: activeRegNo
    };

  } catch (error) {
    console.error('Error in processNLQ chatbotService:', error);
    return {
      responseText: "An error occurred while processing your request with the AI service. Please try again.",
      contextRegNo
    };
  }
}

module.exports = {
  processNLQ
};
