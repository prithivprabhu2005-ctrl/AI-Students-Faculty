require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { processNLQ } = require('../services/chatbotService');

const runTests = async () => {
  await connectDB();

  console.log('\n======================================');
  console.log('Running NLQ Chatbot Engine Test Suite');
  console.log('======================================\n');

  let contextRegNo = null;

  const testCases = [
    { q: 'Who is the college topper?', expectsContext: true },
    { q: 'Show his marks.', expectsContext: true }, // Should use context
    { q: 'Who failed Programming?', expectsContext: false },
    { q: 'Who is the ECE topper?', expectsContext: true },
    { q: 'Show ECE students with CGPA above 8.5', expectsContext: false },
    { q: 'Who is the CM of Tamil Nadu?', expectsContext: false }, // Should block
    { q: 'What is Python?', expectsContext: false } // Should block
  ];

  for (const tc of testCases) {
    console.log(`User: "${tc.q}"`);
    const result = await processNLQ(tc.q, contextRegNo);
    console.log(`Bot:\n${result.responseText}\n`);
    if (tc.expectsContext) {
      contextRegNo = result.contextRegNo;
      console.log(`[Context Updated to: ${contextRegNo}]\n`);
    }
    console.log('--------------------------------------\n');
  }

  mongoose.connection.close();
  console.log('Test completed and database connection closed.');
};

runTests();
