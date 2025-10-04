# Family Activity Finder - Specification

## Overview
A web application that helps parents find weekend activities for their kids based on location, age, availability, and preferences.

## Requirements

### Functional Requirements
- Accept user inputs: city, kids' ages, availability (day/time), distance willing to travel (miles), and other preferences
- Search for family-friendly activities using Claude API with web search tool
- Return 5 personalized recommendations with formatted output (emoji, bold title, 2-4 sentence description)
- Display results in a clean, readable format

### Non-Functional Requirements
- Simple, intuitive interface
- Fast response time (under 10 seconds for recommendations)
- Mobile-responsive design

## Tech Stack

- **Frontend:** Streamlit (Python web framework)
- **Backend:** Python 3.8+
- **AI/Search:** Claude Messages API with web search tool
- **Dependencies:**
  - `anthropic` - Claude API client
  - `streamlit` - Web interface
  - `python-dotenv` - Environment variable management

## Design Guidelines

### UI Principles
- Clean, minimal design
- Family-friendly color scheme (blues, greens, warm tones)
- Clear labels and helpful placeholder text
- Single-page interface with form and results
- Loading indicator while fetching recommendations

### Input Fields
- **City:** Text input
- **Kids' Ages:** Number inputs or multi-select
- **Availability:** Text input (e.g., "Saturday afternoon")
- **Distance:** Slider (0-50 miles)
- **Other Preferences:** Text area for additional context

### Output Format
Each recommendation should include:
- Emoji related to activity type
- **Bold title** of activity/venue
- 2-4 sentences with key details (age appropriateness, why it's recommended, practical info)

## Milestones

### Milestone 1: UI Setup with Dummy Data
**Goal:** Create the Streamlit interface with all input fields and display dummy recommendations

**Deliverables:**
- Streamlit app with input form
- Hardcoded 5 sample recommendations displayed in correct format
- Basic styling and layout
- All input fields functional (collecting but not yet using data)

**Definition of Done:**
- App runs locally with `streamlit run app.py`
- Form accepts all required inputs
- Dummy data displays with emojis, bold titles, and formatted text

### Milestone 2: Claude API Integration with Web Search
**Goal:** Replace dummy data with real recommendations from Claude API using web search tool

**Deliverables:**
- API key configuration via environment variables
- Integration with Claude Messages API
- Web search tool implementation
- Dynamic prompt construction based on user inputs
- Real recommendations replacing dummy data

**Definition of Done:**
- App successfully calls Claude API with user inputs
- Web search tool finds current activities in specified city
- Claude returns 5 formatted recommendations
- Error handling for API failures

### Milestone 3: Polish and Enhancement
**Goal:** Improve user experience and add helpful features

**Deliverables:**
- Loading states and progress indicators
- Error messages for invalid inputs
- Input validation (e.g., reasonable age ranges, valid city names)
- Improved styling and layout
- Optional: Save/export recommendations feature

**Definition of Done:**
- Smooth user experience with clear feedback
- Professional appearance
- No crashes on invalid input
- Ready for user testing
