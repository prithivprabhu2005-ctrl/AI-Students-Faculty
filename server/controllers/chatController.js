const chatbotService = require('../services/chatbotService');

// POST /api/chat
exports.handleChatMessage = async (req, res) => {
  try {
    const { message, contextRegNo } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required' });
    }

    const result = await chatbotService.processNLQ(message, contextRegNo);
    
    res.json({
      responseText: result.responseText,
      contextRegNo: result.contextRegNo
    });
  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({ message: 'Error processing chatbot message' });
  }
};
