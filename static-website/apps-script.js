// Google Apps Script Code
// Copy this code to your Google Apps Script project (script.google.com)

// IMPORTANT: Your actual Google Sheets ID
const SPREADSHEET_ID = '11kMQ3nh3P51qgp1qGMurOSzFlJh4g7X0mUCHkdgxa0g';

/**
 * Handles POST requests to save form data to Google Sheets
 * This function will be called when your static website submits data
 */
function doPost(e) {
  try {
    // Parse the incoming JSON data
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      // If JSON parsing fails, try to get data from parameters
      data = {
        name: e.parameter.name,
        email: e.parameter.email,
        timestamp: e.parameter.timestamp || new Date().toISOString(),
        userAgent: e.parameter.userAgent || 'Unknown',
        source: e.parameter.source || 'form-submission'
      };
    }
    
    // Validate required fields
    if (!data.name || !data.email) {
      return createResponse('error', 'Missing required fields: name and email');
    }
    
    // Validate email format
    if (!isValidEmail(data.email)) {
      return createResponse('error', 'Invalid email format');
    }
    
    // Open the Google Sheet
    let sheet;
    try {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    } catch (sheetError) {
      return createResponse('error', 'Could not access Google Sheet. Please check the SPREADSHEET_ID.');
    }
    
    // Check if this is the first entry and add headers if needed
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha', 'Nombre', 'Email', 'User Agent', 'Fuente']);
    }
    
    // Check if email already exists to avoid duplicates
    const existingData = sheet.getDataRange().getValues();
    const emailExists = existingData.some((row, index) => {
      return index > 0 && row[2] === data.email; // Skip header row
    });
    
    if (emailExists) {
      return createResponse('info', 'Email already registered', {
        email: data.email,
        action: 'duplicate_prevented'
      });
    }
    
    // Get current timestamp
    const timestamp = new Date(data.timestamp || new Date());
    
    // Append the new row with the form data
    const newRow = [
      timestamp,
      data.name,
      data.email,
      data.userAgent || 'Unknown',
      data.source || 'context-profiles-academy'
    ];
    
    sheet.appendRow(newRow);
    
    // Log the successful submission
    console.log(`New submission: ${data.name} - ${data.email}`);
    
    return createResponse('success', 'Data saved successfully', {
      timestamp: timestamp.toISOString(),
      rowNumber: sheet.getLastRow(),
      name: data.name,
      email: data.email
    });
    
  } catch (error) {
    // Log the error for debugging
    console.error('Error processing form submission:', error);
    
    return createResponse('error', 'Internal server error: ' + error.toString());
  }
}

/**
 * Handles GET requests (for testing purposes)
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const stats = getSubmissionStats();
    
    return createResponse('info', 'Context Profiles Academy Form Handler is running', {
      timestamp: new Date().toISOString(),
      message: 'Use POST method to submit form data',
      stats: stats,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`
    });
  } catch (error) {
    return createResponse('error', 'Error accessing sheet: ' + error.toString());
  }
}

/**
 * Helper function to create standardized responses
 */
function createResponse(status, message, data = null) {
  const response = {
    status: status,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    response.data = data;
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Validate email format using regex
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Function to get submission statistics
 */
function getSubmissionStats() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        totalSubmissions: 0,
        uniqueUsers: 0,
        latestSubmission: null,
        todaySubmissions: 0
      };
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 5);
    const values = range.getValues();
    
    // Get unique emails to count unique users
    const uniqueEmails = new Set();
    let latestSubmission = null;
    let todaySubmissions = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    values.forEach(row => {
      const [timestamp, name, email] = row;
      uniqueEmails.add(email);
      
      // Count today's submissions
      const submissionDate = new Date(timestamp);
      submissionDate.setHours(0, 0, 0, 0);
      if (submissionDate.getTime() === today.getTime()) {
        todaySubmissions++;
      }
      
      if (!latestSubmission || timestamp > latestSubmission.timestamp) {
        latestSubmission = {
          timestamp: timestamp,
          name: name,
          email: email
        };
      }
    });
    
    return {
      totalSubmissions: lastRow - 1,
      uniqueUsers: uniqueEmails.size,
      latestSubmission: latestSubmission,
      todaySubmissions: todaySubmissions
    };
    
  } catch (error) {
    console.error('Error getting stats:', error);
    return { error: error.toString() };
  }
}

