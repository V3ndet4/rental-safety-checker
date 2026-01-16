# 🤖 AI Integration Setup Guide

## Overview
Your Rental Safety Checker now has **AI-powered analysis** using Claude API! This dramatically improves accuracy by understanding context, detecting manipulation tactics, and providing smarter pricing assessments.

## Features Added

### 1. **Smart Pricing Analysis**
- Understands "private room" vs "entire apartment"
- Estimates fair market value based on full context
- Detects when prices are scams vs legitimate deals

### 2. **Scam Pattern Recognition**
- Identifies emotional manipulation
- Detects trust-building language
- Recognizes sophisticated scam tactics

### 3. **Property Detail Extraction**
- Finds hidden size/amenity clues
- Estimates square footage from description
- Analyzes included utilities

### 4. **Hybrid Analysis**
- 60% pattern matching (fast, works offline)
- 40% AI analysis (smart, context-aware)
- Best of both worlds!

## Setup Instructions

### Step 1: Get a Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy your key (starts with `sk-ant-api03-...`)

**Cost:** ~$0.01-0.02 per listing analyzed (Claude Sonnet 3.5)

### Step 2: Configure the Extension

1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Find "Rental Safety Checker"
   - Click the reload icon 🔄

2. **Open extension settings:**
   - Click the extension icon in Chrome toolbar
   - Click "⚙️ Configure AI Settings" button

3. **Enter your API key:**
   - Paste your Claude API key
   - Click "Save Settings"
   - You should see "✅ API key saved! AI analysis is now enabled."

### Step 3: Test It Out

1. Go to Facebook Marketplace
2. Find any rental listing
3. The extension will now show TWO analysis types:
   - **Pattern-based flags** (instant)
   - **🤖 AI detected flags** (appears after 2-3 seconds)

## How It Works

### Without API Key (Free)
- Uses pattern matching only
- Still catches most scams
- Fast and works offline
- No API costs

### With API Key (Recommended)
- Pattern matching + AI analysis
- Understands context and nuance
- Smarter price assessments
- Better scam detection
- Costs ~$0.01-0.02 per listing

## Example AI Messages

You'll see messages like:

✅ **AI detected flags:**
- 🤖 AI detected: Vague property details raise suspicion
- 🤖 AI detected: Urgency language suggests pressure tactics
- 🤖 AI Assessment: Price is likely a scam (Fair market: $800-$1200)
- 🤖 AI Assessment: Fair price for private room (~150 sq ft)

## Privacy & Security

- Your API key is stored locally in Chrome
- Only rental listing text is sent to Claude API
- No personal data is transmitted
- API calls use HTTPS encryption

## Troubleshooting

### "AI analysis disabled - no API key configured"
- Click the extension icon
- Click "Configure AI Settings"
- Enter your Claude API key

### "API error: 401"
- Your API key is invalid
- Get a new key from console.anthropic.com
- Make sure it starts with `sk-ant-`

### AI analysis not showing
- Wait 3-5 seconds (AI analysis takes time)
- Check the browser console (F12) for errors
- Verify your API key is saved in settings

## Cost Management

**Typical usage:**
- 10 listings/day = ~$0.10-0.20/day
- 100 listings/month = ~$1-2/month

**To reduce costs:**
- Use AI only for suspicious listings
- Or disable AI and use pattern matching only

## Feedback

Found issues or have suggestions? Create an issue on GitHub!

---

**Version:** 2.0
**AI Model:** Claude 3.5 Sonnet
**Last Updated:** January 2026
