const axios = require('axios');

const sentimentServiceUrl = process.env.SENTIMENT_SERVICE_URL || 'http://localhost:5004';

const analyzeSentiment = async (text) => {
  try {
    const response = await axios.post(
      `${sentimentServiceUrl}/analyze`,
      { text },
      {
        timeout: 5000
      }
    );
    return response.data;
  } catch (error) {
    console.error('Sentiment service error:', error.message);

    // Return a default neutral sentiment if service is unavailable
    return {
      sentiment: 'NEUTRAL',
      score: 0.5,
      error: error.message
    };
  }
};

module.exports = { analyzeSentiment };
