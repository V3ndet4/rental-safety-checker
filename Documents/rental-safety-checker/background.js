// Background Service Worker - Handles Claude API calls
console.log('🤖 Rental Safety Checker - AI Agent Background Service started');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeWithAI') {
    analyzeListingWithClaude(request.data)
      .then(result => sendResponse({ success: true, analysis: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Analyze listing with Claude API
async function analyzeListingWithClaude(listingData) {
  // Get API key from storage
  const storage = await chrome.storage.sync.get(['claudeApiKey']);
  const apiKey = storage.claudeApiKey;

  if (!apiKey) {
    return {
      aiEnabled: false,
      message: 'AI analysis disabled - no API key configured'
    };
  }

  const prompt = `You are a rental scam detection expert analyzing a Facebook Marketplace rental listing. Analyze this listing and provide detailed insights.

LISTING DATA:
Title: ${listingData.title}
Price: ${listingData.price}
Location: ${listingData.location}
Description: ${listingData.description}

ANALYSIS REQUESTED:
1. **Property Type & Size**: What type of rental is this (room, studio, apartment, house)? Estimate square footage if not stated.
2. **Fair Market Value**: Based on the location and description, what should this rent for? Consider:
   - Property type and estimated size
   - Location market rates
   - Amenities mentioned
   - Utilities included/excluded
3. **Scam Risk Assessment**: Rate 0-100 (0=definite scam, 100=legitimate). Look for:
   - Manipulation tactics (urgency, emotional appeals, trust-building)
   - Vague or contradictory details
   - Too-good-to-be-true pricing
   - Payment red flags
   - Communication patterns
4. **Red Flags**: List specific suspicious elements
5. **Green Flags**: List legitimate-seeming elements
6. **Recommendation**: Should the user pursue this listing?

Respond in JSON format:
{
  "propertyType": "room/studio/1BR/etc",
  "estimatedSqFt": number,
  "fairMarketRent": {"min": number, "max": number},
  "scamRiskScore": number (0-100),
  "confidence": "high/medium/low",
  "redFlags": ["flag1", "flag2"],
  "greenFlags": ["flag1", "flag2"],
  "priceAssessment": "scam/too-low/fair/high",
  "recommendation": "avoid/verify-carefully/proceed-with-caution/safe-to-contact",
  "reasoning": "brief explanation"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        aiEnabled: true,
        ...analysis
      };
    }

    return {
      aiEnabled: true,
      error: 'Failed to parse AI response'
    };

  } catch (error) {
    console.error('Claude API error:', error);
    return {
      aiEnabled: false,
      error: error.message
    };
  }
}
