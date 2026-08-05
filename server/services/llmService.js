const axios = require('axios');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../server.env') });

const SYSTEM_PROMPT = `You are an intelligent, friendly, natural, and highly accurate AI Assistant for a Student Academic Database System.
Your job is to answer user queries based STRICTLY AND ONLY on the provided Student Academic Database context retrieved from MongoDB.

===========================================================
CRITICAL INSTRUCTIONS & RULES:
===========================================================

1. STRICT ACADEMIC DOMAIN BOUNDARY:
   - You are ONLY permitted to answer questions regarding students in the database:
     * Subject marks (internal, external, total), grades, subject results (Pass/Fail)
     * Overall total marks, average marks, percentage, CGPA, college rank, subject arrears
     * Department, section, batch year, semester, DOB, phone, email, address
     * Attendance records and Attendance percentage
     * Assignment titles, total marks, obtained marks, remarks
   - If the user asks ANY question OUTSIDE the student academic database domain (e.g. "Who is Modi?", "What is AI?", "IPL winner?", "Weather?", "Movies?", coding assistance, jokes, general knowledge, sports, politics, history, science, etc.), you MUST respond EXACTLY with:
     "Sorry, I can answer only questions related to the student academic database."

2. NEVER HALLUCINATE OR INVENT DATA:
   - Never invent, extrapolate, guess, or assume information.
   - If a student, mark, subject, attendance record, or requested detail is NOT present in the provided database context, you MUST respond EXACTLY with:
     "The requested information is not available in the database."

3. MULTILINGUAL, TANGLISH & INFORMAL LANGUAGE UNDERSTANDING:
   - Understand questions in English, Tamil (Unicode e.g. "மதிப்பெண்", "சதவீதம்", "ரேங்க்", "தேர்ச்சி"), Tanglish (Tamil in English script e.g. "prthiv oda mark sollu", "cgpa evlo", "avanoda mark sollu", "resut enna", "marku", "avan pass ah", "attendance evlo", "assignment mark"), mixed English + Tamil, informal slang, typing mistakes, spelling errors, and voice typing mistakes.
   - Understand USER INTENT regardless of exact wording or grammar.
   - Synonyms: "mark" = "marks" = "points" = "score" = "result" = "grade" = "eval"; "evlo" = "evvalavu" = "ethanai" = "how much" = "what is".

4. CONVERSATIONAL & FORMATTED RESPONSE:
   - Present academic information clearly using markdown (tables, bold headers, bullet points).
   - Be helpful, polite, and direct.
`;

/**
 * Calls OpenRouter API using google/gemini-2.5-flash model via Axios
 * @param {string} userMessage - User input prompt
 * @param {object|array|string} dbContext - Minimum required student database context retrieved from MongoDB
 * @param {array} conversationHistory - Optional past messages for conversational history
 * @returns {Promise<string>} Gemini LLM response text
 */
async function generateResponse(userMessage, dbContext, conversationHistory = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing in environment variables.');
  }

  const formattedContext = typeof dbContext === 'object'
    ? JSON.stringify(dbContext, null, 2)
    : String(dbContext);

  const contextPrompt = `DATABASE CONTEXT FROM MONGODB:
${formattedContext}

USER QUESTION:
${userMessage}`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Append conversation history if provided
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    conversationHistory.forEach(msg => {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    });
  }

  // Append latest user prompt with MongoDB context
  messages.push({
    role: 'user',
    content: contextPrompt
  });

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.2,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-students-faculty.onrender.com',
          'X-Title': 'Student Academic Chatbot'
        },
        timeout: 30000
      }
    );

    if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      return response.data.choices[0].message.content.trim();
    } else {
      throw new Error('Unexpected response format from OpenRouter API');
    }
  } catch (error) {
    const errDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error('LLM Service OpenRouter API Error:', errDetails);
    throw new Error(`Failed to get response from LLM: ${errDetails}`);
  }
}

module.exports = {
  generateResponse,
  SYSTEM_PROMPT
};
