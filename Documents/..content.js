// Rental Safety Checker - Content Script
// This runs on Facebook Marketplace pages

console.log('🏠 Rental Safety Checker is active!');

// Wait for the page to load
function init() {
  console.log('Checking if this is a rental listing...');

  // Check if we're on a rental/housing listing
  const isRentalListing = checkIfRentalListing();

  if (isRentalListing) {
    console.log('✅ Rental listing detected! Analyzing...');
    analyzeListing();
  } else {
    console.log('ℹ️ Not a rental listing');
  }
}

// Check if the current page is a rental listing
function checkIfRentalListing() {
  const url = window.location.href;

  // Check if URL contains rental/housing keywords
  if (url.includes('/marketplace/item/') || url.includes('/marketplace/product/')) {
    // Look for rental-related text on the page
    const pageText = document.body.innerText.toLowerCase();
    const rentalKeywords = ['rent', 'lease', 'apartment', 'room', 'housing', 'bedroom', 'studio'];

    return rentalKeywords.some(keyword => pageText.includes(keyword));
  }

  return false;
}

// Analyze the listing for red flags
async function analyzeListing() {
  const listingData = extractListingData();
  const redFlags = detectRedFlags(listingData);
  const safetyScore = calculateSafetyScore(redFlags);

  console.log('📊 Analysis complete:', { listingData, redFlags, safetyScore });

  // Display initial results on the page
  displaySafetyWidget(safetyScore, redFlags, null);

  // Request AI analysis in background
  try {
    const aiAnalysis = await requestAIAnalysis(listingData);
    if (aiAnalysis && aiAnalysis.aiEnabled) {
      // Combine AI insights with pattern-based detection
      const enhancedFlags = enhanceWithAI(redFlags, aiAnalysis);
      const enhancedScore = calculateEnhancedScore(safetyScore, aiAnalysis);

      console.log('🤖 AI Analysis complete:', aiAnalysis);

      // Update widget with AI insights
      displaySafetyWidget(enhancedScore, enhancedFlags, aiAnalysis);
    }
  } catch (error) {
    console.warn('AI analysis failed:', error);
  }
}

