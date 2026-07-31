/**
 * Startup Environment Variable Validator
 * Validates critical environment variables required for production execution
 */
function validateEnv() {
  const requiredVars = ['MONGO_URI', 'JWT_SECRET', 'OPENROUTER_API_KEY'];
  const missing = [];

  requiredVars.forEach(v => {
    if (!process.env[v]) {
      missing.push(v);
    }
  });

  if (missing.length > 0) {
    console.warn(`⚠️ WARNING: The following environment variables are missing: ${missing.join(', ')}`);
    console.warn('Fallback default values or local development mode will be used where applicable.');
  } else {
    console.log('✅ Environment configuration validated successfully.');
  }
}

module.exports = validateEnv;