/**
 * Function to export data as CSV
 */
function exportToCSV() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    // Convert to CSV format
    const csvContent = values.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create CSV file in Google Drive
    const fileName = `context-profiles-leads-${new Date().toISOString().split('T')[0]}.csv`;
    const blob = Utilities.newBlob(csvContent, 'text/csv', fileName);
    const file = DriveApp.createFile(blob);
    
    console.log(`CSV exported: ${file.getUrl()}`);
    return file.getUrl();
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return { error: error.toString() };
  }
}

/**
 * Function to clean up duplicate entries
 */
function removeDuplicateEmails() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length <= 1) return { message: 'No data to clean' };
    
    const headers = values[0];
    const emailIndex = 2; // Email is in column C (index 2)
    const uniqueRows = [headers];
    const seenEmails = new Set();
    
    for (let i = 1; i < values.length; i++) {
      const email = values[i][emailIndex];
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        uniqueRows.push(values[i]);
      }
    }
    
    // Clear the sheet and add unique rows
    sheet.clear();
    if (uniqueRows.length > 0) {
      sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
    }
    
    const removedCount = values.length - uniqueRows.length;
    console.log(`Removed ${removedCount} duplicate entries`);
    
    return {
      message: `Removed ${removedCount} duplicate entries`,
      totalRows: uniqueRows.length - 1,
      duplicatesRemoved: removedCount
    };
    
  } catch (error) {
    console.error('Error removing duplicates:', error);
    return { error: error.toString() };
  }
}

/**
 * Set up a trigger to run daily stats (optional)
 */
function createDailyStatsTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'logDailyStats') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger
  ScriptApp.newTrigger('logDailyStats')
    .timeBased()
    .everyDays(1)
    .atHour(9) // 9 AM
    .create();
    
  console.log('Daily stats trigger created');
}

/**
 * Function that runs daily to log statistics
 */
function logDailyStats() {
  const stats = getSubmissionStats();
  console.log('Daily Stats Report:', JSON.stringify(stats, null, 2));
  
  // Optionally send email report
  // GmailApp.sendEmail(
  //   'your-email@example.com',
  //   'Context Profiles Academy - Daily Stats',
  //   `Daily submission report:\n\nTotal submissions: ${stats.totalSubmissions}\nUnique users: ${stats.uniqueUsers}\nToday's submissions: ${stats.todaySubmissions}\n\nLatest submission: ${stats.latestSubmission ? stats.latestSubmission.name + ' (' + stats.latestSubmission.email + ')' : 'None'}`
  // );
}

/*
SETUP INSTRUCTIONS:
===================

1. Go to script.google.com
2. Create a new project
3. Replace all code with this code
4. The SPREADSHEET_ID is already set to your sheet: 11kMQ3nh3P51qgp1qGMurOSzFlJh4g7X0mUCHkdgxa0g
5. Save the project (Ctrl+S)
6. Click "Deploy" > "New deployment"
7. Type: "Web app"
8. Execute as: "Me"
9. Who has access: "Anyone"
10. Click "Deploy"
11. Copy the web app URL
12. Update the APPS_SCRIPT_URL in your script.js file

TESTING:
========
- Visit the web app URL to see if it's working
- Submit the form on your website
- Check your Google Sheet to see if data appears
- Use the Apps Script editor to run getSubmissionStats() manually

MONITORING:
===========
- Check View > Logs in Apps Script to see execution logs
- Run getSubmissionStats() to see submission statistics
- Run exportToCSV() to create a backup of your data
- Run removeDuplicateEmails() to clean duplicate entries

FUNCTIONS AVAILABLE:
==================
- getSubmissionStats() - Get detailed statistics
- exportToCSV() - Export data to CSV file in Google Drive
- removeDuplicateEmails() - Remove duplicate email entries
- createDailyStatsTrigger() - Set up daily automatic reports
*/