// Request AI analysis from background script
function requestAIAnalysis(listingData) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'analyzeWithAI', data: listingData },
      response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response.success) {
          resolve(response.analysis);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

// Enhance red flags with AI insights
function enhanceWithAI(redFlags, aiAnalysis) {
  const enhanced = [...redFlags];

  // Add AI-detected red flags
  if (aiAnalysis.redFlags && aiAnalysis.redFlags.length > 0) {
    aiAnalysis.redFlags.forEach(flag => {
      enhanced.push({
        severity: 'high',
        message: `🤖 AI detected: ${flag}`,
        category: 'ai-detection'
      });
    });
  }

  // Add price assessment from AI
  if (aiAnalysis.priceAssessment === 'scam') {
    enhanced.push({
      severity: 'critical',
      message: `🤖 AI Assessment: Price is likely a scam (Fair market: $${aiAnalysis.fairMarketRent.min}-$${aiAnalysis.fairMarketRent.max})`,
      category: 'ai-price'
    });
  } else if (aiAnalysis.priceAssessment === 'too-low') {
    enhanced.push({
      severity: 'medium',
      message: `🤖 AI Assessment: Below market rate (Fair: $${aiAnalysis.fairMarketRent.min}-$${aiAnalysis.fairMarketRent.max})`,
      category: 'ai-price'
    });
  } else if (aiAnalysis.priceAssessment === 'fair') {
    enhanced.push({
      severity: 'info',
      message: `🤖 AI Assessment: Fair price for ${aiAnalysis.propertyType} (~${aiAnalysis.estimatedSqFt} sq ft)`,
      category: 'ai-price'
    });
  }

  return enhanced;
}

// Calculate enhanced score with AI input
function calculateEnhancedScore(patternScore, aiAnalysis) {
  // Weight: 60% pattern-based, 40% AI
  const aiScore = aiAnalysis.scamRiskScore || patternScore;
  const combined = (patternScore * 0.6) + (aiScore * 0.4);

  return Math.round(combined);
}

// Extract data from the listing
function extractListingData() {
  const data = {
    title: '',
    description: '',
    price: '',
    location: '',
    sellerInfo: '',
    squareFootage: null,
    bedrooms: null
  };

  // Get ALL text from the page
  const pageText = document.body.innerText;

  // Try to find the title - Facebook Marketplace specific selectors
  const titleElement = document.querySelector('h1') ||
                       document.querySelector('[role="heading"]') ||
                       document.querySelector('span[dir="auto"]');
  if (titleElement) {
    data.title = titleElement.innerText;
  }

  // Try to find the price - look for $ followed by numbers
  // PRIORITY: Match prices with explicit rental periods first (most reliable)
  // Try multiple patterns in order of reliability
  let priceMatch = null;

  // Pattern 1: Price with comma + period (e.g., "$1,150 / Month", "$2,500/mo")
  priceMatch = pageText.match(/\$\d{1,3},\d{3}(\.\d{2})?\s*(\/\s*)?(month|mo|week|wk|per month)/i);

  // Pattern 2: Price without comma + period (e.g., "$700/month", "$850 / mo")
  if (!priceMatch) {
    priceMatch = pageText.match(/\$\d{3,5}(\.\d{2})?\s*(\/\s*)?(month|mo|week|wk|per month)/i);
  }

  // Pattern 3: Any price with rental period (fallback)
  if (!priceMatch) {
    priceMatch = pageText.match(/\$\d{1,5}\s*(\/\s*)?(month|mo|week|wk|per month)/i);
  }

  // Pattern 4: Just dollar amount with comma (e.g., "$1,150")
  if (!priceMatch) {
    priceMatch = pageText.match(/\$\d{1,3},\d{3}(\.\d{2})?/);
  }

  // Pattern 5: Last resort - any dollar amount 3+ digits
  if (!priceMatch) {
    priceMatch = pageText.match(/\$\d{3,5}(\.\d{2})?/);
  }

  if (priceMatch) {
    data.price = priceMatch[0];
  }

  // Get the full page description (first 5000 characters)
  data.description = pageText.substring(0, 5000);

  // Try to find location - multiple patterns
  let locationMatch = pageText.match(/([A-Z][a-z]+,\s*[A-Z]{2})/);
  if (!locationMatch) {
    // Try matching "City, State" pattern
    locationMatch = pageText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/);
  }
  if (locationMatch) {
    data.location = locationMatch[0];
  }

  // Try to find square footage
  const sqftMatch = pageText.match(/(\d{1,4})\s*(sq\.?\s*ft|sqft|square feet)/i);
  if (sqftMatch) {
    data.squareFootage = parseInt(sqftMatch[1]);
  }

  // Try to find number of bedrooms
  const bedroomMatch = pageText.match(/(\d+)\s*(bed|bedroom|br|bd)/i);
  if (bedroomMatch) {
    data.bedrooms = parseInt(bedroomMatch[1]);
  }

  // Try to find room dimensions (e.g., "10x12", "10' x 12'")
  const dimensionMatch = pageText.match(/(\d{1,2})\s*[xX×]\s*(\d{1,2})\s*(ft|feet|')?/);
  if (dimensionMatch && !data.squareFootage) {
    const length = parseInt(dimensionMatch[1]);
    const width = parseInt(dimensionMatch[2]);
    data.squareFootage = length * width;
  }

  // If no square footage found, estimate based on listing type
  if (!data.squareFootage) {
    const lowerText = pageText.toLowerCase();
    if (lowerText.includes('studio')) {
      data.squareFootage = 450; // Typical studio size
    } else if (lowerText.includes('private room') || lowerText.includes('room for rent')) {
      data.squareFootage = 150; // Typical bedroom size
    } else if (data.bedrooms) {
      // Estimate based on bedrooms
      data.squareFootage = 400 + (data.bedrooms * 300); // Base + bedrooms
    }
  }

  console.log('Extracted data:', data);

  return data;
}

// Detect red flags in the listing
function detectRedFlags(data) {
  const flags = [];
  const description = (data.description + ' ' + data.title).toLowerCase();

  // Red Flag 1: Payment red flags
  const paymentRedFlags = ['wire transfer', 'zelle', 'venmo', 'cashapp', 'western union', 'moneygram', 'bitcoin', 'deposit before viewing'];
  paymentRedFlags.forEach(flag => {
    if (description.includes(flag)) {
      flags.push({
        severity: 'high',
        message: `⚠️ Mentions "${flag}" - common scam payment method`,
        category: 'payment'
      });
    }
  });

  // Red Flag 2: Overseas/remote landlord
  const remoteFlags = ['overseas', 'out of country', 'missionary', 'military deployment', 'work overseas'];
  remoteFlags.forEach(flag => {
    if (description.includes(flag)) {
      flags.push({
        severity: 'high',
        message: '🚩 Landlord claims to be overseas - very common scam',
        category: 'landlord'
      });
    }
  });

  // Red Flag 3: Too good to be true pricing (location-aware)
  if (data.price) {
    // Remove commas and extract the number (e.g., "$1,150" -> 1150)
    const priceMatch = data.price.match(/\$([\d,]+)/);
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/,/g, ''));

      // Get location-based price thresholds
      const location = (data.location || '').toLowerCase();
      let minRealisticPrice = 400; // Default minimum for USA

      // Virginia-specific pricing intelligence
      const virginiaHighCostAreas = ['arlington', 'fairfax', 'alexandria', 'reston', 'falls church', 'mclean', 'vienna', 'tysons'];
      const virginiaMidCostAreas = ['richmond', 'virginia beach', 'norfolk', 'chesapeake', 'newport news', 'hampton'];

      if (location.includes('va') || location.includes('virginia') ||
          virginiaHighCostAreas.some(area => description.includes(area)) ||
          virginiaMidCostAreas.some(area => description.includes(area))) {

        // Check if it's Northern Virginia (high cost)
        if (virginiaHighCostAreas.some(area => location.includes(area) || description.includes(area))) {
          minRealisticPrice = 800; // NoVa: even studios are rarely under $800
        } else if (virginiaMidCostAreas.some(area => location.includes(area) || description.includes(area))) {
          minRealisticPrice = 600; // Hampton Roads/Richmond: minimum around $600
        } else {
          minRealisticPrice = 500; // Other VA areas
        }
      }

      // Extreme scam detection (universally impossible prices)
      if (price <= 10) {
        flags.push({
          severity: 'critical',
          message: '🚨 EXTREME SCAM ALERT: $' + price + '/month is impossible - DO NOT CONTACT',
          category: 'price'
        });
        flags.push({
          severity: 'critical',
          message: '⛔ No legitimate rental costs $' + price + ' - This will steal your money/identity',
          category: 'price'
        });
      }
      // Very suspicious prices
      else if (price < 100) {
        flags.push({
          severity: 'critical',
          message: '🚨 Price is $' + price + ' - This is almost certainly a SCAM',
          category: 'price'
        });
      }
      // Below market minimum (context-aware)
      else if (price < minRealisticPrice * 0.5) {
        // Price is less than 50% of realistic minimum
        flags.push({
          severity: 'high',
          message: '💰 Price ($' + price + ') is far below market rate for this area - likely fake',
          category: 'price'
        });
      }
      else if (price < minRealisticPrice * 0.7) {
        // Price is 50-70% of realistic minimum
        flags.push({
          severity: 'medium',
          message: '⚠️ Price ($' + price + ') seems unusually low for this area - verify carefully',
          category: 'price'
        });
      }
    }
  }

  // Red Flag 4: Urgency tactics
  const urgencyFlags = ['act fast', 'won\'t last', 'many interested', 'first come', 'limited time'];
  urgencyFlags.forEach(flag => {
    if (description.includes(flag)) {
      flags.push({
        severity: 'medium',
        message: '⏰ Creates false urgency - pressure tactic',
        category: 'tactics'
      });
    }
  });

  // Red Flag 5: Move conversation off-platform
  const offPlatformFlags = ['text me', 'email me', 'whatsapp', 'contact me directly'];
  offPlatformFlags.forEach(flag => {
    if (description.includes(flag)) {
      flags.push({
        severity: 'medium',
        message: '📱 Wants to move off Facebook - suspicious',
        category: 'communication'
      });
    }
  });

  // Red Flag 6: Grammar/spelling issues (basic check)
  const grammarIssues = description.match(/\b(ur|u|pls|plz|gud|grt)\b/g);
  if (grammarIssues && grammarIssues.length > 2) {
    flags.push({
      severity: 'low',
      message: '✍️ Poor grammar - possible automated/overseas scam',
      category: 'language'
    });
  }

  // Red Flag 7: No viewing/keys before payment
  const noViewingFlags = ['send deposit first', 'pay before viewing', 'send money before', 'keys after payment', 'payment before viewing', 'money first'];
  let foundPaymentBeforeViewing = false;

  noViewingFlags.forEach(flag => {
    if (description.includes(flag)) {
      // Check if it's a warning (legitimate landlords sometimes warn AGAINST this)
      const warningPhrases = ['do not ' + flag, 'never ' + flag, 'don\'t ' + flag, 'avoid ' + flag, 'warning: ' + flag];
      const isWarning = warningPhrases.some(warning => description.includes(warning));

      if (!isWarning && !foundPaymentBeforeViewing) {
        foundPaymentBeforeViewing = true;
        flags.push({
          severity: 'critical',
          message: '🔑 Demands payment before viewing - MAJOR scam red flag',
          category: 'payment'
        });
      }
    }
  });

  // Red Flag 8: Stolen listing indicators
  const stolenListingFlags = ['google voice', 'verification code', 'just move in', 'no background check', 'no credit check'];
  stolenListingFlags.forEach(flag => {
    if (description.includes(flag)) {
      flags.push({
        severity: 'high',
        message: '📋 Suspicious terms often used in fake listings',
        category: 'tactics'
      });
    }
  });

  // Red Flag 9: Application fee scams
  if (description.includes('application fee') && description.includes('refundable')) {
    flags.push({
      severity: 'medium',
      message: '💳 "Refundable application fee" - often not actually refunded',
      category: 'payment'
    });
  }

  // Red Flag 10: Price per square foot analysis (if square footage available)
  if (data.price && data.squareFootage) {
    // Remove commas and extract the number (e.g., "$1,150" -> 1150)
    const priceMatch = data.price.match(/\$([\d,]+)/);
    if (priceMatch) {
      const monthlyRent = parseInt(priceMatch[1].replace(/,/g, ''));
      const pricePerSqFt = monthlyRent / data.squareFootage;

      // Get location-based market rates ($/sq ft)
      const location = (data.location || '').toLowerCase();
      const description = data.description.toLowerCase();
      let marketMin = 1.00; // Default US minimum
      let marketMax = 2.50; // Default US maximum
      let marketAvg = 1.75;
      let areaName = "this area";

      // Virginia-specific market rates
      const virginiaHighCostAreas = ['arlington', 'fairfax', 'alexandria', 'reston', 'falls church', 'mclean', 'vienna', 'tysons'];
      const virginiaMidCostAreas = ['richmond', 'virginia beach', 'norfolk', 'chesapeake', 'newport news', 'hampton'];

      if (location.includes('va') || location.includes('virginia') ||
          virginiaHighCostAreas.some(area => description.includes(area)) ||
          virginiaMidCostAreas.some(area => description.includes(area))) {

        if (virginiaHighCostAreas.some(area => location.includes(area) || description.includes(area))) {
          // Northern Virginia: $2.00-$3.50/sq ft (avg ~$2.70)
          marketMin = 2.00;
          marketMax = 3.50;
          marketAvg = 2.70;
          areaName = "Northern Virginia";
        } else if (virginiaMidCostAreas.some(area => location.includes(area) || description.includes(area))) {
          // Hampton Roads/Richmond: $1.50-$2.50/sq ft (avg ~$2.00)
          marketMin = 1.50;
          marketMax = 2.50;
          marketAvg = 2.00;
          areaName = "this Virginia area";
        } else {
          // Other Virginia: $1.25-$2.25/sq ft (avg ~$1.75)
          marketMin = 1.25;
          marketMax = 2.25;
          marketAvg = 1.75;
          areaName = "Virginia";
        }
      }

      // Determine if we're using estimated sq ft
      // Check if square footage was explicitly stated or estimated
      const hasExplicitSqFt = data.description.match(/(\d{1,4})\s*(sq\.?\s*ft|sqft|square feet)/i);
      const hasDimensions = data.description.match(/(\d{1,2})\s*[xX×]\s*(\d{1,2})/);
      const isEstimated = !hasExplicitSqFt && !hasDimensions;
      const estimateNote = isEstimated ? ' (estimated)' : '';

      // Analyze the price per square foot
      if (pricePerSqFt < marketMin * 0.3) {
        // Less than 30% of minimum market rate = SCAM
        flags.push({
          severity: 'critical',
          message: `📐 ${monthlyRent}/${data.squareFootage}${estimateNote} sq ft = $${pricePerSqFt.toFixed(2)}/sq ft - impossibly low (market: $${marketMin}-$${marketMax}) - SCAM`,
          category: 'price'
        });
      } else if (pricePerSqFt < marketMin * 0.6) {
        // 30-60% of minimum = highly suspicious
        flags.push({
          severity: 'high',
          message: `📐 $${pricePerSqFt.toFixed(2)}/sq ft${estimateNote} is extremely low for ${areaName} (market: $${marketMin}-$${marketMax})`,
          category: 'price'
        });
      } else if (pricePerSqFt < marketMin) {
        // Below minimum but above 60% = good deal but verify
        flags.push({
          severity: 'low',
          message: `📐 Great deal! $${pricePerSqFt.toFixed(2)}/sq ft${estimateNote} is below market (${areaName} avg: $${marketAvg.toFixed(2)})`,
          category: 'deal'
        });
      } else if (pricePerSqFt <= marketAvg) {
        // At or below average = good deal
        flags.push({
          severity: 'info',
          message: `✅ Good price: $${pricePerSqFt.toFixed(2)}/sq ft${estimateNote} (${areaName} avg: $${marketAvg.toFixed(2)})`,
          category: 'deal'
        });
      } else if (pricePerSqFt <= marketMax) {
        // Above average but within range = fair price
        flags.push({
          severity: 'info',
          message: `💵 Fair price: $${pricePerSqFt.toFixed(2)}/sq ft${estimateNote} (market: $${marketMin.toFixed(2)}-$${marketMax.toFixed(2)})`,
          category: 'deal'
        });
      } else {
        // Above maximum = overpriced
        flags.push({
          severity: 'low',
          message: `💸 Overpriced: $${pricePerSqFt.toFixed(2)}/sq ft${estimateNote} is above ${areaName} market (max: $${marketMax.toFixed(2)})`,
          category: 'deal'
        });
      }
    }
  }

  return flags;
}

