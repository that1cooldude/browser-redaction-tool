# Simplified Redaction System Integration Plan

## Overview

We're simplifying the redaction system to be more user-friendly, especially for those who want to sanitize text before sending to LLMs. The focus is on:

1. Strong preset redaction rules with categorization
2. A simple, intuitive UI with a sensitivity slider to control aggressiveness
3. Custom term addition without requiring regex knowledge
4. Easy text paste, redact, and copy workflow

## Key Components

1. **SimplifiedRuleManager** (`/src/modules/rule-management/simplified-rule-manager.js`)
   - Predefined categories of rules with sensitivity levels
   - Support for custom terms
   - Simple API for rule application

2. **SimplifiedRedactionUI** (`/src/modules/ui/simplified-redaction-ui.js`)
   - Sensitivity slider
   - Category checkboxes
   - Custom term input

3. **App.js Integration**
   - Initialize components
   - Handle text processing
   - Manage workflow

## Implementation Steps

1. Create the simplified rule manager with preset categories
2. Implement the UI with sensitivity slider and category checkboxes
3. Update the CSS to support the new components
4. Modify the HTML for a simpler workflow
5. Update the main app.js to orchestrate everything

## User Flow

1. User pastes text with sensitive information
2. User selects sensitivity level and categories to redact
3. User optionally adds custom terms
4. User clicks "Redact Text"
5. System processes and shows redacted version
6. User copies or saves the redacted text

## Technical Details

- The sensitivity slider works by filtering rules based on their assigned sensitivity level
- Categories can be enabled/disabled as a group
- Custom terms are treated as exact matches (not regex)
- The existing redaction engine is used for performing the actual redaction