# Milestone 1: UI Setup with Dummy Data - Task List

## Setup Tasks
- [ ] Create project directory structure
- [ ] Create `requirements.txt` with dependencies (streamlit, anthropic, python-dotenv)
- [ ] Create `.env.example` file for API key template
- [ ] Create `.gitignore` file (include `.env`, `__pycache__`, `.streamlit/`)

## Core Application Tasks
- [ ] Create `app.py` as main Streamlit application file
- [ ] Set up basic Streamlit page configuration (title, icon, layout)
- [ ] Add application header and description

## Input Form Implementation
- [ ] Create text input for city
- [ ] Create number inputs or multiselect for kids' ages (support multiple children)
- [ ] Create text input for availability (day/time)
- [ ] Create slider for distance range (0-50 miles)
- [ ] Create text area for other preferences
- [ ] Add a "Find Activities" submit button

## Dummy Data Implementation
- [ ] Create a list of 5 hardcoded sample recommendations
- [ ] Format each recommendation with:
  - Emoji at the start
  - Bold title using `**Title**` markdown
  - 2-4 sentence description
- [ ] Display recommendations only after form submission
- [ ] Use Streamlit markdown/write to render formatted output

## Styling and Layout
- [ ] Add custom CSS for family-friendly color scheme
- [ ] Ensure proper spacing between form elements
- [ ] Add visual separation between form and results
- [ ] Make layout mobile-responsive (Streamlit handles most of this by default)

## Testing and Validation
- [ ] Test that app runs with `streamlit run app.py`
- [ ] Verify all form inputs collect data correctly
- [ ] Verify dummy recommendations display with proper formatting
- [ ] Test on different screen sizes
- [ ] Check that emojis and markdown render correctly

## Documentation
- [ ] Add comments to code explaining each section
- [ ] Create README.md with setup instructions
- [ ] Document how to run the app locally

## Optional Enhancements (if time permits)
- [ ] Add form validation messages
- [ ] Add a loading spinner placeholder
- [ ] Include example inputs as placeholders
- [ ] Add clear/reset form button
