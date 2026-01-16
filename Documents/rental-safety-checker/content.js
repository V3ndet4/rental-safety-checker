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
function analyzeListing() {
  const listingData = extractListingData();
  const redFlags = detectRedFlags(listingData);
  const safetyScore = calculateSafetyScore(redFlags);

  console.log('📊 Analysis complete:', { listingData, redFlags, safetyScore });

  // Display the results on the page
  displaySafetyWidget(safetyScore, redFlags);
}

// Extract data from the listing
function extractListingData() {
  const data = {
    title: '',
    description: '',
    price: '',
    location: '',
    sellerInfo: ''
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
  // Match patterns like: $1200/month, $800/mo, $50/week, $1,200/Month, $1/month, etc.
  // Try multiple strategies for better accuracy
  let priceMatch = pageText.match(/\$\d{1,5}(,\d{3})*(\.\d{2})?\s*(\/\s*)?(month|mo|week|wk|per month)/i);
  if (!priceMatch) {
    // Fallback: just look for any price with $ sign
    priceMatch = pageText.match(/\$\d{1,5}(,\d{3})*(\.\d{2})?/);
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

  // Red Flag 3: Too good to be true pricing
  if (data.price) {
    const priceMatch = data.price.match(/\$(\d+)/);
    if (priceMatch) {
      const price = parseInt(priceMatch[1]);
      if (price <= 10) {
        // Extremely low prices are 100% scams - add MULTIPLE flags
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
      } else if (price < 100) {
        flags.push({
          severity: 'critical',
          message: '🚨 Price is $' + price + ' - This is almost certainly a SCAM',
          category: 'price'
        });
      } else if (price < 500) {
        flags.push({
          severity: 'high',
          message: '💰 Price ($' + price + ') seems too low - possibly fake listing',
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
  const noViewingFlags = ['send deposit first', 'pay before viewing', 'send money before', 'keys after payment', 'payment before viewing'];
  noViewingFlags.forEach(flag => {
    if (description.includes(flag)) {
      flags.push({
        severity: 'critical',
        message: '🔑 Demands payment before viewing - MAJOR scam red flag',
        category: 'payment'
      });
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
  });

  return Math.max(0, score);
}

// Display the safety widget on the page
function displaySafetyWidget(score, redFlags) {
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