// Calculate safety score based on red flags
function calculateSafetyScore(redFlags) {
  let score = 100;

  redFlags.forEach(flag => {
    if (flag.severity === 'critical') score -= 50;
    if (flag.severity === 'high') score -= 30;
    if (flag.severity === 'medium') score -= 15;
    if (flag.severity === 'low') score -= 5;
    // 'info' severity doesn't affect score - just informational
  });

  return Math.max(0, score);
}

// Display the safety widget on the page
function displaySafetyWidget(score, redFlags, aiAnalysis) {
  // Remove any existing widget
  const existingWidget = document.getElementById('rental-safety-widget');
  if (existingWidget) {
    existingWidget.remove();
  }

  // Create the widget
  const widget = document.createElement('div');
  widget.id = 'rental-safety-widget';
  widget.className = 'rental-safety-widget';

  // Determine color based on score
  let scoreColor = '#22c55e'; // green
  let scoreLabel = 'Low Risk';
  if (score < 70) {
    scoreColor = '#eab308'; // yellow
    scoreLabel = 'Medium Risk';
  }
  if (score < 40) {
    scoreColor = '#ef4444'; // red
    scoreLabel = 'High Risk';
  }

  // Build the widget HTML
  let flagsHTML = '';
  if (redFlags.length > 0) {
    flagsHTML = '<div style="margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 12px;">';
    redFlags.forEach(flag => {
      flagsHTML += `<div style="margin-bottom: 8px; font-size: 13px;">${flag.message}</div>`;
    });
    flagsHTML += '</div>';
  } else {
    flagsHTML = '<div style="margin-top: 12px; font-size: 13px; color: #22c55e;">✅ No red flags detected</div>';
  }

  widget.innerHTML = `
    <div style="background: white; border: 2px solid ${scoreColor}; border-radius: 8px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">🏠 Rental Safety Check</div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 32px; font-weight: bold; color: ${scoreColor};">${score}</div>
        <div>
          <div style="font-weight: 600; color: ${scoreColor};">${scoreLabel}</div>
          <div style="font-size: 12px; color: #6b7280;">${redFlags.length} red flag(s) found</div>
        </div>
      </div>
      ${flagsHTML}
      <div style="margin-top: 12px; font-size: 11px; color: #9ca3af;">
        Always verify listings in person. Never send money before viewing.
      </div>
    </div>
  `;

  // Add widget to the page
  document.body.appendChild(widget);
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Also run when URL changes (for single-page navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(init, 1000); // Wait a bit for page to load
  }
}).observe(document, { subtree: true, childList: true });
